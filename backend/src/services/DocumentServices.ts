import { DocumentModel } from "../models/Document.schema";
import { Document } from "../types/types";

const createDocument = async (userId: string | null) => {
    const document = await DocumentModel.create({ownerId: userId});
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
    const documents = await DocumentModel.find({ownerId: userId});
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