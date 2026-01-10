import { DocumentModel } from "../models/Document.schema";

const createDocument = async()=>{
    const document = await DocumentModel.create({});
    return document;
}

const findDocumentById = async(documentId: string)=>{
    const document = await DocumentModel.findById(documentId);
    return document;
}

export const DocumentServices = {
    createDocument,
    findDocumentById
};