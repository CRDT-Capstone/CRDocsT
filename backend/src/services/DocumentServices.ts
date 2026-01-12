import { DocumentModel } from "../models/Document.schema";
import { Document } from "../types";

const createDocument = async () => {
    const document = await DocumentModel.create({});
    return document;
}

const findDocumentById = async (documentId: string) => {
    const document = await DocumentModel.findById(documentId);
    return document;
}

const updateDocumentById = async (documentId: string, updateObj: Partial<Document>) => {
    await DocumentModel.findOneAndUpdate({ _id: documentId }, updateObj);
}

export const DocumentServices = {
    createDocument,
    findDocumentById,
    updateDocumentById
};