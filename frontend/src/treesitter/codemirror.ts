import { Parser, Tree, Query } from "web-tree-sitter";
import { Decoration, DecorationSet, ViewPlugin, PluginValue, EditorView, ViewUpdate } from "@codemirror/view";
import { EditorState, Range, RangeSetBuilder, StateField, Transaction } from "@codemirror/state";
import { Edit, Node } from "web-tree-sitter";
import mainStore from "../stores";
import TagMap, { latexHighlightStyle } from "./mappings";
import { parseCST, BragiAST } from "@cr_docs_t/dts/treesitter";
import { highlightingFor, syntaxHighlighting } from "@codemirror/language";
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
                const { from: viewportFrom, to: viewportTo } = view.viewport;

                const startPosition = getPoint(view.state.doc, viewportFrom);
                const endPosition = getPoint(view.state.doc, viewportTo);

                const captures = query.captures(tree.rootNode, {
                    startPosition,
                    endPosition,
                });

                const sorted = captures.sort((a, b) => {
                    // Sort by start index ascending
                    if (a.node.startIndex !== b.node.startIndex) {
                        return a.node.startIndex - b.node.startIndex;
                    }
                    // If start index is the same, sort by end index descending
                    return b.node.endIndex - a.node.endIndex;
                });

                let lastEnd = -1;

                for (const { node, name } of sorted) {
                    const from = node.startIndex;
                    const to = node.endIndex;

                    if (from < lastEnd) continue;
                    if (from >= to || to <= viewportFrom || from >= viewportTo) continue;

                    const parts = name.split(".");
                    let tag = null;
                    for (let i = parts.length; i > 0; i--) {
                        const search = parts.slice(0, i).join(".");
                        if (TagMap[search]) {
                            tag = TagMap[search];
                            break;
                        }
                    }

                    if (tag) {
                        const highlightClass = highlightingFor(view.state, [tag]);
                        if (highlightClass) {
                            const spec = Decoration.mark({
                                class: `${highlightClass} ts-${name.replace(/\./g, "-")}`,
                            });

                            try {
                                builder.add(from, to, spec);
                                lastEnd = to;
                            } catch (e) {
                                console.error("Builder Error:", e);
                            }
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
        syntaxHighlighting(latexHighlightStyle),
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
