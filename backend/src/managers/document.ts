import {
    FugueTree,
    FugueStateSerializer,
    FugueLeaveMessage,
    FugueMessageSerialzier,
    Operation,
    Serializer,
    makeFugueMessage,
    FugueMessage,
} from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import WebSocket from "ws";
import crypto from "crypto";
import { logger } from "../logging";
import { Nidhoggr, Registry, parseCST } from "@cr_docs_t/dts/treesitter";
import { Parser } from "web-tree-sitter";

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
    nidhoggr: Nidhoggr;
    sockets: Set<WebSocket>;
    users: Set<string>;
    lastActivity: number;
    cleanupTimeout?: NodeJS.Timeout;

    constructor(documentID: string, crdt: FugueTree) {
        this.documentID = documentID;
        this.crdt = crdt;
        this.nidhoggr = new Nidhoggr(this.crdt);
        this.sockets = new Set();
        this.users = new Set();
        this.lastActivity = Date.now();
    }

    init(parser: Parser) {
        const content = this.crdt.observe();
        if (!content.trim()) return;

        logger.debug(`Initializing registry for document ${this.documentID} with content length: ${content.length}`);
        const cst = parser.parse(content);
        if (!cst) return;
        try {
            logger.debug(
                `Parsed CST for document ${this.documentID}. Root node type: ${cst.rootNode.type}, child count: ${cst.rootNode.childCount}`,
            );
            const ast = parseCST(cst.rootNode);
            logger.debug(`Parsed AST for document`, {
                rootNode: ast.nodes.get(ast.rootId),
                totalNodes: ast.nodes.size,
            });
            this.crdt.stampAll(ast);
        } finally {
            cst.delete();
        }
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

    send(bytes: Uint8Array, sendingSock?: WebSocket) {
        this.sockets.forEach((sock) => {
            if (sock.readyState !== WebSocket.OPEN) return;
            // If sending sock is passed skip it when propagating
            if (sendingSock && sock === sendingSock) return;
            sock.send(bytes);
        });
    }

    effect(msg: FugueMessage | FugueMessage[]) {
        return this.nidhoggr.consume(msg);
    }
}

class DocumentManager {
    private static instances: Map<string, ActiveDocument> = new Map();
    private static loadingTasks: Map<string, Promise<ActiveDocument>> = new Map();
    private static dirtyDocs: Set<string> = new Set();
    static readonly persistenceIntervalMs: number = 0.5 * 1000; // 0.5 seconds
    private static parser: Parser | undefined;

    static async loadProjectDocuments(projectID: string, documentIDs: string[]): Promise<ActiveDocument[]> {
        const loadedDocs: ActiveDocument[] = [];
        for (const docID of documentIDs) {
            const doc = await this.getOrCreate(docID);
            loadedDocs.push(doc);
        }
        return loadedDocs;
    }

    static async getOrCreate(documentID: string): Promise<ActiveDocument> {
        // If the document is already active, return it
        let doc = this.instances.get(documentID);

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
                if (this.parser) newDoc.init(this.parser);

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
        const doc = this.instances.get(documentID);
        if (doc) {
            await doc.save();
            // Possibly mongoDB logic too
        }
    }

    static async startPersistenceInterval() {
        const runPersistence = async () => {
            const now = Date.now();
            const docsToProcess = Array.from(this.dirtyDocs);

            for (const documentID of docsToProcess) {
                const doc = this.instances.get(documentID);
                if (!doc) {
                    this.dirtyDocs.delete(documentID);
                    continue;
                }

                const timeSinceLastActivity = now - doc.lastActivity;
                if (timeSinceLastActivity >= this.persistenceIntervalMs) {
                    try {
                        await this.persist(documentID);
                        this.dirtyDocs.delete(documentID);
                    } catch (err) {
                        logger.error(`Failed to persist ${documentID}`, { err });
                    }
                }
            }

            setTimeout(runPersistence, this.persistenceIntervalMs);
        };

        setTimeout(runPersistence, this.persistenceIntervalMs);
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

    static setParser(parser: Parser) {
        this.parser = parser;
    }

    static destroy() {
        this.parser?.delete();
    }
}

export default DocumentManager;
