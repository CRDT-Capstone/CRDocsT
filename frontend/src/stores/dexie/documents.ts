import { FugueState } from "@cr_docs_t/dts";
import { db } from ".";

const saveBufferedChanges = async (documentId: string, state: FugueState<string>) => {
    let document = await db.documents.get(documentId);
    if (!document) {
        await db.documents.add({
            documentId,
            state: JSON.stringify(state)
        }, documentId);
        return;
    }

    await db.documents.update(document, { state: JSON.stringify(state) });

}

const getBufferedChanges = async (documentId: string) => {
    const document = await db.documents.get(documentId);
    return document;
}

const deleteBufferedChanges = async (documentId: string) => {
    await db.documents.delete(documentId);
}

export const DocumentsIndexedDB = {
    saveBufferedChanges,
    getBufferedChanges,
    deleteBufferedChanges
}