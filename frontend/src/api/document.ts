import { Document } from "../types";


const ApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const path = "docs";


const createDocument = async () => {
    try {
        const response = await fetch(`${ApiBaseUrl}/${path}/create`, {
            method: "POST",
        });
        if (!response.ok) {
            console.log("There was an error creating a document. Response Obj -> ", response);
            return;
        }
        const document = await response.json();
        console.log("The document -> ", document);
        return document.data._id;
    } catch (err) {
        console.log("There was an error creating a document -> ", err);
        //TODO: change this to some daisy UI element
    }
};

const updateDocumentName = async (newDocName: string, documentID: string) => {
    try {
        const response = await fetch(`${ApiBaseUrl}/${path}/update/${documentID}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: newDocName })
        });
        if (!response.ok) {
            console.log("There was an error updating the document name. Response Obj -> ", response);
            return;
        }
        return true;
    } catch (err) {
        console.log("There was an error updating document name -> ", err);
        //TODO: change this to some daisy UI element
    }
}

const getDocumentsByUserId = async (userId?: string) => {
    try {
        const response = await fetch(`${ApiBaseUrl}/${path}/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            console.log("There was an error retrieving documents. Response Obj -> ", response);
            return;
        }

        const data = await response.json();
        const documents: Document[] = data['data'];
        console.log('Documents -> ', documents);
        return documents;
    } catch (err) {
        console.log("There was an error retrieving documents-> ", err);
        //TODO: change this to some daisy UI element
    }
}

const getDocumentById = async(documentId: string)=>{
    const response = await fetch(`${ApiBaseUrl}/${path}/${documentId}`);
    if (!response.ok) {
            console.log("There was an error retrieving document. Response Obj -> ", response);
            return;
        }

        const data = await response.json();
        const document: Document = data['data'];
        console.log('Document -> ', document);
        return document;
}
export const DocumentAPIHelper = {
    createDocument,
    updateDocumentName,
    getDocumentsByUserId,
    getDocumentById
};

