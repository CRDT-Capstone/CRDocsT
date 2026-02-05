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
exports.DocumentServices = void 0;
const dts_1 = require("@cr_docs_t/dts");
const Document_schema_1 = require("../models/Document.schema");
const UserService_1 = require("./UserService");
const logging_1 = require("../logging");
const createDocument = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const document = yield Document_schema_1.DocumentModel.create({ ownerId: userId });
    return document;
});
const findDocumentById = (documentId) => __awaiter(void 0, void 0, void 0, function* () {
    const document = yield Document_schema_1.DocumentModel.findById(documentId);
    return document;
});
const updateDocumentById = (documentId, updateObj) => __awaiter(void 0, void 0, void 0, function* () {
    yield Document_schema_1.DocumentModel.findOneAndUpdate({ _id: documentId }, updateObj);
});
const getDocumentsByUserId = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const documents = yield Document_schema_1.DocumentModel.find({ ownerId: userId });
    return documents;
});
const getDocumentMetadataById = (documentId) => __awaiter(void 0, void 0, void 0, function* () {
    const documentObj = yield Document_schema_1.DocumentModel.findById(documentId, { serializedCRDTState: 0 });
    return documentObj;
});
const addUserAsCollaborator = (documentId, contributorEmail, contributionType) => __awaiter(void 0, void 0, void 0, function* () {
    //TODO: change this to allow users to change the contributor type
    try {
        const user = yield UserService_1.UserService.getUserByEmail(contributorEmail);
        logging_1.logger.debug("Adding user as collaborator", { documentId, contributorEmail, contributionType, user });
        const filter = Object.assign({ _id: documentId, "contributors.email": { $ne: contributorEmail } }, (user && { ownerId: { $ne: user.id } }));
        const updatedDocument = yield Document_schema_1.DocumentModel.findOneAndUpdate(filter, {
            $push: {
                contributors: {
                    email: contributorEmail,
                    contributorType: contributionType,
                },
            },
        }, {
            new: true,
        });
        if (!updatedDocument) {
            throw new dts_1.APIError("Document not found or user is already a contributor", 400);
        }
    }
    catch (err) {
        logging_1.logger.error("Error adding user as collaborator", { err });
        if (err instanceof dts_1.APIError) {
            throw err;
        }
        const e = err;
        throw new dts_1.APIError(e.message || "Error adding user as collaborator", 500);
    }
});
//TODO: write a unit test for this
const IsDocumentOwnerOrCollaborator = (documentId, email) => __awaiter(void 0, void 0, void 0, function* () {
    logging_1.logger.debug("Checking if user is owner or collaborator", { documentId, email });
    const document = yield Document_schema_1.DocumentModel.findById(documentId);
    if (!document)
        throw Error("Document does not exist!");
    if (!document.ownerId)
        return [true, dts_1.ContributorType.EDITOR];
    //if it was created by an anonymous user then anyone can have access to it...?
    //I don't think this is the most secure but I'm not quite sure what the solution is
    //We don't let anonymous users share?
    if (!email) {
        /*
        If there's no email then it is possibly because the user is an anonymous owner
        But that is covered by an earlier if statement where we handle all anonymous documents
        So we should probably return false here
        */
        return [false, undefined];
    }
    const user = yield UserService_1.UserService.getUserByEmail(email);
    logging_1.logger.info("User info", { user });
    const isDocumentOwnerOrCollaborator = (user !== undefined && document.ownerId === user.id) ||
        (document.contributors.length > 0 &&
            document.contributors.find((contributor) => contributor.email === email) !== undefined);
    if (!isDocumentOwnerOrCollaborator)
        return [false, undefined];
    let contributorType;
    if (document.ownerId === user.id) {
        contributorType = dts_1.ContributorType.EDITOR;
    }
    else {
        const contributor = document.contributors.find((c) => c.email === email);
        contributorType = contributor.contributorType;
    }
    logging_1.logger.info({ isDocumentOwnerOrCollaborator, contributorType });
    return [isDocumentOwnerOrCollaborator, contributorType];
});
const removeContributor = (documentId, email) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Document_schema_1.DocumentModel.updateOne({ _id: documentId, "contributors.email": email }, { $pull: { contributors: { email } } });
    logging_1.logger.info("Remove contributor result", { result });
    if (result.matchedCount === 0)
        throw new dts_1.APIError("Document does not exist, user is owner or user was never a contributor", 400);
});
const changeContributorType = (documentId, email, contributorType) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield Document_schema_1.DocumentModel.updateOne({ _id: documentId, "contributors.email": email }, {
        $set: {
            "contributors.$.contributorType": contributorType,
        },
    });
    if (result.matchedCount === 0)
        throw new dts_1.APIError("user is owner or was never a contributor", 400);
});
const isDocumentOwner = (documentId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const document = yield Document_schema_1.DocumentModel.findById(documentId);
    if (!document || !document.ownerId)
        return false;
    return document.ownerId === userId;
});
exports.DocumentServices = {
    createDocument,
    findDocumentById,
    updateDocumentById,
    getDocumentsByUserId,
    getDocumentMetadataById,
    IsDocumentOwnerOrCollaborator,
    addUserAsCollaborator,
    removeContributor,
    changeContributorType,
    isDocumentOwner,
};
