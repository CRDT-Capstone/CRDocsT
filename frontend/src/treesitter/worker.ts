import { Parser, Query, Tree } from "web-tree-sitter";
import { newParser } from "./index";

export type TreeSitterWorkerMessage = {
    type: "init" | "parse" | "ready" | "results";
    payload?: any;
};

export type ResultsMessage = {
    from: number;
    to: number;
    name: string;
};

let parser: Parser | null = null;
let query: Query | null = null;
let tree: Tree | null = null;

const init = async () => {
    const tools = await newParser();
    parser = tools.parser;
    query = tools.query;
    self.postMessage({ type: "ready" });
};

init();

// Initialize WASM inside the worker
self.onmessage = async (e: MessageEvent<TreeSitterWorkerMessage>) => {
    const { type, payload } = e.data;

    if (!parser || !query) return; // Not ready yet

    if (type === "parse") {
        console.log("Worker received parse request");
        const { code, viewport } = payload;

        // Parse incrementally if we have a previous tree
        tree = parser.parse(code);

        if (!tree) return;

        // Query the tree for the visible range (plus a buffer)
        const captures = query.captures(tree.rootNode, {
            startIndex: viewport.from,
            endIndex: viewport.to,
        });

        // Serialize only what the main thread needs
        const results = captures.map((c) => ({
            from: c.node.startIndex,
            to: c.node.endIndex,
            name: c.name,
        }));
        console.log({ results, viewport });

        self.postMessage({ type: "results", payload: results });
    }
};
