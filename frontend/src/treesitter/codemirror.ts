import { Parser, Tree, Query } from "web-tree-sitter";
import { Decoration, DecorationSet, ViewPlugin, PluginValue, EditorView, ViewUpdate } from "@codemirror/view";
import { EditorState, Range, RangeSetBuilder, StateField, Transaction } from "@codemirror/state";
import { Edit, Node } from "web-tree-sitter";
import mainStore from "../stores";
import TagMap from "./mappings";
import { parseCST, BragiAST } from "@cr_docs_t/dts/treesitter";
import { highlightingFor } from "@codemirror/language";
import { buildNestedAst } from "../utils";

/**
 * Helper to convert a linear index to a Tree-sitter Point (row/column)
 */
function getPoint(doc: any, pos: number) {
    const line = doc.lineAt(pos);
    return { row: line.number - 1, column: pos - line.from };
}

export type CSTType = ReturnType<typeof CSTBuilder>;
export const CSTBuilder = (parser: Parser) =>
    StateField.define<Tree | null>({
        create(state) {
            return parser.parse(state.doc.toString());
        },

        update(tree, tr) {
            mainStore.getState().setIsParsing(true);
            if (!tr.docChanged) return tree;

            let newTree = tree;
            if (newTree) {
                tr.changes.iterChanges((fromA, toA, fromB, toB) => {
                    try {
                        const edit = new Edit({
                            startIndex: fromA,
                            oldEndIndex: toA,
                            newEndIndex: toB,
                            startPosition: getPoint(tr.startState.doc, fromA),
                            oldEndPosition: getPoint(tr.startState.doc, toA),
                            newEndPosition: getPoint(tr.state.doc, toB),
                        });
                        newTree!.edit(edit);
                    } catch (e) {
                        console.error("Error applying edit to Tree-sitter tree ->", e);
                        newTree = null; // Fallback to full parse
                    }
                });
            }

            newTree = parser.parse(tr.state.doc.toString(), newTree || undefined);
            mainStore.getState().setIsParsing(false);
            return newTree;
        },

        provide: (f) => [f],
    });

export type YggdrasilType = ReturnType<typeof YggdrasilBuilder>;
export const YggdrasilBuilder = (cst: CSTType) =>
    StateField.define<BragiAST | null>({
        create(state) {
            const tree = state.field(cst);
            if (!tree) return null;
            const root = tree.rootNode;
            return parseCST(root);
        },

        update(oldAst, tr) {
            if (!tr.docChanged) return oldAst;
            const tree = tr.state.field(cst);
            if (!tree) return oldAst;
            const root = tree.rootNode;
            return parseCST(root);
        },
    });

/**
 * Codemirror highligher plugin that uses treesitter tree queries to generate decorations.
 */
export const treeSitterHighlightPlugin = (query: Query, ygg: CSTType) => {
    return ViewPlugin.fromClass(
        class implements PluginValue {
            decorations: DecorationSet;
            lastTree: Tree | null = null;
            debounceTimeout: NodeJS.Timeout | null = null;

            constructor(readonly view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                const tree = update.state.field(ygg);
                mainStore.getState().setIsParsing(true);
                if (update.docChanged || update.viewportChanged || tree !== this.lastTree) {
                    this.lastTree = tree;
                    this.decorations = this.buildDecorations(update.view);
                    this.view.requestMeasure(); // Force redraw
                }
                mainStore.getState().setIsParsing(false);
            }

            buildDecorations(view: EditorView) {
                if (!this.lastTree) return Decoration.none;
                const builder = new RangeSetBuilder<Decoration>();

                const margin = 999999999;
                const viewportFrom = Math.max(0, view.viewport.from - margin);
                // const viewportTo = Math.min(view.state.doc.length, view.viewport.to + margin);
                const viewportTo = view.viewport.to + margin; // HACK: Allow captures that end beyond the document end cause clipping isn't working properly for some reason
                // console.log(`Building decorations for viewport [${viewportFrom}, ${viewportTo}]`);

                const captures = query.captures(this.lastTree.rootNode, {
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

export const yggdrasilLogger = (ygg: YggdrasilType) =>
    ViewPlugin.fromClass(
        class {
            update(update: ViewUpdate) {
                if (update.docChanged) {
                    const ast = update.state.field(ygg);
                    if (!ast) return;
                    // console.log({ tree: tree?.rootNode });
                    // console.dir(buildNestedAst(ast), { depth: null });
                }
            }
        },
    );

export const latexSupport = (parser: Parser, query: Query) => {
    const CST = CSTBuilder(parser);
    const Yggdrasil = YggdrasilBuilder(CST);
    const extensions = [
        CST,
        Yggdrasil,
        treeSitterHighlightPlugin(query, CST),
        EditorState.languageData.of(() => [
            {
                commentTokens: { line: "%" },
            },
        ]),
    ];
    if (import.meta.env.DEV) {
        extensions.push(yggdrasilLogger(Yggdrasil));
    }
    return { extensions, CST, Yggdrasil };
};
