import { FugueMessage, Operation } from "@cr_docs_t/dts";

export type Position = string;
export type IDBDocumentSchema = {
    documentId: string, //document Id
};


export type IDBOperationSchema = {
    id?: number;
    documentId: string;
    fugueMsg: FugueMessage
};
