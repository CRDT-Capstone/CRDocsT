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

const getDocumentsByUserId = async (userId?: string) => {
    const documents = await DocumentModel.find({}); //for now
    return documents;
}

const getDocumentMetadataById = async(documentId: string)=>{
    const documentObj = await DocumentModel.findById(documentId, { serializedCRDTState: 0});
    return documentObj;  
}

export const DocumentServices = {
    createDocument,
    findDocumentById,
    updateDocumentById,
    getDocumentsByUserId,
    getDocumentMetadataById
};