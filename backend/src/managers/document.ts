import { FugueTree, FugueStateSerializer, FugueLeaveMessage, FugueMessageSerialzier, Operation } from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import WebSocket from "ws";
import crypto from "crypto";
import { logger } from "../logging";

// interface ActiveDocument {
//     crdt: FugueTree;
//     sockets: Set<WebSocket>;
//     users: Set<string>;
//     lastActivity: number;
//     cleanupTimeout?: NodeJS.Timeout;
// }

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
        // Possibly mongoDB logic too
    }
}

class DocumentManager {
    private static instances: Map<string, ActiveDocument> = new Map();
    private static loadingTasks: Map<string, Promise<ActiveDocument>> = new Map();
    private static dirtyDocs: Set<string> = new Set();
    static readonly persistenceIntervalMs: number = 3 * 1000; // 3 seconds

    static async getOrCreate(documentID: string): Promise<ActiveDocument> {
        // If the document is already active, return it
        let doc = this.instances.get(documentID);

        if (doc) {
            logger.info(`Found existing ActiveDocument for ID ${documentID}.`);
            if (doc.cleanupTimeout) {
                clearTimeout(doc.cleanupTimeout);
                doc.cleanupTimeout = undefined;
                logger.info(`Cancelled cleanup for document ${documentID} due to new activity.`);
            }
            doc.lastActivity = Date.now();
            return doc;
        }

        let loading = this.loadingTasks.get(documentID);
        if (loading) return loading;

        const loadTask = (async () => {
            try {
                // Otherwise get from DB or create a new one
                const existingState = await RedisService.getCRDTStateByDocumentID(documentID);
                logger.info(
                    `Creating new ActiveDocument for ID ${documentID}. Existing state: ${existingState ? "found" : "not found"}`,
                );
                // The central CRDT is a netural observer that just holds the definitive state of a document
                // therefore its document ID can be randomly generated, however it should probably have an identifiable
                // part to help with debugging
                const crdt = new FugueTree(null, documentID, `doc-${crypto.randomBytes(4).toString("hex")}`);
                if (existingState) {
                    crdt.load(existingState);
                }

                // const newDoc: ActiveDocument = {
                //     crdt,
                //     sockets: new Set(),
                //     lastActivity: Date.now(),
                //     users: new Set(),
                // };
                const newDoc = new ActiveDocument(documentID, crdt);

                this.instances.set(documentID, newDoc);
                return newDoc;
            } finally {
                this.loadingTasks.delete(documentID);
            }
        })();

        this.loadingTasks.set(documentID, loadTask);
        return loadTask;
    }

    static async addUser(doc: ActiveDocument, ws: WebSocket, userIdentity: string) {
        await doc.addUser(ws, userIdentity);
    }

    static async removeUser(documentID: string, ws: WebSocket, userIdentity?: string) {
        const doc = this.instances.get(documentID);
        if (!doc) return;

        await doc.removeUser(ws, userIdentity);
        if (userIdentity) {
            const collaborators = await RedisService.getCollaboratorsByDocumentId(documentID);
            const leaveMessage: FugueLeaveMessage = {
                operation: Operation.LEAVE,
                userIdentity,
                documentID: documentID,
                replicaId: doc.crdt.replicaId(),
                collaborators: collaborators,
            };

            doc.sockets.forEach((sock) => {
                if (sock.readyState === WebSocket.OPEN) sock.send(FugueMessageSerialzier.serialize([leaveMessage]));
            });
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
        const doc = this.instances.get(documentID);
        if (doc) {
            await doc.save();
            // Possibly mongoDB logic too
        }
    }

    static async startPersistenceInterval() {
        const runPersistence = async () => {
            const now = Date.now();

            // Copy to avoid mutation issues during the loop
            const docsToProcess = Array.from(this.dirtyDocs);

            for (const documentID of docsToProcess) {
                const doc = this.instances.get(documentID);

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
        const doc = this.instances.get(documentID);
        if (doc) {
            await this.persist(documentID);
            this.instances.delete(documentID);
            logger.info(`Cleaned up document ${documentID} from memory.`);
        }
    }

    static markDirty(documentID: string) {
        this.dirtyDocs.add(documentID);
    }

    static getActiveDocs(): Map<string, ActiveDocument> {
        return this.instances;
    }
}

export default DocumentManager;
