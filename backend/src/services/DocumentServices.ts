import { APIError, ContributorType, Document, CursorPaginatedResponse } from "@cr_docs_t/dts";
import { DocumentModel } from "../models/Document.schema";
import { UserService } from "./UserService";
import { logger } from "../logging";
import { ObjectId } from "mongodb";
import { RootFilterQuery } from "mongoose";

const createDocument = async (userId: string | null) => {
    const document = await DocumentModel.create({ ownerId: userId });
    return document;
};

const findDocumentById = async (documentId: string) => {
    const document = await DocumentModel.findById(documentId);
    return document;
};

const updateDocumentById = async (documentId: string, updateObj: Partial<Document>) => {
    await DocumentModel.findOneAndUpdate({ _id: documentId }, updateObj);
};

const getDocumentsByUserId = async (
    userId: string,
    limit: number = 10,
    currentCursor?: string,
): Promise<CursorPaginatedResponse<Document>> => {
    //current cursor is the id of the last document from a previous pagination...

    const userEmail = (await UserService.getUserEmailById(userId)) || "";
    const query: RootFilterQuery<Document> = {
        $or: [{ ownerId: userId }, { "contributors.email": userEmail }],
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
const IsDocumentOwnerOrCollaborator = async (documentId: string, email?: string) => {
    logger.debug("Checking if user is owner or collaborator", { documentId, email });
    const document = await DocumentModel.findById(documentId);
    if (!document) throw Error("Document does not exist!");
    if (!document.ownerId) return [true, ContributorType.EDITOR];
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

    const user = await UserService.getUserByEmail(email);

    const isDocumentOwnerOrCollaborator =
        (user !== undefined && document.ownerId === user.id) ||
        (document.contributors.length > 0 &&
            document.contributors.find((contributor) => contributor.email === email) !== undefined);

    if (!isDocumentOwnerOrCollaborator) return [false, undefined];
    let contributorType;
    if (document.ownerId === user!.id) {
        contributorType = ContributorType.EDITOR;
    } else {
        const contributor = document.contributors!.find((c) => c.email === email);
        contributorType = contributor!.contributorType;
    }

    logger.info({ isDocumentOwnerOrCollaborator, contributorType });
    return [isDocumentOwnerOrCollaborator, contributorType];
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
