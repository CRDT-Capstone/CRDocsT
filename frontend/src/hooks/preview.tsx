import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createPreviewApi } from "../api/preview";
import { APIError, LatexRenderError } from "@cr_docs_t/dts";

export const usePreview = () => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { renderContent } = createPreviewApi();

    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    const recompile = useCallback(async (content: string) => {
        if (!content.trim()) return;
        setIsRendering(true);
        setError(null);
        try {
            const file = await renderContent(content);
            setPdfUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
        } catch (err: any) {
            if (!(err instanceof APIError)) {
                console.error("Error rendering content -> ", err);
                toast.error("There was an error rendering the content. Please try again.");
                setError("There was an error rendering the content. Please try again.");
            }
            if (err.status === 422) {
                const e = err as APIError;
                const data = e.data.data as LatexRenderError;
                toast.error("Syntax error in LaTeX content", {
                    duration: Infinity,
                    action: {
                        label: "Dismiss",
                        onClick: () => {},
                    },
                    description: `${data.error.message} at line ${data.error.line}`,
                });
            } else {
                const e = err as APIError;
                toast.error(e.message || "An error occurred while rendering the content. Please try again.");
            }
        } finally {
            setIsRendering(false);
        }
    }, []);

    return {
        pdfUrl,
        isRendering,
        error,
        recompile,
    };
};
