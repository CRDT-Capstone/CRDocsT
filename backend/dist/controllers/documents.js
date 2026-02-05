"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentController = void 0;
const DocumentServices_1 = require("../services/DocumentServices");
const dts_1 = require("@cr_docs_t/dts");
const RedisService_1 = require("../services/RedisService");
const express_1 = require("@clerk/express");
const MailService_1 = require("../services/MailService");
const logging_1 = require("../logging");
const ApiResponseUtils_1 = require("../utils/ApiResponseUtils");
const utils_1 = require("../utils");
const zod_1 = require("zod");
const createDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = (0, express_1.getAuth)(req);
        const document = yield DocumentServices_1.DocumentServices.createDocument(userId);
        const CRDT = new dts_1.FugueList(new dts_1.StringTotalOrder(document._id.toString()), null, document._id.toString());
        RedisService_1.RedisService.updateCRDTStateByDocumentID(document._id.toString(), Buffer.from(dts_1.FugueStateSerializer.serialize(CRDT.state)));
        return (0, ApiResponseUtils_1.sendOk)(res, {
            message: "Successfully created document",
            data: document,
        });
    }
    catch (err) {
        logging_1.logger.error("There was an error creating document", { err });
        const e = (0, utils_1.handleErrorAsAPIError)(err);
        return (0, ApiResponseUtils_1.sendErr)(res, e.msg, e.status);
    }
});
const documentIDSchema = () => zod_1.z.strictObject({
    documentId: zod_1.z.string().min(1, "documentId is required"),
});
const updateDocumentNameSchema = {
    params: documentIDSchema(),
    body: zod_1.z.strictObject({
        name: zod_1.z.string().min(1, "Name cannot be empty"),
    }),
};
const updateDocumentName = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name } = req.body;
    const { documentID } = req.params;
    if (!name) {
        res.status(400).send({
            message: "Title and documentID is required",
        });
        return;
    }
    try {
        yield DocumentServices_1.DocumentServices.updateDocumentById(documentID, { name });
        res.status(200).send({
            message: "Successfully updated the name of the document",
        });
    }
    catch (err) {
        logging_1.logger.error("There was an error creating document", { err });
        const e = (0, utils_1.handleErrorAsAPIError)(err, "Unable to update document name");
        return (0, ApiResponseUtils_1.sendErr)(res, e.msg, e.status);
    }
});
const getDocumentsByUserId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = (0, express_1.getAuth)(req);
    if (!userId) {
        return (0, ApiResponseUtils_1.sendErr)(res, {
            message: "Unauthorized",
            error: "User not authenticated",
        }, 401);
    }
    try {
        //Need to add some pagination or something to this
        const documents = yield DocumentServices_1.DocumentServices.getDocumentsByUserId(userId);
        return (0, ApiResponseUtils_1.sendOk)(res, {
            message: "Successfully retrieved documents",
            data: documents,
        });
    }
    catch (err) {
        logging_1.logger.error(`Unable to get documents for userID: ${userId}`, { err });
        const e = (0, utils_1.handleErrorAsAPIError)(err, "Unable to get documents for user");
        return (0, ApiResponseUtils_1.sendErr)(res, e.msg, e.status);
    }
});
const getDocumuentByIdSchema = {
    params: documentIDSchema(),
};
const getDocumentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { documentId } = req.params;
    try {
        const document = yield DocumentServices_1.DocumentServices.getDocumentMetadataById(documentId);
        if (!document) {
            return (0, ApiResponseUtils_1.sendErr)(res, { message: "Not found", error: "Document does not exist" }, 404);
        }
        return (0, ApiResponseUtils_1.sendOk)(res, {
            message: "Successfully retrieved document",
            data: document,
        });
    }
    catch (err) {
        logging_1.logger.error(`Unable to get document with Id ${documentId}`, { err });
        const e = (0, utils_1.handleErrorAsAPIError)(err, "Unable to get document");
        return (0, ApiResponseUtils_1.sendErr)(res, e.msg, e.status);
    }
});
const shareDocumentViaEmailSchema = {
    body: documentIDSchema().extend({
        receiverEmail: zod_1.z.email(),
        contributorType: zod_1.z.enum(dts_1.ContributorType),
    }),
};
const shareDocumentViaEmail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { receiverEmail, documentId, contributorType } = req.body;
        if (!documentId || !contributorType || !receiverEmail) {
            // TODO: :should use some validators here in the future
            return (0, ApiResponseUtils_1.sendErr)(res, {
                error: "documentId, receiverEmail and contributorType are required",
                message: "Missing required fields",
            }, 400);
        }
        //we should add the user's email to the document's collaborators list if it isn't there
        yield DocumentServices_1.DocumentServices.addUserAsCollaborator(documentId, receiverEmail, contributorType);
        logging_1.logger.info("Sending email", { receiverEmail, documentId, contributorType });
        const mailres = yield MailService_1.MailService.sendShareDocumentEmail(receiverEmail, documentId, contributorType);
        logging_1.logger.info("Successfully sent email");
        (0, ApiResponseUtils_1.sendOk)(res, {
            message: "Successfully shared document through email",
            data: undefined,
        });
    }
    catch (err) {
        logging_1.logger.error("Unable to share document through email", { err });
        const e = (0, utils_1.handleErrorAsAPIError)(err, "Unable to share document through email");
        return (0, ApiResponseUtils_1.sendErr)(res, e.msg, e.status);
    }
});
const removeContributorSchema = {
    body: documentIDSchema().extend({
        email: zod_1.z.email(),
    }),
};
const removeContributor = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { documentId, email } = req.body;
        yield DocumentServices_1.DocumentServices.removeContributor(documentId, email);
        return (0, ApiResponseUtils_1.sendOk)(res, {
            message: "Successfully removed contributor",
            data: undefined,
        });
    }
    catch (err) {
        logging_1.logger.error("Unable to remove contributor", { err });
        const e = (0, utils_1.handleErrorAsAPIError)(err, "Unable to remove contributor");
        return (0, ApiResponseUtils_1.sendErr)(res, e.msg, e.status);
    }
});
const updateContributorTypeSchema = {
    body: documentIDSchema().extend({
        email: zod_1.z.email(),
        contributorType: zod_1.z.enum(dts_1.ContributorType),
    }),
};
const updateContributorType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { documentId, email, contributorType } = req.body;
        yield DocumentServices_1.DocumentServices.changeContributorType(documentId, email, contributorType);
        return (0, ApiResponseUtils_1.sendOk)(res, {
            message: "Successfully changed contributor type",
            data: undefined,
        });
    }
    catch (err) {
        logging_1.logger.error("Unable to change contributor type", { err });
        const e = (0, utils_1.handleErrorAsAPIError)(err, "Unable to change contributor type");
        return (0, ApiResponseUtils_1.sendErr)(res, e.msg, e.status);
    }
});
exports.DocumentController = {
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
