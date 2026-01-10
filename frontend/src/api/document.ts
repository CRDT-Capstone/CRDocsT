import { create } from "domain";

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
export const DocumentAPIHelper = {
    createDocument,
};

