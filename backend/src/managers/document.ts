import { FugueTree, FugueLeaveMessage, Operation, Serializer, makeFugueMessage, APIError } from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import WebSocket from "ws";
import crypto from "crypto";
import { logger } from "../logging";
import { DocumentServices } from "../services/DocumentServices";
import { StateService } from "../services/StateService";

class ActiveDocument {
    documentID: string;
    crdt: FugueTree;
    sockets: Set<WebSocket>;
    users: Set<string>;
    lastActivity: number;
    cleanupTimeout?: NodeJS.Timeout;

    constructor(documentID: string, crdt: FugueTree) {
        this.documentID = documentID;
        this.crdt = crdt;
        this.sockets = new Set();
        this.users = new Set();
        this.lastActivity = Date.now();
    }

    async addUser(ws: WebSocket, userIdentity: string) {
        this.sockets.add(ws);
        this.users.add(userIdentity);
        this.lastActivity = Date.now();
        await RedisService.updateCollaboratorsByDocumentId(this.documentID, this.users);
    }

    async removeUser(ws: WebSocket, userIdentity?: string) {
        this.users.delete(userIdentity!);
        this.lastActivity = Date.now();
        this.sockets.delete(ws);
        await RedisService.updateCollaboratorsByDocumentId(this.documentID, this.users);
    }

    async save() {
        await RedisService.updateCRDTStateByDocumentID(this.documentID, Buffer.from(this.crdt.save()));
        await RedisService.updateCollaboratorsByDocumentId(this.documentID, this.users);
        await DocumentServices.updateDocumentById(this.documentID, {
            serializedCRDTState: Buffer.from(this.crdt.save()),
        });
    }

    send(bytes: Uint8Array, sendingSock?: WebSocket) {
        this.sockets.forEach((sock) => {
            if (sock.readyState !== WebSocket.OPEN) return;
            // If sending sock is passed skip it when propagating
            if (sendingSock && sock === sendingSock) return;
            sock.send(bytes);
        });
    }
}

class ActiveProject {
    projectID: string;
    sockets: Set<WebSocket>;

    constructor(projectID: string) {
        this.sockets = new Set();
        this.projectID = projectID;
    }

    async addUser(ws: WebSocket) {
        this.sockets.add(ws);
    }

    async removeUser(ws: WebSocket) {
        this.sockets.delete(ws);
    }

    send(bytes: Uint8Array, sendingSock?: WebSocket) {
        logger.debug(`sockets length -> ${this.sockets.size}`);
        this.sockets.forEach((sock) => {
            if (sock.readyState !== WebSocket.OPEN) return;
            // If sending sock is passed skip it when propagating
            if (sendingSock && sock === sendingSock) return;
            sock.send(bytes);
        });
    }
}

class DocumentManager {
    private static docs: Map<string, ActiveDocument> = new Map();
    private static loadingDocuments: Map<string, Promise<ActiveDocument>> = new Map();
    private static loadingProjects: Map<string, Promise<ActiveProject>> = new Map();
    private static dirtyDocs: Set<string> = new Set();
    private static projects: Map<string, ActiveProject> = new Map();
    static readonly persistenceIntervalMs: number = 0.5 * 1000; // 0.5 seconds

    static async projectGetOrCreate(projectID?: string) {
        if (projectID) {
            const proj = this.projects.get(projectID);
            if (proj) return proj;

            // Use the loading promises pattern to prevent multiple concurrent loads for the same projectID.
            // If a load is already in progress, wait for it to complete and return the result.

            let loading = this.loadingProjects.get(projectID);
            if (loading) return loading;

            const loadProj = (async () => {
                try {
                    const newProj = new ActiveProject(projectID);
                    this.projects.set(projectID, newProj);
                    return newProj;
                } finally {
                    this.loadingProjects.delete(projectID);
                }
            })();

            this.loadingProjects.set(projectID, loadProj);
            return loadProj;
        }
        return undefined;
    }

    static async getOrCreate(documentID: string): Promise<ActiveDocument> {
        // If the document is already active, return it
        let doc = this.docs.get(documentID);

        if (doc) {
            logger.debug(`Found existing ActiveDocument for ID ${documentID}.`);

            if (doc.cleanupTimeout) {
                clearTimeout(doc.cleanupTimeout);
                doc.cleanupTimeout = undefined;
                logger.debug(`Cancelled cleanup for document ${documentID} due to new activity.`);
            }
            doc.lastActivity = Date.now();
            return doc;
        }

        // Use the loading promises pattern to prevent multiple concurrent loads for the
        // same documentID. If a load is already in progress, wait for it to complete and return the result.

        let loading = this.loadingDocuments.get(documentID);
        if (loading) return loading;

        const loadTask = (async () => {
            try {
                // Otherwise get from DB or create a new one
                const existingState = await StateService.getUpToDateState(documentID);

                // The central CRDT is a netural observer that just holds the definitive state of a document
                // therefore its document ID can be randomly generated, however it should probably have an identifiable
                // part to help with debugging
                const crdt = new FugueTree(null, documentID, `doc-${crypto.randomBytes(4).toString("hex")}`);
                if (existingState) {
                    crdt.load(existingState);
                }

                const newDoc = new ActiveDocument(documentID, crdt);

                this.docs.set(documentID, newDoc);

                return newDoc;
            } finally {
                this.loadingDocuments.delete(documentID);
            }
        })();

        this.loadingDocuments.set(documentID, loadTask);
        return loadTask;
    }

    static async addUser(doc: ActiveDocument, ws: WebSocket, userIdentity: string) {
        await doc.addUser(ws, userIdentity);
    }

    static async addUserToProject(ws: WebSocket, project?: ActiveProject) {
        project?.addUser(ws);
    }

    static async removeUserFromProject(ws: WebSocket, projectID?: string) {
        if (projectID) {
            const project = this.projects.get(projectID);
            if (!project) return;
            project?.removeUser(ws);
        }
    }

    static async removeUser(documentID: string, ws: WebSocket, userIdentity?: string) {
        const doc = this.docs.get(documentID);
        if (!doc) return;

        await doc.removeUser(ws, userIdentity);
        if (userIdentity) {
            const collaborators = await RedisService.getCollaboratorsByDocumentId(documentID);
            const leaveMessage = makeFugueMessage<FugueLeaveMessage>({
                operation: Operation.LEAVE,
                userIdentity,
                documentID: documentID,
                replicaId: doc.crdt.replicaId(),
                collaborators: collaborators,
            });

            logger.debug(`Sending leave message for -> ${userIdentity}`);
            const bytes = Serializer.serialize([leaveMessage]);
            doc.send(bytes);
            logger.info("User left document", { documentID, userIdentity });

            // Persist the document immediately to ensure the leaving user's changes are saved and to update the list of collaborators in storage
            await this.persist(documentID);
        } else {
            logger.error(`User without userIdentity exiting file with documentId: ${documentID}`);
        }

        // If no one is left, start the countdown to offload from memory
        if (doc.sockets.size === 0) {
            logger.info(`Document ${documentID} is empty. Scheduling cleanup...`);

            doc.cleanupTimeout = setTimeout(
                async () => {
                    await this.cleanup(documentID);
                },
                5 * 60 * 1000,
            ); // 5 minutes grace period
        }
    }

    static async persist(documentID: string) {
        logger.debug(`Persisting document ${documentID} to storage.`);
        const doc = this.docs.get(documentID);
        if (doc) {
            await doc.save();
        }
    }

    static async startPersistenceInterval() {
        const runPersistence = async () => {
            const now = Date.now();

            // Copy to avoid mutation issues during the loop
            const docsToProcess = Array.from(this.dirtyDocs);

            for (const documentID of docsToProcess) {
                const doc = this.docs.get(documentID);

                if (doc) {
                    const timeSinceLastActivity = now - doc.lastActivity;

                    if (timeSinceLastActivity >= this.persistenceIntervalMs) {
                        try {
                            logger.debug(`Persisting ${documentID}`);
                            await this.persist(documentID);
                            this.dirtyDocs.delete(documentID);
                        } catch (err) {
                            logger.error(`Failed to persist ${documentID}`, { err });
                            // We leave it in dirtyDocs so it retries next time
                        }
                    }
                } else {
                    this.dirtyDocs.delete(documentID);
                }
            }

            // Schedule the next run only after this one finishes
            setTimeout(runPersistence, this.persistenceIntervalMs);
        };

        // Start the first run immediately
        runPersistence();
    }

    private static async cleanup(documentID: string) {
        const doc = this.docs.get(documentID);
        if (doc) {
            try {
                await this.persist(documentID);
                this.docs.delete(documentID);
                logger.info(`Cleaned up document ${documentID} from memory.`);
            } catch (e: unknown) {
                if (e instanceof APIError) {
                    logger.error(`Failed to persist document ${documentID} during cleanup`, { e });
                    return;
                }
                const err = e as Error;
                logger.error(`Failed to persist document ${documentID} during cleanup`, { err });
            }
        }
    }

    static markDirty(documentID: string) {
        this.dirtyDocs.add(documentID);
    }

    static getActiveDocs(): Map<string, ActiveDocument> {
        return this.docs;
    }
}

export default DocumentManager;
