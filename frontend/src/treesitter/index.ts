import { Language, Parser, Query } from "web-tree-sitter";

let initPromise: Promise<{ parser: Parser; query: Query }> | null = null;

export const newParser = async () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        try {
            await Parser.init();
            const parser = new Parser();
            const Latex = await Language.load("/tree-sitter-latex.wasm");
            parser.setLanguage(Latex);

            // Load query file from public
            const schContent = await fetch("/highlights.scm").then((res) => res.text());
            const query = new Query(Latex, schContent);
            return { parser, query };
        } catch (error) {
            initPromise = null; // Reset on failure to allow retry
            console.error("Error initializing Tree-sitter:", error);
            throw error;
        }
    })();
    return initPromise;
};
