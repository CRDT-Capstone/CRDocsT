import { FugueList, StringTotalOrder, FugueStateSerializer } from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import WebSocket from "ws";
import crypto from "crypto";
import { encode, decode } from "@msgpack/msgpack";
import { compress, decompress } from "lz4js";

interface ActiveDocument {
    crdt: FugueList<string>;
    sockets: Set<WebSocket>;
    lastActivity: number;
    cleanupTimeout?: NodeJS.Timeout;
}

class DocumentManager {
    private static instances: Map<string, ActiveDocument> = new Map();
    private static dirtyDocs: Set<string> = new Set();
    static readonly persistenceIntervalMs: number = 5 * 1000; // 5 seconds

    static async getOrCreate(documentID: string): Promise<ActiveDocument> {
        // If the document is already active, return it
        let doc = this.instances.get(documentID);
        if (doc) {
            console.log(`Found existing ActiveDocument for ID ${documentID}.`);
            if (doc.cleanupTimeout) {
                clearTimeout(doc.cleanupTimeout);
                doc.cleanupTimeout = undefined;
                console.log(`Cancelled cleanup for document ${documentID} due to new activity.`);
            }
            doc.lastActivity = Date.now();
            return doc;
        }

        // Otherwise get from DB or create a new one
        const existingState = await RedisService.getCRDTStateByDocumentID(documentID);
        console.log(
            `Creating new ActiveDocument for ID ${documentID}. Existing state: ${existingState ? "found" : "not found"}`,
        );
        // The central CRDT is a netural observer that just holds the definitive state of a document
        // therefore its document ID can be randomly generated, however it should probably have an identifiable
        // part to help with debugging
        const crdt = new FugueList(new StringTotalOrder(crypto.randomBytes(3).toString()), null, documentID);
        if (existingState) {
            const deserializedState = FugueStateSerializer.deserialize(existingState);
            crdt.state = deserializedState;
        }

        const newDoc: ActiveDocument = {
            crdt,
            sockets: new Set(),
            lastActivity: Date.now(),
        };

        this.instances.set(documentID, newDoc);
        return newDoc;
    }

    static removeUser(documentID: string, ws: WebSocket) {
        const doc = this.instances.get(documentID);
        if (!doc) return;

        doc.sockets.delete(ws);
        // If no one is left, start the countdown to offload from memory
        if (doc.sockets.size === 0) {
            console.log(`Document ${documentID} is empty. Scheduling cleanup...`);

            doc.cleanupTimeout = setTimeout(
                async () => {
                    await this.cleanup(documentID);
                },
                5 * 60 * 1000,
            ); // 5 minutes grace period
        }
    }

    static async persist(documentID: string) {
        const doc = this.instances.get(documentID);
        if (doc) {
            const serializedState = FugueStateSerializer.serialize(doc.crdt.state);
            await RedisService.updateCRDTStateByDocumentID(documentID, Buffer.from(serializedState));
            // Possibly mongoDB logic too
        }
    }

    static startPersistenceInterval() {
        setInterval(async () => {
            for (const documentID of this.dirtyDocs) {
                await this.persist(documentID);
                this.dirtyDocs.delete(documentID);
            }
        }, this.persistenceIntervalMs);
    }

    private static async cleanup(documentID: string) {
        const doc = this.instances.get(documentID);
        if (doc) {
            await this.persist(documentID);
            this.instances.delete(documentID);
            console.log(`Cleaned up document ${documentID} from memory.`);
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
