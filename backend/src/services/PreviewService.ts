import { APIError, f, logger } from "@cr_docs_t/dts";

const RENDERER_URL = process.env.RENDERER_URL!;
const RENDERER_API_TOKEN = process.env.RENDERER_API_TOKEN!;

const renderContent = async (content: string) => {
    try {
        const res = await f.post<Buffer>(
            `${RENDERER_URL}/renders-sync`,
            {
                template: content,
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
