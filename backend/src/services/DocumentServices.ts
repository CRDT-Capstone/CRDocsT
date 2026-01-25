import { ContributorType } from "@cr_docs_t/dts";
import { DocumentModel } from "../models/Document.schema";
import { Contributor, Document } from "../types/types";
import { UserService } from "./UserService";

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

const addUserAsCollaborator = async (documentId: string, contributorEmail: string, contributionType: ContributorType) => {
    const updatedDocument = await DocumentModel.findOneAndUpdate({
        _id: documentId,
        "contributors.email": { $ne: contributorEmail }
    }, {
        $push: {
            contributors: {
                email: contributorEmail,
                contributionType: contributionType
            }
        }
    }, {
        new: true
    });

    if (!updatedDocument) {
        throw new Error("Document not found or user is already a contributor")
    }
}


//TODO: write a unit test for this
const IsDocumentOwnerOrCollaborator = async (documentId: string, email?: string) => {
    const document = await DocumentModel.findById(documentId);
    if (!document) throw Error('Document does not exist!');
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
        (
            (document.ownerId === user.id) ||
            (document.contributors && document.contributors.find((contributor) => contributor.email === email))
        )

    if (!isDocumentOwnerOrCollaborator) return [false, undefined];
    let contributorType;
    if (document.ownerId === user.id) {
        contributorType = ContributorType.EDITOR
    } else {
        const contributor = document.contributors!.find((c) => c.email === email);
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
    IsDocumentOwnerOrCollaborator,
    addUserAsCollaborator
};