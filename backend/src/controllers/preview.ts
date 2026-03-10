import { logger } from "@cr_docs_t/dts";
import { Request, Response } from "express";
import { ValidatedRequest } from "express-zod-safe";
import { z } from "zod";
import { handleErrorAsAPIError } from "../utils";
import { sendErr } from "../utils/ApiResponseUtils";
import { PreviewService } from "../services/PreviewService";
import { defineController } from ".";

const documentIdSchema = () =>
    z.strictObject({
        documentId: z.string().min(1, "documentId is required"),
    });

const renderContentSchema = {
    body: z.strictObject({
        content: z.string(),
    }),
};

const renderContent = async (req: ValidatedRequest<typeof renderContentSchema>, res: Response) => {
    try {
        const { content } = req.body;
        logger.debug("Content", { content });
        const file = await PreviewService.renderContent(content);
        const buffer = Buffer.from(file);
        logger.debug("Buffer size", { size: buffer.length });
        logger.debug("PDF header", { header: buffer.slice(0, 4).toString() }); // should be "%PDF"

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "inline; filename=preview.pdf");
        res.send(buffer);
    } catch (err: unknown) {
        logger.error("There was an error rendering the content", err);
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

export const PreviewController = defineController({
    RenderContent: {
        con: renderContent,
        sch: renderContentSchema,
    },
});
