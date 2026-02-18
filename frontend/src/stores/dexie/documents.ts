import { FugueMessage } from "@cr_docs_t/dts";
import { db } from ".";

const saveBufferedChanges = async (documentId: string, msgs: FugueMessage[]) => {
    const saveOperation = msgs.map((m)=>
        db.operations.add({
            documentId, 
            fugueMsg: m
        })
    )
    await Promise.all(saveOperation);
    console.log('We have saved!');
}

const getBufferedChanges = async (documentId: string) => {
    console.log("Get buffered changes -> ", documentId);
    const all = await db.operations.toArray();
    console.log('All -> ', all);
    const operations = await db.operations.where("documentId").equals(documentId).toArray();
    console.log('All operations -> ', operations);
    return operations;
}

const deleteBufferedChanges = async (documentId: string) => {
    await db.documents.delete(documentId);
    await db.operations
        .where("documentId")
        .equals(documentId)
        .delete();
}

export const DocumentsIndexedDB = {
    saveBufferedChanges,
    getBufferedChanges,
    deleteBufferedChanges
}