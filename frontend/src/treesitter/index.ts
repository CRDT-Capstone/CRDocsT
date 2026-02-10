import { Language, Parser, Tree, Node } from "web-tree-sitter";
import { tags as t } from "@lezer/highlight";
import { Decoration, DecorationSet, ViewPlugin, PluginValue, EditorView, ViewUpdate } from "@codemirror/view";
import { Range } from "@codemirror/state";
import { Edit } from "web-tree-sitter";
import mainStore from "../stores";

const latexTagMap: Record<string, any> = {
    command: t.keyword,
    text_mode: t.content,
    math_mode: t.special(t.number),
    comment: t.lineComment,
    label: t.labelName,
    operator: t.operator,
};

/**
 * Helper to convert a linear index to a Tree-sitter Point (row/column)
 */
function getPoint(doc: any, pos: number) {
    const line = doc.lineAt(pos);
    return { row: line.number - 1, column: pos - line.from };
}

export const newParser = async () => {
    await Parser.init();
    const parser = new Parser();
    const Latex = await Language.load("/tree-sitter-latex.wasm");
    parser.setLanguage(Latex);
    return parser;
};

export const treeSitterHighlightPlugin = (parser: Parser) => {
    return ViewPlugin.fromClass(
        class implements PluginValue {
            decorations: DecorationSet;
            tree: Tree | null = null;
            timeout: NodeJS.Timeout | null = null;

            constructor(view: EditorView) {
                this.tree = parser.parse(view.state.doc.toString());
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                if (update.docChanged && this.tree) {
                    mainStore.getState().setIsParsing(true);
                    update.changes.iterChanges((fromA, toA, fromB, toB) => {
                        const edit = new Edit({
                            startIndex: fromA,
                            oldEndIndex: toA,
                            newEndIndex: toB,
                            startPosition: getPoint(update.startState.doc, fromA),
                            oldEndPosition: getPoint(update.startState.doc, toA),
                            newEndPosition: getPoint(update.state.doc, toB),
                        });

                        this.tree!.edit(edit);
                    });

                    // Perform the incremental parse by passing the old tree
                    this.tree = parser.parse(update.state.doc.toString(), this.tree);
                }

                if (update.docChanged || update.viewportChanged) {
                    if (this.timeout) clearTimeout(this.timeout);
                    this.timeout = setTimeout(() => {
                        console.log("Refreshing decorations after changes...");
                        this.refreshDecorations(update.view);
                        mainStore.getState().setIsParsing(false);
                    }, 150);
                }
            }

            refreshDecorations(view: EditorView) {
                this.decorations = this.buildDecorations(view);
                // Trigger a view update so CodeMirror picks up the new decorations
                view.requestMeasure();

                // Sync the global store here as well, now that we're "idle"
                if (this.tree) mainStore.getState().setTree(this.tree);
            }

            buildDecorations(view: EditorView) {
                if (!this.tree) return Decoration.none;
                const builder: Range<Decoration>[] = [];

                // Use the tree-sitter walker or a simple recursive walk
                const walk = (node: Node) => {
                    // Only process nodes within the visible viewport for better performance
                    if (node.endIndex < view.viewport.from || node.startIndex > view.viewport.to) return;

                    const tagName = node.type;
                    if (latexTagMap[tagName]) {
                        builder.push(
                            Decoration.mark({
                                class: `tok-${tagName}`,
                            }).range(node.startIndex, node.endIndex),
                        );
                    }
                    for (let i = 0; i < node.childCount; i++) {
                        walk(node.child(i)!);
                    }
                };

                walk(this.tree.rootNode);
                return Decoration.set(builder, true);
            }

            destroy() {
                if (this.timeout) clearTimeout(this.timeout);
            }
        },
        {
            decorations: (v) => v.decorations,
        },
    );
};
