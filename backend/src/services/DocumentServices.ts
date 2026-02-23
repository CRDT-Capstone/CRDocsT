import { APIError, ContributorType, Document, CursorPaginatedResponse } from "@cr_docs_t/dts";
import { DocumentModel } from "../models/Document.schema";
import { UserService } from "./UserService";
import { logger } from "../logging";
import { ObjectId } from "mongodb";
import { RootFilterQuery } from "mongoose";
import { redis } from "../redis";
import { RedisService } from "./RedisService";

const createDocument = async (userId: string | null, name?: string) => {
    const document = await DocumentModel.create({ ownerId: userId, name });
    return document;
};

const removeDocument = async (documentId: string) => {
    const res = await DocumentModel.findOneAndDelete({ _id: documentId });
    if (!res) {
        throw new APIError("Document not found", 404);
    }
    await RedisService.deleteCRDTStateByDocumentID(documentId);
};

const findDocumentById = async (documentId: string) => {
    const document = await DocumentModel.findById(documentId);
    return document;
};

const updateDocumentById = async (documentId: string, updateObj: Partial<Document>) => {
    const res = await DocumentModel.findOneAndUpdate({ _id: documentId }, updateObj);
    if (!res) {
        throw new APIError("Document not found", 404);
    }
};

const getDocumentsByUserId = async (
    userId: string,
    limit: number = 10,
    currentCursor?: string,
): Promise<CursorPaginatedResponse<Document>> => {
    //current cursor is the id of the last document from a previous pagination...

    // Filter out documents in projects
    const query: RootFilterQuery<Document> = {
        ownerId: userId,
        $or: [{ projectId: { $exists: false } }, { projectId: null }], // Exclude documents in projects
    };

    if (currentCursor) {
        query._id = { $lt: new ObjectId(currentCursor) };
    }

    const documents = await DocumentModel.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1);
    const hasNext = documents.length > limit;
    if (hasNext) documents.pop();
    const nextCursor = documents[limit - 1]?._id.toString() || undefined;

    return {
        data: documents,
        nextCursor,
        hasNext,
    };
};

const getSharedDocumentsByUserId = async (
    userId: string,
    limit: number = 10,
    currentCursor?: string,
): Promise<CursorPaginatedResponse<Document>> => {
    //current cursor is the id of the last document from a previous pagination...

    const userEmail = (await UserService.getUserEmailById(userId)) || "";
    // Filter out docments in projects and documents owned by the user
    const query: RootFilterQuery<Document> = {
        $and: [
            { "contributors.email": userEmail },
            { ownerId: { $ne: userId } }, // Exclude documents owned by the user
            { $or: [{ projectId: { $exists: false } }, { projectId: null }] }, // Exclude documents in projects
        ],
    };

    if (currentCursor) {
        query._id = { $lt: new ObjectId(currentCursor) };
    }

    const documents = await DocumentModel.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1);
    const hasNext = documents.length > limit;
    if (hasNext) documents.pop();
    const nextCursor = documents[limit - 1]?._id.toString() || undefined;

    return {
        data: documents,
        nextCursor,
        hasNext,
    };
};

const getDocumentMetadataById = async (documentId: string) => {
    const documentObj = await DocumentModel.findById(documentId, { serializedCRDTState: 0 });
    return documentObj;
};

const addUserAsCollaborator = async (
    documentId: string,
    contributorEmail: string,
    contributionType: ContributorType,
) => {
    //TODO: change this to allow users to change the contributor type
    try {
        const user = await UserService.getUserByEmail(contributorEmail);
        logger.debug("Adding user as collaborator", { documentId, contributorEmail, contributionType, user });

        const filter = {
            _id: documentId,
            "contributors.email": { $ne: contributorEmail },
            ...(user && { ownerId: { $ne: user.id } }),
        };
        const updatedDocument = await DocumentModel.findOneAndUpdate(
            filter,
            {
                $push: {
                    contributors: {
                        email: contributorEmail,
                        contributorType: contributionType,
                    },
                },
            },
            {
                new: true,
            },
        );

        if (!updatedDocument) {
            throw new APIError("Document not found or user is already a contributor", 400);
        }
    } catch (err) {
        logger.error("Error adding user as collaborator", { err });
        if (err instanceof APIError) {
            throw err;
        }
        const e = err as Error;
        throw new APIError(e.message || "Error adding user as collaborator", 500);
    }
};

//TODO: write a unit test for this
type IsDocumentOwnerOrCollaboratorReturn = { hasAccess: boolean; contributorType: ContributorType | undefined };
const IsDocumentOwnerOrCollaborator = async (
    documentId: string,
    email?: string,
): Promise<IsDocumentOwnerOrCollaboratorReturn> => {
    logger.debug("Checking if user is owner or collaborator", { documentId, email });
    const document = await DocumentModel.findById(documentId);
    logger.debug("Document", { document });

    if (!document) throw new APIError("Document does not exist", 404);
    if (!document.ownerId) return { hasAccess: true, contributorType: ContributorType.EDITOR };
    //if it was created by an anonymous user then anyone can have access to it...?
    //I don't think this is the most secure but I'm not quite sure what the solution is
    //We don't let anonymous users share?

    if (!email) {
        /*
         * If there's no email then it is possibly because the user is an anonymous owner
         * But that is covered by an earlier if statement where we handle all anonymous documents
         * So we should probably return false here
         */
        return { hasAccess: false, contributorType: undefined };
    }

    const user = await UserService.getUserByEmail(email);

    // If the user doesn't exist then they don't have access to the document.
    if (!user) {
        return { hasAccess: false, contributorType: undefined };
    }

    logger.debug("Collaborators", { collaborators: document.contributors, email });
    // If user is the document owner or they exist in the list of contributors then they have access to the document
    const foundCollaborator = document.contributors.find((contributor) => contributor.email === email);
    logger.debug("Found Collaborator", { foundCollaborator });
    let isDocumentOwnerOrCollaborator = false;
    if (document.ownerId === user.id || (document.contributors.length > 0 && foundCollaborator)) {
        isDocumentOwnerOrCollaborator = true;
    }
    logger.debug("Is Document Owner or Collaborator", { isDocumentOwnerOrCollaborator });

    // If the user is not the document owner or a collaborator then they don't have access to the document
    if (!isDocumentOwnerOrCollaborator) return { hasAccess: false, contributorType: undefined };

    // Determine contributer type
    let contributorType;
    if (document.ownerId === user.id) {
        contributorType = ContributorType.EDITOR;
    } else {
        const contributor = foundCollaborator;
        contributorType = contributor!.contributorType;
    }

    logger.info({ isDocumentOwnerOrCollaborator, contributorType });
    return { hasAccess: isDocumentOwnerOrCollaborator, contributorType: contributorType };
};

const removeContributor = async (documentId: string, email: string) => {
    const result = await DocumentModel.updateOne(
        { _id: documentId, "contributors.email": email },
        { $pull: { contributors: { email } } },
    );

    logger.info("Remove contributor result", { result });
    if (result.matchedCount === 0)
        throw new APIError("Document does not exist, user is owner or user was never a contributor", 400);
};

const changeContributorType = async (documentId: string, email: string, contributorType: ContributorType) => {
    const result = await DocumentModel.updateOne(
        { _id: documentId, "contributors.email": email },
        {
            $set: {
                "contributors.$.contributorType": contributorType,
            },
        },
    );

    if (result.matchedCount === 0) throw new APIError("user is owner or was never a contributor", 400);
};

const isDocumentOwner = async (documentId: string, userId: string) => {
    const document = await DocumentModel.findById(documentId);
    if (!document || !document.ownerId) return false;
    return document.ownerId === userId;
};

export const DocumentServices = {
    createDocument,
    removeDocument,
    findDocumentById,
    updateDocumentById,
    getDocumentsByUserId,
    getSharedDocumentsByUserId,
    getDocumentMetadataById,
    IsDocumentOwnerOrCollaborator,
    addUserAsCollaborator,
    removeContributor,
    changeContributorType,
    isDocumentOwner,
};
