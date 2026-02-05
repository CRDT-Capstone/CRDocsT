import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { ContributorType, Document, f, Msg, CursorPaginatedResponse } from "@cr_docs_t/dts";

const ApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const path = "docs";

type TokenFunc = () => Promise<string | null>;

export const createDocumentApi = (getToken: TokenFunc) => {
    const navigate = useNavigate();

    const createDocument = async () => {
        try {
            const token = await getToken();

            const response = await f.post<Msg<Document>>(`${ApiBaseUrl}/${path}/create`, undefined, {
                headers: {
                    Authorization: `Bearer: ${token}`,
                },
            });

            const document = response.data;
            console.log("The document -> ", document);
            return response;
        } catch (err) {
            console.log("There was an error creating a document -> ", err);
            throw err;
            //TODO: change this to some daisy UI element
        }
    };

    const updateDocumentName = async (newDocName: string, documentID: string) => {
        try {
            const token = await getToken();

            const response = await f.put<Msg, { name: string }>(
                `${ApiBaseUrl}/${path}/update/${documentID}`,
                { name: newDocName },
                {
                    headers: {
                        Authorization: `Bearer: ${token}`,
                    },
                },
            );
            console.log({ response });

            return response;
        } catch (err) {
            console.log("There was an error updating document name -> ", err);
            throw err;
            //TODO: change this to some daisy UI element
        }
    };

    const getDocumentsByUserId = async (limit: number = 10, nextCursor?: string) => {
        try {
            const token = await getToken();
            const query = (nextCursor) ? `nextCursor=${nextCursor}&limit=${limit}`: `limit=${limit}`;


            const response = await f.get<Msg<Document[]>>(`${ApiBaseUrl}/${path}/user?${query}`, {
                headers: {
                    Authorization: `Bearer: ${token}`,
                },
            });

            const data = response.data;
            const documents = data;
            console.log("Documents -> ", documents);
            return documents;
        } catch (err) {
            console.log("There was an error retrieving documents-> ", err);
            throw err;
            //TODO: change this to some daisy UI element
        }
    };

    const getDocumentById = async (documentId: string) => {
        const token = await getToken();

        console.log({ documentId });
        const response = await f.get<Msg<Document>>(`${ApiBaseUrl}/${path}/${documentId}`, {
            headers: {
                Authorization: `Bearer: ${token}`,
            },
        });

        const document = response.data;
        console.log("Document -> ", document);
        return document;
    };

    const createAndNavigateToDocument = async () => {
        const docID = await createDocument();
        if (docID) {
            navigate(`/docs/${docID}`);
        }
    };

    const shareDocument = async (documentId: string, email: string, contributorType: ContributorType) => {
        try {
            const token = await getToken();

            const response = await f.post<
                Msg,
                { receiverEmail: string; documentId: string; contributorType: ContributorType }
            >(
                `${ApiBaseUrl}/${path}/share`,
                {
                    receiverEmail: email,
                    documentId,
                    contributorType,
                },
                {
                    headers: {
                        Authorization: `Bearer: ${token}`,
                    },
                },
            );
            return response;
        } catch (err) {
            console.log("Unable to share document -> ", err);
            throw err;
        }
    };

    const removeCollaborator = async (documentId: string, email: string) => {
        try {
            const token = await getToken();

            const res = await f.post<Msg, { documentId: string; email: string }>(
                `${ApiBaseUrl}/${path}/${documentId}/remove-collaborator`,
                {
                    documentId: documentId,
                    email: email,
                },
                {
                    headers: {
                        Authorization: `Bearer: ${token}`,
                    },
                },
            );

            return res;
        } catch (err) {
            console.error("Unable to remove collaborator -> ", err);
            throw err;
        }
    };

    const updateCollaboratorType = async (documentId: string, email: string, collaboratorType: ContributorType) => {
        try {
            const token = await getToken();

            const res = await f.post<Msg, { documentId: string; email: string; contributorType: ContributorType }>(
                `${ApiBaseUrl}/${path}/${documentId}/update-collaborator-type`,
                {
                    documentId: documentId,
                    email: email,
                    contributorType: collaboratorType,
                },
                {
                    headers: {
                        Authorization: `Bearer: ${token}`,
                    },
                },
            );

            return res;
        } catch (err) {
            console.log("Unable to update collaborator type -> ", err);
            throw err;
        }
    };

    return {
        createDocument,
        updateDocumentName,
        getDocumentsByUserId,
        getDocumentById,
        createAndNavigateToDocument,
        shareDocument,
        removeCollaborator,
        updateCollaboratorType,
    };
};
