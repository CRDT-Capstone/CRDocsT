import { BragiAST, NodeId } from "@cr_docs_t/dts/treesitter";

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
        id: node.id,
    };

    for (const [key, value] of Object.entries(node)) {
        if (["id", "parentId", "type", "text", "childrenIds"].includes(key)) continue;
        if (value === undefined) continue;

        if (Array.isArray(value)) {
            result[key] = value.map((id) => buildNestedAst(ast, id));
        } else if (typeof value === "string") {
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

export function genNRandomHexColors(n: number = 1): string[] {
    const colors: string[] = [];
    for (let i = 0; i < n; i++) {
        const color = `#${Math.floor(Math.random() * 0xffffff)
            .toString(16)
            .padStart(6, "0")}`;
        colors.push(color);
    }
    return colors;
}

function serialize(value: unknown, seen = new WeakSet(), depth = 0): unknown {
    if (depth > 10) return "[MaxDepth]";
    if (value === null || value === undefined) return value;
    if (typeof value === "function") return "[Function]";
    if (typeof value !== "object") return value;

    if (seen.has(value as object)) return "[Circular]";
    seen.add(value as object);

    if (value instanceof Map) {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of value.entries()) {
            const key = typeof k === "object" ? JSON.stringify(serialize(k, seen, depth + 1)) : String(k);
            obj[key] = serialize(v, seen, depth + 1);
        }
        return { __type: "Map", size: value.size, entries: obj };
    }

    if (value instanceof Set) {
        return { __type: "Set", size: value.size, values: Array.from(value).map((v) => serialize(v, seen, depth + 1)) };
    }

    if (Array.isArray(value)) {
        return value.map((v) => serialize(v, seen, depth + 1));
    }

    if (value instanceof Error) {
        return { __type: "Error", message: value.message, stack: value.stack };
    }

    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
        result[key] = serialize((value as Record<string, unknown>)[key], seen, depth + 1);
    }
    return result;
}

const _console = {
    log: globalThis.console.log.bind(globalThis.console),
    warn: globalThis.console.warn.bind(globalThis.console),
    error: globalThis.console.error.bind(globalThis.console),
    debug: globalThis.console.debug.bind(globalThis.console),
    info: globalThis.console.info.bind(globalThis.console),
};

function formatToString(...args: unknown[]): string {
    return args
        .map((arg) => {
            if (typeof arg === "string") return arg;
            try {
                return JSON.stringify(serialize(arg), null, 2);
            } catch {
                return String(arg);
            }
        })
        .join(" ");
}

export const devConsole = new Proxy(globalThis.console, {
    get(target, prop) {
        switch (prop) {
            case "log":
                return (...args: unknown[]) => _console.log(formatToString(...args));
            case "warn":
                return (...args: unknown[]) => _console.warn(formatToString(...args));
            case "error":
                return (...args: unknown[]) => _console.error(formatToString(...args));
            case "debug":
                return (...args: unknown[]) => _console.debug(formatToString(...args));
            case "info":
                return (...args: unknown[]) => _console.info(formatToString(...args));
            default:
                return (target as any)[prop];
        }
    },
});
