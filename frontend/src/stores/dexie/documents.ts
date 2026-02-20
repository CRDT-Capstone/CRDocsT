import { FugueMessage } from "@cr_docs_t/dts";
import { db } from ".";

const saveBufferedChanges = async (documentId: string, msgs: FugueMessage[]) => {
    //testing
    const randomId = sessionStorage.getItem("windowId");
    const saveOperation = msgs.map((m)=>
        db.operations.add({
            documentId: `${documentId}-${randomId}`, 
            fugueMsg: m
        })
    )
    await Promise.all(saveOperation);
    console.log('We have saved!');
}

const getBufferedChanges = async (documentId: string) => {
    console.log("Get buffered changes -> ", documentId);
    //testing
    const randomId = sessionStorage.getItem("windowId");
    const all = await db.operations.toArray();
    console.log('All -> ', all);
    const operations = await db.operations.where("documentId").equals(`${documentId}-${randomId}`).toArray(); //testing
    console.log('All operations -> ', operations);
    return operations;
}

const deleteBufferedChanges = async (documentId: string) => {
    //testing
    const randomId = sessionStorage.getItem("windowId");
    await db.operations
        .where("documentId")
        .equals(`${documentId}-${randomId}`)
        .delete();
}

export const DocumentsIndexedDB = {
    saveBufferedChanges,
    getBufferedChanges,
    deleteBufferedChanges
}