import { FugueMessage } from "@cr_docs_t/dts";
import { db } from ".";

const saveBufferedChanges = async (documentId: string, msgs: FugueMessage[]) => {
    const isDev = import.meta.env.DEV;
    const randomId = sessionStorage.getItem("windowId");

    const saveOperation = msgs.map((m) =>
        db.operations.add({
            documentId: (isDev) ? `${documentId}-${randomId}` : documentId,
            fugueMsg: m
        })
    )
    await Promise.all(saveOperation);
}

const getBufferedChanges = async (documentId: string) => {
    console.log("Get buffered changes -> ", documentId);

    const isDev = import.meta.env.DEV;
    const randomId = sessionStorage.getItem("windowId");

    const operations = await db.operations.where("documentId")
        .equals((isDev) ? `${documentId}-${randomId}` : documentId).toArray(); 

    return operations;
}

const deleteBufferedChanges = async (documentId: string) => {

    const isDev = import.meta.env.DEV;
    const randomId = sessionStorage.getItem("windowId");

    await db.operations
        .where("documentId")
        .equals((isDev) ? `${documentId}-${randomId}` : documentId)
        .delete();
}

export const DocumentsIndexedDB = {
    saveBufferedChanges,
    getBufferedChanges,
    deleteBufferedChanges
}