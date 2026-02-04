import WebSocket from "ws";
import { logger } from "../logging";
import {
    ContributorType,
    FugueJoinMessage,
    FugueMessage,
    FugueMessageSerialzier,
    FugueMessageType,
    FugueRejectMessage,
    Operation,
} from "@cr_docs_t/dts";
import { DocumentServices } from "../services/DocumentServices";
import DocumentManager from "../managers/document";

export class WSService {
    private ws: WebSocket;
    private currentDocId: string | undefined;
    private email: string | undefined;

    constructor(ws: WebSocket) {
        this.ws = ws;
        this.currentDocId = undefined;
        this.email = undefined;

        logger.info("New WebSocket connection");
        this.initializeListeners();
        DocumentManager.startPersistenceInterval();
    }

    initializeListeners() {
        this.ws.on("message", this.handleMessage.bind(this));
        this.ws.on("close", this.handleClose.bind(this));
        this.ws.on("error", (err) => logger.error("WebSocket error", { err }));
    }

    async handleMessage(message: Uint8Array<ArrayBuffer>) {
        //There needs to be multiple message types
        //The first message type to be sent to the server whenever a client connects should be a join message
        //The join message should have the documentID ... that's pretty much it
        //We can add other things like possibly userId and all that jazz lateer
        //Then for every other message, we'd need to keep the documentID but everything else can be the same
        type FugueMessageTypeWithoutReject<P> = Exclude<FugueMessageType<P>, FugueRejectMessage>;

        const raw = FugueMessageSerialzier.deserialize(message);
        const isArray = Array.isArray(raw);
        const msgs: FugueMessageTypeWithoutReject<string>[] = isArray
            ? (raw as FugueMessageTypeWithoutReject<string>[])
            : ([raw] as FugueMessageTypeWithoutReject<string>[]);

        if (msgs.length === 0) return;

        const firstMsg = msgs[0];
        logger.debug("First message", { firstMsg });
        this.currentDocId = firstMsg.documentID;

        const [hasAccessToDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(
            this.currentDocId,
            firstMsg.email,
        );
        if (!hasAccessToDocument) {
            logger.warn("User does not have access to document", {
                documentID: this.currentDocId,
                email: firstMsg.email,
            });
            const rejectMessage: FugueRejectMessage = { operation: Operation.REJECT };
            const serializedRejectMessage = FugueMessageSerialzier.serialize([rejectMessage]);
            this.ws.send(serializedRejectMessage);
            this.ws.close(1000, "User does not have access");
            // 1000 -> normal expected socket connection closure
            return;
        }

        const doc = await DocumentManager.getOrCreate(this.currentDocId);
        doc.sockets.add(this.ws);

        if (firstMsg.operation === Operation.JOIN) {
            logger.info(`Join operation for doc id ${this.currentDocId}`);
            try {
                const joinMsg: FugueJoinMessage<string> = {
                    operation: Operation.JOIN,
                    documentID: this.currentDocId,
                    state: doc.crdt.state,
                };

                const serializedJoinMessage = FugueMessageSerialzier.serialize<string>([joinMsg]);
                logger.info("Serialized Join Message size", { size: serializedJoinMessage.byteLength });
                this.ws.send(serializedJoinMessage); //send the state to the joining user
            } catch (err: any) {
                logger.error("Error handling join operation -> ", err);
            }
            return;
        }

        try {
            const ms = msgs as FugueMessage<string>[];
            logger.info(`Received ${msgs.length} operations for doc id ${this.currentDocId} from ${ms[0].replicaId}`);

            if (accessType === ContributorType.EDITOR) {
                //Ideally the editor would be disabled on the frontend but you can never be too sure.

                doc.crdt.effect(ms);
                DocumentManager.markDirty(this.currentDocId);
                const broadcastMsg = message; //relay the message as received
                doc.sockets.forEach((sock) => {
                    if (sock !== this.ws && sock.readyState === WebSocket.OPEN) sock.send(broadcastMsg);
                });
            }
        } catch (err: any) {
            logger.error("Error handling delete or insert operation", { err });
        }
    }

    handleClose() {
        if (this.currentDocId) {
            DocumentManager.removeUser(this.currentDocId, this.ws);
            this.currentDocId = undefined;
        }

        logger.info("Connection closed");
    }
}
