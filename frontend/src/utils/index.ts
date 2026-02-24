import { BragiAST, NodeId } from "@cr_docs_t/dts/treesitter";
import { Parser } from "web-tree-sitter";

export function randomString(length: number = 10): string {
    let res = new Array<string>(length);
    for (let i = 0; i < length; i++) res[i] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    return res.join("");
}

/**
 * Reconstructs the flat BragiAST Map into a deeply nested object for console debugging.
 */
export function buildNestedAst(ast: BragiAST, nodeId: NodeId = ast.rootId): any {
    const node = ast.nodes.get(nodeId);
    if (!node) return { error: `Node ${nodeId} not found` };

    // Start with the base properties
    const result: any = {
        type: node.type,
        text: JSON.stringify(node.text).slice(1, -1),
        id: node.id, // Uncomment if you want to see the UUIDs
    };

    for (const [key, value] of Object.entries(node)) {
        if (["id", "parentId", "type", "text", "childrenIds"].includes(key)) continue;
        if (value === undefined) continue;

        if (Array.isArray(value)) {
            result[key] = value.map((id) => buildNestedAst(ast, id));
        } else if (typeof value === "string") {
            // Single NodeId
            result[key] = buildNestedAst(ast, value);
        }
    }

    // Reconstruct generic children
    if (node.childrenIds && node.childrenIds.length > 0) {
        result.children = node.childrenIds.map((id) => buildNestedAst(ast, id));
    }

    return result;
}

export function makeAnonUserIdentity(): string {
    return `anon-${crypto.randomUUID()}`;
}
