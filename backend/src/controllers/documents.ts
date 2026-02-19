import { Request, Response } from "express";
import { DocumentServices } from "../services/DocumentServices";
import { APIError, ContributorSchema, ContributorType, FugueTree, FugueStateSerializer } from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import { getAuth } from "@clerk/express";
import { MailService } from "../services/MailService";
import { logger } from "../logging";
import { sendOk, sendErr } from "../utils/ApiResponseUtils";
import { handleErrorAsAPIError } from "../utils";
import { z } from "zod";
import { Schema, ValidatedRequest } from "../validaton";
import { ControllerWSchema, defineController } from ".";

const documentIdSchema = () =>
    z.strictObject({
        documentId: z.string().min(1, "documentId is required"),
    });

const createDocument = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);
        const document = await DocumentServices.createDocument(userId);
        const CRDT = new FugueTree(null, document._id.toString(), document._id.toString());

        RedisService.updateCRDTStateByDocumentID(document._id.toString(), Buffer.from(CRDT.save()));

        return sendOk(res, {
            message: "Successfully created document",
            data: document,
        });
    } catch (err: unknown) {
        logger.error("There was an error creating document", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const deleteDocumentSchema = {
    params: documentIdSchema(),
};

const deleteDocument = async (req: ValidatedRequest<typeof deleteDocumentSchema>, res: Response) => {
    try {
        const { documentId } = req.params;
        await DocumentServices.removeDocument(documentId);
        return sendOk(res, {
            message: "Successfully deleted document",
            data: undefined,
        });
    } catch (err: unknown) {
        logger.error("There was an error deleting document", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const updateDocumentNameSchema = {
    params: documentIdSchema(),
    body: z.strictObject({
        name: z.string().min(1, "Name cannot be empty"),
    }),
};

const updateDocumentName = async (req: ValidatedRequest<typeof updateDocumentNameSchema>, res: Response) => {
    const { name } = req.body;
    const { documentId } = req.params;
    try {
        await DocumentServices.updateDocumentById(documentId as string, { name });
        res.status(200).send({
            message: "Successfully updated the name of the document",
        });
    } catch (err) {
        logger.error("There was an error creating document", { err });
        const e = handleErrorAsAPIError(err, "Unable to update document name");
        return sendErr(res, e.msg, e.status);
    }
};

const getDocumentsByUserId = async (req: Request, res: Response) => {
    const { userId } = await getAuth(req);
    if (!userId) {
        return sendErr(
            res,
            {
                message: "Unauthorized",
                error: "User not authenticated",
            },
            401,
        );
    }
    try {
        const { nextCursor, limit } = req.query;
        const data = await DocumentServices.getDocumentsByUserId(
            userId!,
            Number(limit) ?? undefined,
            nextCursor ? nextCursor.toString() : undefined,
        );
        logger.debug("data", { data });
        return sendOk(res, {
            message: "Successfully retrieved documents",
            data: data,
        });
    } catch (err: any) {
        logger.error(`Unable to get documents for userID: ${userId}`, { err });
        const e = handleErrorAsAPIError(err, "Unable to get documents for user");
        return sendErr(res, e.msg, e.status);
    }
};

const getDocumuentByIdSchema = {
    params: documentIdSchema(),
};

const getDocumentById = async (req: Request, res: Response) => {
    const { documentId } = req.params;
    try {
        const document = await DocumentServices.getDocumentMetadataById(documentId as string);
        if (!document) {
            return sendErr(res, { message: "Not found", error: "Document does not exist" }, 404);
        }
        return sendOk(res, {
            message: "Successfully retrieved document",
            data: document,
        });
    } catch (err: any) {
        logger.error(`Unable to get document with Id ${documentId}`, { err });
        const e = handleErrorAsAPIError(err, "Unable to get document");
        return sendErr(res, e.msg, e.status);
    }
};

const shareDocumentViaEmailSchema = {
    body: documentIdSchema().extend({
        receiverEmail: z.email(),
        contributorType: z.enum(ContributorType),
    }),
};

const shareDocumentViaEmail = async (req: Request, res: Response) => {
    try {
        const { receiverEmail, documentId, contributorType } = req.body;
        if (!documentId || !contributorType || !receiverEmail) {
            // TODO: :should use some validators here in the future
            return sendErr(
                res,
                {
                    error: "documentId, receiverEmail and contributorType are required",
                    message: "Missing required fields",
                },
                400,
            );
        }

        //we should add the user's email to the document's collaborators list if it isn't there
        await DocumentServices.addUserAsCollaborator(documentId, receiverEmail, contributorType);

        logger.info("Sending email", { receiverEmail, documentId, contributorType });
        const mailres = await MailService.sendShareDocumentEmail(receiverEmail, documentId, contributorType);
        logger.info("Successfully sent email");

        sendOk(res, {
            message: "Successfully shared document through email",
            data: undefined,
        });
    } catch (err: any) {
        logger.error("Unable to share document through email", { err });
        const e = handleErrorAsAPIError(err, "Unable to share document through email");
        return sendErr(res, e.msg, e.status);
    }
};

const removeContributorSchema = {
    body: documentIdSchema().extend({
        email: z.email(),
    }),
};

const removeContributor = async (req: Request, res: Response) => {
    try {
        const { documentId, email } = req.body;
        await DocumentServices.removeContributor(documentId, email);
        return sendOk(res, {
            message: "Successfully removed contributor",
            data: undefined,
        });
    } catch (err: any) {
        logger.error("Unable to remove contributor", { err });
        const e = handleErrorAsAPIError(err, "Unable to remove contributor");
        return sendErr(res, e.msg, e.status);
    }
};

const updateContributorTypeSchema = {
    body: documentIdSchema().extend({
        email: z.email(),
        contributorType: z.enum(ContributorType),
    }),
};

const updateContributorType = async (req: Request, res: Response) => {
    try {
        const { documentId, email, contributorType } = req.body;
        await DocumentServices.changeContributorType(documentId, email, contributorType);
        return sendOk(res, {
            message: "Successfully changed contributor type",
            data: undefined,
        });
    } catch (err: any) {
        logger.error("Unable to change contributor type", { err });
        const e = handleErrorAsAPIError(err, "Unable to change contributor type");
        return sendErr(res, e.msg, e.status);
    }
};

export const DocumentController = defineController({
    CreateDocument: {
        con: createDocument,
        sch: undefined,
    },
    DeleteDocument: {
        con: deleteDocument,
        sch: deleteDocumentSchema,
    },
    UpdateDocumentName: {
        con: updateDocumentName,
        sch: updateDocumentNameSchema,
    },
    GetDocumentsByUserId: {
        con: getDocumentsByUserId,
        sch: undefined,
    },
    GetDocumentById: {
        con: getDocumentById,
        sch: getDocumuentByIdSchema,
    },
    ShareDocumentViaEmail: {
        con: shareDocumentViaEmail,
        sch: shareDocumentViaEmailSchema,
    },
    RemoveContributor: {
        con: removeContributor,
        sch: removeContributorSchema,
    },
    UpdateContributorType: {
        con: updateContributorType,
        sch: updateContributorTypeSchema,
    },
});
