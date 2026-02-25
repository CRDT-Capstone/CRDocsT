import { FugueMessage, Operation } from "@cr_docs_t/dts";

export type Position = string;
export type IDBDocumentSchema = {
    documentId: string; //document Id
};

export type IDBOperationSchema = {
    id?: number;
    documentId: string;
    fugueMsg: FugueMessage;
};

export enum ConnectionState {
    CONNECTED = "CONNECTED",
    RECONNECTING = "RECONNECTING",
    DISCONNECTED = "DISCONNECTED",
}

export enum NavBarType {
    UNSPECIFIED = "UNSPECIFIED",
    HOME = "HOME",
    CANVAS = "CANVAS",
    PROJECT = "PROJECT",
}

export interface Tab {
    id: string;
    docId: string;
    title: string;
    projectId?: string;
}

export type TabMap = Map<string, Tab>;

export type ActiveCollaborator = {
    collaborator: string;
    color: string;
    pos?: number;
};

export type ActiveCollaboratorMap = Map<string, ActiveCollaborator>;
