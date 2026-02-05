"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dts_1 = require("@cr_docs_t/dts");
const RedisService_1 = require("../services/RedisService");
const crypto_1 = __importDefault(require("crypto"));
const logging_1 = require("../logging");
class DocumentManager {
    static getOrCreate(documentID) {
        return __awaiter(this, void 0, void 0, function* () {
            // If the document is already active, return it
            let doc = this.instances.get(documentID);
            if (doc) {
                logging_1.logger.info(`Found existing ActiveDocument for ID ${documentID}.`);
                if (doc.cleanupTimeout) {
                    clearTimeout(doc.cleanupTimeout);
                    doc.cleanupTimeout = undefined;
                    logging_1.logger.info(`Cancelled cleanup for document ${documentID} due to new activity.`);
                }
                doc.lastActivity = Date.now();
                return doc;
            }
            // Otherwise get from DB or create a new one
            const existingState = yield RedisService_1.RedisService.getCRDTStateByDocumentID(documentID);
            logging_1.logger.info(`Creating new ActiveDocument for ID ${documentID}. Existing state: ${existingState ? "found" : "not found"}`);
            // The central CRDT is a netural observer that just holds the definitive state of a document
            // therefore its document ID can be randomly generated, however it should probably have an identifiable
            // part to help with debugging
            const crdt = new dts_1.FugueList(new dts_1.StringTotalOrder(crypto_1.default.randomBytes(3).toString()), null, documentID);
            if (existingState) {
                const deserializedState = dts_1.FugueStateSerializer.deserialize(existingState);
                crdt.state = deserializedState;
            }
            const newDoc = {
                crdt,
                sockets: new Set(),
                lastActivity: Date.now(),
            };
            this.instances.set(documentID, newDoc);
            return newDoc;
        });
    }
    static removeUser(documentID, ws) {
        const doc = this.instances.get(documentID);
        if (!doc)
            return;
        doc.sockets.delete(ws);
        // If no one is left, start the countdown to offload from memory
        if (doc.sockets.size === 0) {
            logging_1.logger.info(`Document ${documentID} is empty. Scheduling cleanup...`);
            doc.cleanupTimeout = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                yield this.cleanup(documentID);
            }), 5 * 60 * 1000); // 5 minutes grace period
        }
    }
    static persist(documentID) {
        return __awaiter(this, void 0, void 0, function* () {
            logging_1.logger.debug(`Persisting document ${documentID} to storage.`);
            const doc = this.instances.get(documentID);
            if (doc) {
                const serializedState = dts_1.FugueStateSerializer.serialize(doc.crdt.state);
                yield RedisService_1.RedisService.updateCRDTStateByDocumentID(documentID, Buffer.from(serializedState));
                // Possibly mongoDB logic too
            }
        });
    }
    static startPersistenceInterval() {
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            for (const documentID of this.dirtyDocs) {
                yield this.persist(documentID);
                this.dirtyDocs.delete(documentID);
            }
        }), this.persistenceIntervalMs);
    }
    static cleanup(documentID) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = this.instances.get(documentID);
            if (doc) {
                yield this.persist(documentID);
                this.instances.delete(documentID);
                logging_1.logger.info(`Cleaned up document ${documentID} from memory.`);
            }
        });
    }
    static markDirty(documentID) {
        this.dirtyDocs.add(documentID);
    }
    static getActiveDocs() {
        return this.instances;
    }
}
DocumentManager.instances = new Map();
DocumentManager.dirtyDocs = new Set();
DocumentManager.persistenceIntervalMs = 3 * 1000; // 3 seconds
exports.default = DocumentManager;
