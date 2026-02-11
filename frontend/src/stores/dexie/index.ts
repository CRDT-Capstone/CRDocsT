import { Dexie, type Table } from "dexie"
import { IDBDocumentSchema } from "../../types"

export const db = new Dexie("BragiDB") as Dexie & {
    documents: Table<IDBDocumentSchema, string>
};

db.version(1).stores({
    documents: "documentId"
});