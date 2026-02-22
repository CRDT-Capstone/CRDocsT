import { Dexie, type Table } from "dexie"
import { IDBDocumentSchema, IDBOperationSchema } from "../../types"

export const db = new Dexie("BragiDB") as Dexie & {
    documents: Table<IDBDocumentSchema, string>,
    operations: Table<IDBOperationSchema, number>
};

db.version(1).stores({
    documents: "documentId"
});

db.version(2).stores({
    documents: "documentId",
    operations: "++id, documentId"
});
