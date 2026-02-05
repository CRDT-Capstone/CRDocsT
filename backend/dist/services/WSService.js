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
exports.WSService = void 0;
const ws_1 = __importDefault(require("ws"));
const logging_1 = require("../logging");
const dts_1 = require("@cr_docs_t/dts");
const DocumentServices_1 = require("../services/DocumentServices");
const document_1 = __importDefault(require("../managers/document"));
class WSService {
    constructor(ws) {
        this.ws = ws;
        this.currentDocId = undefined;
        this.email = undefined;
        logging_1.logger.info("New WebSocket connection");
        this.initializeListeners();
        document_1.default.startPersistenceInterval();
    }
    initializeListeners() {
        this.ws.on("message", this.handleMessage.bind(this));
        this.ws.on("close", this.handleClose.bind(this));
        this.ws.on("error", (err) => logging_1.logger.error("WebSocket error", { err }));
    }
    handleMessage(message) {
        return __awaiter(this, void 0, void 0, function* () {
            const raw = dts_1.FugueMessageSerialzier.deserialize(message);
            const isArray = Array.isArray(raw);
            const msgs = isArray
                ? raw
                : [raw];
            if (msgs.length === 0)
                return;
            const firstMsg = msgs[0];
            logging_1.logger.debug("First message", { firstMsg });
            this.currentDocId = firstMsg.documentID;
            const [hasAccessToDocument, accessType] = yield DocumentServices_1.DocumentServices.IsDocumentOwnerOrCollaborator(this.currentDocId, firstMsg.email);
            if (!hasAccessToDocument) {
                logging_1.logger.warn("User does not have access to document", {
                    documentID: this.currentDocId,
                    email: firstMsg.email,
                });
                const rejectMessage = { operation: dts_1.Operation.REJECT };
                const serializedRejectMessage = dts_1.FugueMessageSerialzier.serialize([rejectMessage]);
                this.ws.send(serializedRejectMessage);
                this.ws.close(1000, "User does not have access");
                // 1000 -> normal expected socket connection closure
                return;
            }
            const doc = yield document_1.default.getOrCreate(this.currentDocId);
            doc.sockets.add(this.ws);
            if (firstMsg.operation === dts_1.Operation.JOIN) {
                logging_1.logger.info(`Join operation for doc id ${this.currentDocId}`);
                try {
                    const joinMsg = {
                        operation: dts_1.Operation.JOIN,
                        documentID: this.currentDocId,
                        state: doc.crdt.state,
                    };
                    const serializedJoinMessage = dts_1.FugueMessageSerialzier.serialize([joinMsg]);
                    logging_1.logger.info("Serialized Join Message size", { size: serializedJoinMessage.byteLength });
                    this.ws.send(serializedJoinMessage); //send the state to the joining user
                }
                catch (err) {
                    logging_1.logger.error("Error handling join operation -> ", err);
                }
                return;
            }
            try {
                const ms = msgs;
                logging_1.logger.info(`Received ${msgs.length} operations for doc id ${this.currentDocId} from ${ms[0].replicaId}`);
                if (accessType === dts_1.ContributorType.EDITOR) {
                    //Ideally the editor would be disabled on the frontend but you can never be too sure.
                    doc.crdt.effect(ms);
                    document_1.default.markDirty(this.currentDocId);
                    const broadcastMsg = message; //relay the message as received
                    doc.sockets.forEach((sock) => {
                        if (sock !== this.ws && sock.readyState === ws_1.default.OPEN)
                            sock.send(broadcastMsg);
                    });
                }
            }
            catch (err) {
                logging_1.logger.error("Error handling delete or insert operation", { err });
            }
        });
    }
    handleClose() {
        if (this.currentDocId) {
            document_1.default.removeUser(this.currentDocId, this.ws);
            this.currentDocId = undefined;
        }
        logging_1.logger.info("Connection closed");
    }
}
exports.WSService = WSService;
