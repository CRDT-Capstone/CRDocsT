import { Request, Response } from "express";
import { DocumentServices } from "../services/DocumentServices";
import {
    APIError,
    ContributorSchema,
    ContributorType,
    FugueList,
    FugueStateSerializer,
    StringTotalOrder,
} from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import { getAuth } from "@clerk/express";
import { MailService } from "../services/MailService";
import { logger } from "../logging";
import { sendOk, sendErr } from "../utils/ApiResponseUtils";
import { handleErrorAsAPIError } from "../utils";
import { z } from "zod";
import { Schema } from "../validaton";
import { ControllerWSchema } from ".";

const createDocument = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);
        const document = await DocumentServices.createDocument(userId);
        const CRDT = new FugueList(new StringTotalOrder(document._id.toString()), null, document._id.toString());

        RedisService.updateCRDTStateByDocumentID(
            document._id.toString(),
            Buffer.from(FugueStateSerializer.serialize(CRDT.state)),
        );

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

const documentIDSchema = () =>
    z.strictObject({
        documentId: z.string().min(1, "documentId is required"),
    });

const updateDocumentNameSchema: Schema = {
    params: documentIDSchema(),
    body: z.strictObject({
        name: z.string().min(1, "Name cannot be empty"),
    }),
};

const updateDocumentName = async (req: Request, res: Response) => {
    const { name } = req.body;
    const { documentID } = req.params;
    if (!name) {
        res.status(400).send({
            message: "Title and documentID is required",
        });
        return;
    }
    try {
        await DocumentServices.updateDocumentById(documentID.toString(), { name });
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
    const { userId } = getAuth(req);
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

const getDocumuentByIdSchema: Schema = {
    params: documentIDSchema(),
};

const getDocumentById = async (req: Request, res: Response) => {
    const { documentId } = req.params;
    try {
        const document = await DocumentServices.getDocumentMetadataById(documentId.toString());
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

const shareDocumentViaEmailSchema: Schema = {
    body: documentIDSchema().extend({
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

const removeContributorSchema: Schema = {
    body: documentIDSchema().extend({
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

const updateContributorTypeSchema: Schema = {
    body: documentIDSchema().extend({
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

export const DocumentController: ControllerWSchema = {
    CreateDocument: {
        con: createDocument,
        sch: undefined,
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
};
