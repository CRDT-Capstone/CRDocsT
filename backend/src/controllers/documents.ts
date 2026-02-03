import { Request, Response } from "express";
import { DocumentServices } from "../services/DocumentServices";
import { redis } from "../redis";
import { FugueList, FugueStateSerializer, StringTotalOrder } from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import { getAuth } from "@clerk/express";
import { MailService } from "../services/MailService";
import { logger } from "../logging";

const createDocument = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);
        const document = await DocumentServices.createDocument(userId);
        const CRDT = new FugueList(new StringTotalOrder(document._id.toString()), null, document._id.toString());

        RedisService.updateCRDTStateByDocumentID(
            document._id.toString(),
            Buffer.from(FugueStateSerializer.serialize(CRDT.state)),
        );

        res.status(200).send({
            message: "Successfully created document",
            data: document,
        });

        return;
    } catch (err) {
        logger.error("There was an error creating document", { err });
        res.status(500).send({
            message: "Unable to create document",
        });
    }
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
        await DocumentServices.updateDocumentById(documentID, { name });
        res.status(200).send({
            message: "Successfully updated the name of the document",
        });
    } catch (err) {
        logger.error("There was an error creating document", { err });
        res.status(500).send({
            message: "Unable to create document",
        });
    }
};

const getDocumentsByUserId = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if (!userId) {
        res.status(403).send({
            message: "Unauthorised access",
        });
        return;
    }
    try {
        //Need to add some pagination or something to this
        const data = await DocumentServices.getDocumentsByUserId(userId!);
        res.status(200).send({
            message: "Successfully retrieved documents",
            data,
        });
    } catch (err: any) {
        logger.error(`Unable to get documents for userID: ${userId}`, { err });
        res.status(500).send({
            message: "Unable to retrieve documents",
        });
    }
};

const getDocumentById = async (req: Request, res: Response) => {
    const { documentId } = req.params;
    try {
        const document = await DocumentServices.getDocumentMetadataById(documentId);
        if (!document) {
            res.status(404).send({
                message: "Document does not exist",
            });
            return;
        }
        res.status(200).send({
            message: "Succesfully retrieved document",
            data: document,
        });
    } catch (err: any) {
        logger.error(`Unable to get document with Id ${documentId}`, { err });
        res.status(500).send({
            message: "Unable to retrieve document",
        });
    }
};

const shareDocumentViaEmail = async (req: Request, res: Response) => {
    try {
        const { receiverEmail, documentId, contributorType } = req.body;
        if (!documentId || !contributorType || !receiverEmail) {
            // TODO: :should use some validators here in the future
            // Example validators
            // - Validate that the email has an associated bragi account
            res.status(400).send({
                message: "documentId, receiverEmail and contributorType are required",
            });
            return;
        }

        //we should add the user's email to the document's collaborators list if it isn't there
        await DocumentServices.addUserAsCollaborator(documentId, receiverEmail, contributorType);

        logger.info("Sending email", { receiverEmail, documentId, contributorType });
        const mailres = await MailService.sendShareDocumentEmail(receiverEmail, documentId, contributorType);
        logger.info("Successfully sent email");

        res.status(200).send({
            message: "Succesfully sent email",
        });
    } catch (err: any) {
        logger.error("Unable to share document through email", { err });
        res.status(500).send({
            message: "Unable to share document through email",
        });
    }
};

const removeContributor = async (req: Request, res: Response) => {
    try {
        const { documentId, email } = req.body;
        await DocumentServices.removeContributor(documentId, email);
        res.status(200).send({
            message: "Successfully removed contributor",
        });
    } catch (err: any) {
        logger.error("Unable to remove contributor", { err });
        res.status(500).send({
            message: "Unable to remove contributor",
        });
    }
};

const updateContributorType = async (req: Request, res: Response) => {
    try {
        const { documentId, email, contributorType } = req.body;
        await DocumentServices.changeContributorType(documentId, email, contributorType);
        res.status(200).send({
            message: "Successfully changed contributor type",
        });
    } catch (err: any) {
        logger.error("Unable to change contributor type", { err });
        res.status(500).send({
            message: "Unable to change contrinbutor type",
        });
    }
};

export const DocumentController = {
    createDocument,
    updateDocumentName,
    getDocumentsByUserId,
    getDocumentById,
    shareDocumentViaEmail,
    removeContributor,
    updateContributorType,
};
