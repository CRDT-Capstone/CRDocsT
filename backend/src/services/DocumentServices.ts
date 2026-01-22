import { ContributorType } from "../enums";
import { DocumentModel } from "../models/Document.schema";
import { Document } from "../types/types";

const createDocument = async (userId: string | null) => {
    const document = await DocumentModel.create({ ownerId: userId });
    return document;
}

const findDocumentById = async (documentId: string) => {
    const document = await DocumentModel.findById(documentId);
    return document;
}

const updateDocumentById = async (documentId: string, updateObj: Partial<Document>) => {
    await DocumentModel.findOneAndUpdate({ _id: documentId }, updateObj);
}

const getDocumentsByUserId = async (userId: string) => {
    const documents = await DocumentModel.find({ ownerId: userId });
    return documents;
}

const getDocumentMetadataById = async (documentId: string) => {
    const documentObj = await DocumentModel.findById(documentId, { serializedCRDTState: 0 });
    return documentObj;
}


const IsDocumentOwnerOrCollaborator = async (documentId: string, userId?: string) => {
    const document = await DocumentModel.findById(documentId);
    if (!document) throw Error('Document does not exist!');
    if (!document.ownerId) return [true, ContributorType.EDITOR]; //if it was created by an anonymous user then anyone can have access to it...?

    const isDocumentOwnerOrCollaborator =
        (
            (document.ownerId === userId) ||
            (document.contributors && document.contributors.find((contributor) => contributor.userId === userId))
        )

    if (!isDocumentOwnerOrCollaborator) return [false, undefined];
    let contributorType;
    if (document.ownerId === userId) {
        contributorType = ContributorType.EDITOR
    } else {
        const contributor = document.contributors!.find((c) => c.userId === userId);
        contributorType = contributor!.contributorType
    }
    return [isDocumentOwnerOrCollaborator, contributorType];
}


export const DocumentServices = {
    createDocument,
    findDocumentById,
    updateDocumentById,
    getDocumentsByUserId,
    getDocumentMetadataById,
    IsDocumentOwnerOrCollaborator
};