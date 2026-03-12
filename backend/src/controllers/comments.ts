import { Request, Response } from "express";
import { AuthenticatedRequest } from "../validaton";
import { CommentSchema, CommentType } from "@cr_docs_t/dts";
import { z } from 'zod';
import { handleErrorAsAPIError } from "../utils";
import { logger } from "../logging";
import { sendErr, sendOk } from "../utils/ApiResponseUtils";
import { CommentService } from "../services/CommentService";
import { ValidatedRequest } from "express-zod-safe";
import { defineController } from ".";

const createCommentSchema = {
    body: z.strictObject({
        CommentSchema,
        userIdentifier: z.string().min(1, "A user identifier is required")
    })
};

const commentIdSchema = () =>
    z.strictObject({
        commentId: z.string().min(1, "commentId is required"),
    });

const documentIdSchema = () =>
    z.strictObject({
        documentId: z.string().min(1, "documentId is required"),
    })


const createComment = async (req: AuthenticatedRequest<typeof createCommentSchema>, res: Response) => {
    try {
        const userId = req.auth.userId;
        const createCommentObj = { ...(req.body as unknown as CommentType) };

        if (!userId) createCommentObj.userId = userId!;
        const comment = await CommentService.createComment(createCommentObj);
        return sendOk(res, {
            message: 'Successfully created comment',
            data: comment
        });
    } catch (err: unknown) {
        logger.error("There was an error creating the comment", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
}

const resolveCommentSchema = {
    params: commentIdSchema(),
    body: z.strictObject({
        userIdentifier: z.string().min(1, "A user identifier is required")
    })
};

const resolveComment = async (req: ValidatedRequest<typeof resolveCommentSchema>, res: Response) => {
    try {
        const { commentId } = req.params;
        await CommentService.resolveComment(commentId);
        return sendOk(res, {
            message: 'Successfully created comment',
            data: null
        });
    } catch (err: unknown) {
        logger.error("There was an error resolving the comment", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
}

const getCommentsForDocumentSchema = {
    params: documentIdSchema(),
    body: z.strictObject({
        userIdentifier: z.string().min(1, "A user identifier is required")
    })
};

const getCommentsForDocument = async (req: AuthenticatedRequest<typeof getCommentsForDocumentSchema>, res: Response) => {
    const { documentId } = req.params;

    try {
        const comments = await CommentService.getCommentsByDocumentId(documentId);
        return sendOk(res, {
            message: 'Successfully created comment',
            data: comments
        });
    } catch (err: unknown) {
        logger.error(`There was an error getting comments for documentId -> ${documentId}`, { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
}

export const CommentController = defineController({
    CreateComment: {
        con: createComment,
        sch: createCommentSchema
    },
    ResolveComment: {
        con: resolveComment,
        sch: resolveCommentSchema
    },
    GetCommentForDocument: {
        con: getCommentsForDocument,
        sch: getCommentsForDocumentSchema
    }
});