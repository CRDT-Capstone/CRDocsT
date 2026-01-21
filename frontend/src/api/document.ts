import { useAuth } from "@clerk/clerk-react";
import { Document } from "../types";
import { useNavigate } from "react-router-dom";


const ApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const path = "docs";


export const useDocumentApi = () => {
    const { getToken } = useAuth();
    const navigate = useNavigate();

    const createDocument = async () => {
        try {
            const token = await getToken();
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const response = await fetch(`${ApiBaseUrl}/${path}/create`, {
                method: "POST",
                headers
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
            const token = await getToken();
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const response = await fetch(`${ApiBaseUrl}/${path}/update/${documentID}`, {
                method: "PUT",
                headers,
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

    const getDocumentsByUserId = async () => {
        try {
            const token = await getToken();
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            };

            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            const response = await fetch(`${ApiBaseUrl}/${path}/user`, {
                method: "GET",
                headers
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

    const getDocumentById = async (documentId: string) => {
        const token = await getToken();
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`${ApiBaseUrl}/${path}/${documentId}`, {
            headers
        });
        if (!response.ok) {
            console.log("There was an error retrieving document. Response Obj -> ", response);
            return;
        }

        const data = await response.json();
        const document: Document = data['data'];
        console.log('Document -> ', document);
        return document;
    }

    const createAndNavigateToDocument = async () => {
        const docID = await createDocument();
        if (docID) {
            navigate(`/docs/${docID}`);
        }
    }
    return {
        createDocument,
        updateDocumentName,
        getDocumentsByUserId,
        getDocumentById,
        createAndNavigateToDocument
    };
}

