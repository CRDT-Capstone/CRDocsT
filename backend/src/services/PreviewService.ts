import { APIError, f, logger } from "@cr_docs_t/dts";

const RENDERER_URL = process.env.RENDERER_URL!;
const RENDERER_API_TOKEN = process.env.RENDERER_API_TOKEN!;

const minifyLatex = (content: string): string => {
    return (
        content
            // Normalize line endings
            .replace(/\r\n/g, "\n")
            // Remove full-line comments
            .replace(/^[ \t]*%.*$/gm, "")
            // Remove inline comments (not escaped percent signs)
            .replace(/(?<!\\)%[^\n]*/g, "")
            // Collapse multiple blank lines into one
            .replace(/\n{3,}/g, "\n\n")
            // Strip leading/trailing whitespace on each line
            .replace(/^[ \t]+|[ \t]+$/gm, "")
            // Collapse multiple spaces/tabs into one (outside of verbatim — best effort)
            .replace(/[ \t]{2,}/g, " ")
            // Trim the whole string
            .trim()
    );
};

const renderContent = async (content: string) => {
    try {
        const res = await f.post<Buffer>(
            `${RENDERER_URL}/renders-sync`,
            {
                template: minifyLatex(content),
            },
            {
                headers: {
                    Authorization: `Bearer ${RENDERER_API_TOKEN}`,
                    Accept: "application/pdf",
                },
                asArrayBuffer: true,
            },
        );
        return res;
    } catch (err) {
        logger.error("Error rendering content", err);
        if (err instanceof APIError) {
            throw err;
        }
        const e = err as Error;
        throw new APIError(e.message || "Error rendering content", 500);
    }
};

export const PreviewService = {
    renderContent,
};
