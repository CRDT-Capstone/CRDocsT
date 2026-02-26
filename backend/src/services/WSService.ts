import WebSocket from "ws";
import { logger } from "../logging";
import {
    ContributorType,
    FugueJoinMessage,
    FugueMessage,
    FugueMessageSerialzier,
    FugueRejectMessage,
    Operation,
    FugueUserJoinMessage,
    BaseFugueMessage,
    operationToString,
    makeFugueMessage,
    PresenceMessageSerializer,
    BasePresenceMessage,
    PresenceMessageType,
    Seralizer,
} from "@cr_docs_t/dts";
import { DocumentServices } from "../services/DocumentServices";
import DocumentManager from "../managers/document";
import { RedisService } from "./RedisService";
import { BaseMessage, MessageType } from "@cr_docs_t/dts";

export class WSService {
    private ws: WebSocket;
    private currentDocId: string | undefined;
    // userIdentity is the users email when the user is non anonymous and a random identifier for anonymous users
    private userIdentity: string | undefined;

    constructor(ws: WebSocket) {
        this.ws = ws;
        this.currentDocId = undefined;
        this.userIdentity = undefined;

        logger.info("New WebSocket connection");
        this.initializeListeners();
    }

    initializeListeners() {
        this.ws.on("message", this.handleMessage.bind(this));
        this.ws.on("close", this.handleClose.bind(this));
        this.ws.on("error", (err) => logger.error("WebSocket error", { err }));
    }

    private send(msgs: BaseMessage | BaseMessage[]) {
        const msgsArray = Array.isArray(msgs) ? msgs : [msgs];
        const bytes = this.serialize(msgsArray);
        this.ws.send(bytes);
    }

    private serialize(msgs: BaseMessage | BaseMessage[]): Uint8Array {
        return Seralizer.serialize(msgs);
    }

    private deserialize(bytes: Uint8Array): BaseFugueMessage[] | BasePresenceMessage[] {
        return Seralizer.deserialize(bytes);
    }

    async handleMessage(message: Uint8Array<ArrayBuffer>) {
        try {
            const raw = this.deserialize(message);

            if (raw.length === 0) {
                logger.warn("Received empty message");
                return;
            }

            const firstMsg = raw[0];
            switch (firstMsg.msgType) {
                case MessageType.FUGUE:
                    return this.handleFugueMessages(raw as BaseFugueMessage[]);
                case MessageType.PRESENCE:
                    return this.handlePresenceMessages(raw as BasePresenceMessage[]);
                default:
                    // Exhastive check to make sure we handled all message types
                    const _exhaustiveCheck: never = firstMsg;
                    return _exhaustiveCheck;
            }
        } catch (err) {
            logger.error("Failed to handle message", { err });
            throw err;
        }
    }

    async handleFugueMessages(msgs: BaseFugueMessage[]) {
        //There needs to be multiple message types
        //The first message type to be sent to the server whenever a client connects should be a join message
        //The join message should have the documentID ... that's pretty much it
        //We can add other things like possibly userId and all that jazz lateer
        //Then for every other message, we'd need to keep the documentID but everything else can be the same
        if (msgs.length === 0) return;

        const firstMsg = msgs[0];
        logger.debug("First msg info", {
            OP: operationToString(firstMsg.operation),
            DOC_ID: firstMsg.documentID,
            REP_ID: firstMsg.replicaId,
            USER_ID: firstMsg.userIdentity,
        });
        this.currentDocId = firstMsg.documentID;
        this.userIdentity = firstMsg.userIdentity;

        const { hasAccess, contributorType: accessType } = await DocumentServices.IsDocumentOwnerOrCollaborator(
            this.currentDocId,
            firstMsg.userIdentity,
        );
        logger.debug("Has access to document", { hasAccessToDocument: hasAccess, accessType });

        if (!hasAccess) {
            logger.warn("User does not have access to document", {
                documentID: this.currentDocId,
                userIdentity: firstMsg.userIdentity,
            });
            const rejectMessage = makeFugueMessage<FugueRejectMessage>({
                userIdentity: firstMsg.userIdentity,
                replicaId: firstMsg.replicaId,
                operation: Operation.REJECT,
                documentID: firstMsg.documentID,
                reason: "User does not have access",
            });
            this.send(rejectMessage);
            this.ws.close(1000, "User does not have access");
            // 1000 -> normal expected socket connection closure
            return;
        }

        const doc = await DocumentManager.getOrCreate(this.currentDocId);
        await DocumentManager.addUser(doc, this.ws, firstMsg.userIdentity);

        const sendUserJoin = async (userIdentity: string, currentDocId: string) => {
            const collaborators = await RedisService.getCollaboratorsByDocumentId(currentDocId);
            const userJoinedNotification = makeFugueMessage<FugueUserJoinMessage>({
                operation: Operation.USER_JOIN,
                userIdentity: userIdentity,
                documentID: currentDocId,
                replicaId: firstMsg.replicaId,
                collaborators,
            });

            const serialisedMsg = FugueMessageSerialzier.serialize([userJoinedNotification]);
            doc.sockets.forEach((sock) => {
                if (sock.readyState === WebSocket.OPEN) sock.send(serialisedMsg);
            });
        };

        if (firstMsg.operation === Operation.USER_JOIN) {
            await sendUserJoin(this.userIdentity!, this.currentDocId!);
            return;
        }

        if (firstMsg.operation === Operation.INITIAL_SYNC) {
            logger.info(`Join operation for doc id ${this.currentDocId}`);
            try {
                const joinMsg = makeFugueMessage<FugueJoinMessage>({
                    userIdentity: this.userIdentity,
                    replicaId: doc.crdt.replicaId(),
                    operation: Operation.INITIAL_SYNC,
                    documentID: this.currentDocId,
                    state: doc.crdt.save(),
                });

                this.send(joinMsg); // send the join message to the joining user

                await sendUserJoin(this.userIdentity!, this.currentDocId!);
            } catch (err: any) {
                logger.error("Error handling join operation -> ", err);
            }
            return;
        }

        try {
            const ms = msgs as FugueMessage[];
            logger.info(`Received ${msgs.length} operations for doc id ${this.currentDocId} from ${ms[0].replicaId}`);

            if (accessType === ContributorType.EDITOR) {
                //Ideally the editor would be disabled on the frontend but you can never be too sure.

                logger.debug(
                    `Effecting ${ms.length} on server crdt with id ${doc.crdt.replicaId()} from ${ms[0].replicaId}`,
                    { firstMsg: { OP: ms[0].operation, DATA: ms[0].data } },
                );
                doc.crdt.effect(ms);
                DocumentManager.markDirty(this.currentDocId);
                doc.send(this.serialize(ms), this.ws);
                // doc.sockets.forEach((sock) => {
                //     if (sock !== this.ws && sock.readyState === WebSocket.OPEN) sock.send(broadcastMsg);
                // });
            }
        } catch (err) {
            logger.error("Error handling delete or insert operation", { err });
        }
    }

    async handlePresenceMessages(msgs: BasePresenceMessage[]) {
        const handleMsgType = async (msg: BasePresenceMessage) => {
            const { documentID } = msg;
            const doc = await DocumentManager.getOrCreate(documentID);
            logger.debug("Received presence message", { msg });
            switch (msg.type) {
                case PresenceMessageType.CURSOR:
                    // Propagate the cursor information to the rest of the members of the
                    // document
                    doc.send(this.serialize(msg), this.ws);
                    break;
                case PresenceMessageType.SELECTION:
                    break;
            }
        };

        if (msgs.length === 0) return;

        for (const msg of msgs) {
            await handleMsgType(msg);
        }
    }

    async handleClose() {
        logger.info("About to close connection");
        logger.info(`Current doc id -> ${this.currentDocId}`);
        if (this.currentDocId) {
            await DocumentManager.removeUser(this.currentDocId, this.ws, this.userIdentity);
            this.currentDocId = undefined;
        }

        logger.info("Connection closed");
    }
}
