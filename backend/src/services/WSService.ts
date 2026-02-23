import WebSocket from "ws";
import { logger } from "../logging";
import {
    ContributorType,
    FugueJoinMessage,
    FugueLeaveMessage,
    FugueMessage,
    FugueMessageSerialzier,
    FugueMessageType,
    FugueRejectMessage,
    Operation,
    FugueMutationMessageTypes,
    FugueUserJoinMessage,
    FTree,
    FugueStateSerializer,
    BaseFugueMessage,
    operationToString,
} from "@cr_docs_t/dts";
import { DocumentServices } from "../services/DocumentServices";
import DocumentManager from "../managers/document";
import { UserService } from "./UserService";
import { RedisService } from "./RedisService";

export class WSService {
    private ws: WebSocket;
    private currentDocId: string | undefined;
    // userIdentity is the users email when the user is non anonymous and a random identifier for anonymous users
    private userIdentity: string | undefined;
    private operationBuffer: FugueMessage[];

    private intervalId;

    MAX_BUFFER_SIZE = 100; //random value
    BUFFER_TIME = 500;

    constructor(ws: WebSocket) {
        this.ws = ws;
        this.currentDocId = undefined;
        this.userIdentity = undefined;
        this.operationBuffer = [];

        this.intervalId = setInterval(this.flushToRedis, this.BUFFER_TIME);

        logger.info("New WebSocket connection");
        this.initializeListeners();
    }

    initializeListeners() {
        this.ws.on("message", this.handleMessage.bind(this));
        this.ws.on("close", this.handleClose.bind(this));
        this.ws.on("error", (err) => logger.error("WebSocket error", { err }));
    }

    private send(msg: BaseFugueMessage | BaseFugueMessage[]) {
        const serializedMsg = FugueMessageSerialzier.serialize(Array.isArray(msg) ? msg : [msg]);
        this.ws.send(serializedMsg);
    }

    private async bufferOperations(ops: FugueMessage[]){
        /*
        Implementing a write behind cache but with redis
        */
        if(!this.currentDocId) return;

        this.operationBuffer.push(...ops);
        if(this.operationBuffer.length > 100){
            await RedisService.bufferCRDTOperationsByDocumentID(this.currentDocId, this.operationBuffer);
            this.operationBuffer = [];
        }
    }

    private async flushToRedis(){
        if(!this.currentDocId || this.operationBuffer.length === 0) return;
        await RedisService.bufferCRDTOperationsByDocumentID(this.currentDocId, this.operationBuffer);
        this.operationBuffer = [];
    }

    private async getOpHistory(){
        
    }

    private stopFlush(){
        clearInterval(this.intervalId);
    }

    async handleMessage(message: Uint8Array<ArrayBuffer>) {
        //There needs to be multiple message types
        //The first message type to be sent to the server whenever a client connects should be a join message
        //The join message should have the documentID ... that's pretty much it
        //We can add other things like possibly userId and all that jazz lateer
        //Then for every other message, we'd need to keep the documentID but everything else can be the same

        const raw = FugueMessageSerialzier.deserialize(message);
        const isArray = Array.isArray(raw);
        const msgs: BaseFugueMessage[] = isArray ? raw : [raw];

        if (msgs.length === 0) return;

        const firstMsg = msgs[0];
        logger.debug("First msg info", {
            OP: operationToString(firstMsg.operation),
            DOC_ID: firstMsg.documentID,
            REP_ID: firstMsg.replicaId,
            USER_ID: firstMsg.userIdentity,
            msg: firstMsg,
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
            const rejectMessage: FugueRejectMessage = {
                userIdentity: firstMsg.userIdentity,
                replicaId: firstMsg.replicaId,
                operation: Operation.REJECT,
                documentID: firstMsg.documentID,
                reason: "User does not have access",
            };
            this.send(rejectMessage);
            this.ws.close(1000, "User does not have access");
            // 1000 -> normal expected socket connection closure
            return;
        }

        const doc = await DocumentManager.getOrCreate(this.currentDocId);
        await DocumentManager.addUser(doc, this.ws, firstMsg.userIdentity);

        const sendUserJoin = async (userIdentity: string, currentDocId: string) => {
            const collaborators = await RedisService.getCollaboratorsByDocumentId(currentDocId);
            const userJoinedNotification: FugueUserJoinMessage = {
                operation: Operation.USER_JOIN,
                userIdentity: userIdentity,
                documentID: currentDocId,
                replicaId: firstMsg.replicaId,
                collaborators,
            };

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
                const joinMsg: FugueJoinMessage = {
                    userIdentity: this.userIdentity,
                    replicaId: doc.crdt.replicaId(),
                    operation: Operation.INITIAL_SYNC,
                    documentID: this.currentDocId,
                    state: doc.crdt.save(),
                    bufferedOperations: undefined,
                };

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
                this.bufferOperations(ms);
                const broadcastMsg = message; //relay the message as received
                doc.sockets.forEach((sock) => {
                    if (sock !== this.ws && sock.readyState === WebSocket.OPEN) sock.send(broadcastMsg);
                });
            }
        } catch (err) {
            logger.error("Error handling delete or insert operation", { err });
        }
    }

    async handleClose() {
        logger.info("About to close connection");
        logger.info(`Current doc id -> ${this.currentDocId}`);
        if (this.currentDocId) {
            await DocumentManager.removeUser(this.currentDocId, this.ws, this.userIdentity);
            this.currentDocId = undefined;
        }
        this.stopFlush();
        logger.info("Connection closed");
    }
}
