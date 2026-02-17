import { Language, Parser, Tree, Query } from "web-tree-sitter";
import { Decoration, DecorationSet, ViewPlugin, PluginValue, EditorView, ViewUpdate } from "@codemirror/view";
import { EditorState, Range, RangeSetBuilder } from "@codemirror/state";
import { Edit } from "web-tree-sitter";
import mainStore from "../stores";
import TagMap from "./mappings";
import { highlightingFor } from "@codemirror/language";
import { ResultsMessage, TreeSitterWorkerMessage } from "./worker";

/**
 * Helper to convert a linear index to a Tree-sitter Point (row/column)
 */
function getPoint(doc: any, pos: number) {
    const line = doc.lineAt(pos);
    return { row: line.number - 1, column: pos - line.from };
}

export const treeSitterHighlightPluginWorker = (worker: Worker) => {
    return ViewPlugin.fromClass(
        class implements PluginValue {
            decorations: DecorationSet = Decoration.none;

            constructor(readonly view: EditorView) {
                console.log("Initializing Tree-sitter plugin and worker");
                worker.onmessage = (e: MessageEvent<TreeSitterWorkerMessage>) => {
                    console.log({ type: e.data.type, payload: e.data.payload });
                    if (e.data.type === "results") {
                        console.log("Received results from worker:", e.data.payload);
                        this.recvResults(e.data.payload);
                    }
                };

                this.reqParse();
            }

            update(update: ViewUpdate) {
                if (update.docChanged || update.viewportChanged) this.reqParse();
            }

            reqParse() {
                worker.postMessage({
                    type: "parse",
                    payload: {
                        code: this.view.state.doc.toString(),
                        viewport: { from: this.view.viewport.from, to: this.view.viewport.to },
                    },
                } as TreeSitterWorkerMessage);
            }

            recvResults(results: ResultsMessage[]) {
                const builder: Range<Decoration>[] = [];

                for (const { from, to, name } of results) {
                    const parts = name.split(".");
                    let tag = null;
                    for (let i = parts.length; i > 0; i--) {
                        const search = parts.slice(0, i).join(".");
                        if (TagMap[search]) {
                            tag = TagMap[search];
                            break;
                        }
                    }
                    if (!tag) continue;

                    const highlightClass = highlightingFor(this.view.state, [tag]);
                    const classes = [highlightClass, `cm-${name.replace(/\./g, "-")}`].filter(Boolean).join(" ");

                    builder.push(Decoration.mark({ class: classes }).range(from, to));
                }

                this.decorations = Decoration.set(
                    builder.sort((a, b) => a.from - b.from),
                    true,
                );
                this.view.requestMeasure(); // Force redraw
            }
        },
        {
            decorations: (v) => v.decorations,
        },
    );
};

export const treeSitterHighlightPluginInline = (parser: Parser, query: Query) => {
    return ViewPlugin.fromClass(
        class implements PluginValue {
            decorations: DecorationSet;
            tree: Tree | null = null;
            debounceTimeout: NodeJS.Timeout | null = null;

            constructor(readonly view: EditorView) {
                this.tree = parser.parse(view.state.doc.toString());
                this.decorations = this.buildDecorations(view);
                mainStore.getState().setTree(this.tree!);
            }

            update(update: ViewUpdate) {
                if (update.docChanged && this.tree) {
                    mainStore.getState().setIsParsing(true);
                    update.changes.iterChanges((fromA, toA, fromB, toB) => {
                        try {
                            const edit = new Edit({
                                startIndex: fromA,
                                oldEndIndex: toA,
                                newEndIndex: toB,
                                startPosition: getPoint(update.startState.doc, fromA),
                                oldEndPosition: getPoint(update.startState.doc, toA),
                                newEndPosition: getPoint(update.state.doc, toB),
                            });
                            this.tree!.edit(edit);
                        } catch (e) {
                            console.error("Error applying edit to Tree-sitter tree ->", e);
                            this.tree = null; // Fallback to full parse
                        }
                    });

                    // Perform the incremental parse by passing the old tree
                    this.tree = parser.parse(update.state.doc.toString(), this.tree);

                    this.scheduleStoreUpdate();
                }

                if (update.docChanged || update.viewportChanged) {
                    this.decorations = this.buildDecorations(update.view);
                    this.view.requestMeasure(); // Force redraw
                }
            }

            private scheduleStoreUpdate() {
                if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
                this.debounceTimeout = setTimeout(() => {
                    if (this.tree) mainStore.getState().setTree(this.tree);
                    mainStore.getState().setIsParsing(false);
                }, 150);
            }

            buildDecorations(view: EditorView) {
                if (!this.tree) return Decoration.none;
                const builder = new RangeSetBuilder<Decoration>();

                const margin = 2000;
                const viewportFrom = Math.max(0, view.viewport.from - margin);
                // const viewportTo = Math.min(view.state.doc.length, view.viewport.to + margin);
                const viewportTo = view.viewport.to + margin; // HACK: Allow captures that end beyond the document end cause clipping isn't working properly for some reason
                console.log(`Building decorations for viewport [${viewportFrom}, ${viewportTo}]`);

                const captures = query.captures(this.tree.rootNode, {
                    startIndex: viewportFrom,
                    endIndex: viewportTo,
                });

                const sortedCaptures = captures.sort((a, b) => {
                    return a.node.startIndex - b.node.startIndex || b.node.endIndex - a.node.endIndex;
                });

                let lastFrom = -1;

                for (const { node, name } of sortedCaptures) {
                    const parts = name.split(".");
                    let tag = null;
                    for (let i = parts.length; i > 0; i--) {
                        const search = parts.slice(0, i).join(".");
                        if (TagMap[search]) {
                            tag = TagMap[search];
                            break;
                        }
                    }
                    if (!tag) continue;

                    // Clamp to current document limits to prevent out-of-bounds errors
                    const from = Math.max(node.startIndex, 0);
                    const to = Math.min(node.endIndex, view.state.doc.length);

                    // RangeSetBuilder Validation:
                    // - from must be >= lastFrom
                    // - from must be < to (no empty ranges)
                    if (from < to && from >= lastFrom) {
                        const highlightClass = highlightingFor(view.state, [tag]);
                        const classes = [highlightClass, `cm-${name.replace(/\./g, "-")}`].filter(Boolean).join(" ");

                        try {
                            builder.add(from, to, Decoration.mark({ class: classes }));
                            lastFrom = from; // Update the pointer
                        } catch (e) {
                            // If this logs, you have a logic error in your sorting
                            console.warn(`RangeSetBuilder error at ${from}-${to} for ${name}:`, e);
                        }
                    }
                }

                return builder.finish();
            }

            destroy() {
                if (this.debounceTimeout) clearTimeout(this.debounceTimeout);
            }
        },
        {
            decorations: (v) => v.decorations,
        },
    );
};

export const latexSupportWorker = (worker: Worker) => {
    return [
        treeSitterHighlightPluginWorker(worker),
        EditorState.languageData.of(() => [
            {
                commentTokens: { line: "%" },
            },
        ]),
    ];
};

export const latexSupportInline = (parser: Parser, query: Query) => {
    return [
        treeSitterHighlightPluginInline(parser, query),
        EditorState.languageData.of(() => [
            {
                commentTokens: { line: "%" },
            },
        ]),
    ];
};
