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
            return newTree;
        },
    });

export type YggdrasilType = ReturnType<typeof YggdrasilBuilder>;
export const YggdrasilBuilder = (cst: CSTType) =>
    StateField.define<BragiAST | null>({
        create(state) {
            const tree = state.field(cst, false);
            if (!tree) return null;
            const root = tree.rootNode;
            return parseCST(root);
        },

        update(oldAst, tr) {
            const oldTree = tr.startState.field(cst, false);
            const newTree = tr.state.field(cst, false);
            if (newTree === oldTree) return oldAst;
            if (!newTree) return null;

            try {
                return parseCST(newTree.rootNode);
            } catch (e) {
                console.error("Error parsing CST to AST ->", e);
                return null;
            }
        },
    });

/**
 * Codemirror highligher plugin that uses treesitter tree queries to generate decorations.
 */
export const treeSitterHighlightPlugin = (query: Query, ygg: CSTType) => {
    return ViewPlugin.fromClass(
        class implements PluginValue {
            decorations: DecorationSet;
            debounceTimeout: NodeJS.Timeout | null = null;

            constructor(readonly view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                const tree = update.state.field(ygg);
                if (update.docChanged || update.viewportChanged || update.startState.field(ygg) !== tree) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            buildDecorations(view: EditorView) {
                const tree = view.state.field(ygg);
                if (!tree) return Decoration.none;

                const builder = new RangeSetBuilder<Decoration>();

                const margin = 999999999;
                const viewportFrom = Math.max(0, view.viewport.from - margin);
                // const viewportTo = Math.min(view.state.doc.length, view.viewport.to + margin);
                const viewportTo = view.viewport.to + margin; // HACK: Allow captures that end beyond the document end cause clipping isn't working properly for some reason
                // console.log(`Building decorations for viewport [${viewportFrom}, ${viewportTo}]`);

                const captures = query.captures(tree.rootNode, {
                    startIndex: viewportFrom,
                    endIndex: viewportTo,
                });

                const sortedCaptures = captures.sort((a, b) => a.node.startIndex - b.node.startIndex);

                let lastFrom = -1;
                for (const { node, name } of sortedCaptures) {
                    // Clamp to current document limits to prevent out-of-bounds errors
                    const from = node.startIndex;
                    const to = node.endIndex;

                    if (from >= to) continue; // Skip empty or invalid ranges

                    if (from < lastFrom) continue; // Skip if this capture starts before the last one (overlapping)

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

                    const highlightClass = highlightingFor(view.state, [tag]);
                    const spec = Decoration.mark({ class: `${highlightClass!} ts-${name.replace(/\./g, "-")}` });
                    builder.add(from, to, spec);
                    lastFrom = from; // Update the pointer

                    // RangeSetBuilder Validation:
                    // - from must be >= lastFrom
                    // - from must be < to (no empty ranges)
                    // if (from < to && from >= lastFrom) {
                    //     const highlightClass = highlightingFor(view.state, [tag]);
                    //     const classes = [highlightClass, `cm-${name.replace(/\./g, "-")}`].filter(Boolean).join(" ");
                    //
                    //     try {
                    //         builder.add(from, to, Decoration.mark({ class: classes }));
                    //         lastFrom = from; // Update the pointer
                    //     } catch (e) {
                    //         console.warn(`RangeSetBuilder error at ${from}-${to} for ${name}:`, e);
                    //     }
                    // }
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

export const syncParsingStatus = (cstField: CSTType) =>
    ViewPlugin.fromClass(
        class {
            update(update: ViewUpdate) {
                if (update.docChanged) {
                    mainStore.getState().setIsParsing(true);
                }
                if (update.transactions.some((tr) => tr.docChanged)) {
                    mainStore.getState().setIsParsing(false);
                }
            }
        },
    );

export const yggdrasilLogger = (ygg: YggdrasilType) =>
    ViewPlugin.fromClass(
        class {
            update(update: ViewUpdate) {
                if (update.docChanged) {
                    const ast = update.state.field(ygg);
                    if (!ast) return;
                    // console.log({ tree: tree?.rootNode });
                    // console.dir(buildNestedAst(ast), { depth: null });
                    // console.log({ ast });
                }
            }
        },
    );

export const latexSupport = (parser: Parser, query: Query) => {
    const CST = CSTBuilder(parser);
    const Yggdrasil = YggdrasilBuilder(CST);
    const parserSync = syncParsingStatus(CST);
    const extensions = [
        CST,
        Yggdrasil,
        treeSitterHighlightPlugin(query, CST),
        parserSync,
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
