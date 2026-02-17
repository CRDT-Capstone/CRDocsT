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
} from "@cr_docs_t/dts";
import { DocumentServices } from "../services/DocumentServices";
import DocumentManager from "../managers/document";
import { UserService } from "./UserService";
import { RedisService } from "./RedisService";

export class WSService {
    private ws: WebSocket;
    private currentDocId: string | undefined;
    private email: string | undefined;
    // userIdentity is the users email when the user is non anonymous and a random identifier for anonymous users
    private userIdentity: string | undefined;

    constructor(ws: WebSocket) {
        this.ws = ws;
        this.currentDocId = undefined;
        this.email = undefined;
        this.userIdentity = undefined;

        logger.info("New WebSocket connection");
        this.initializeListeners();
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

        const raw = FugueMessageSerialzier.deserialize(message);
        const isArray = Array.isArray(raw);
        const msgs: FugueMutationMessageTypes[] = isArray
            ? (raw as FugueMutationMessageTypes[])
            : ([raw] as FugueMutationMessageTypes[]);

        if (msgs.length === 0) return;

        const firstMsg = msgs[0];
        logger.debug("First msg info", {
            OP: firstMsg.operation,
            DOC_ID: firstMsg.documentID,
            REP_ID: firstMsg.replicaId,
            USER_ID: firstMsg.userIdentity,
        });
        this.currentDocId = firstMsg.documentID;
        // FIX: Results in duplicate anon users when reloading
        this.userIdentity = firstMsg.userIdentity || UserService.getIdentifierForAnonymousUser();

        const [hasAccessToDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(
            this.currentDocId,
            firstMsg.userIdentity,
        );
        if (!hasAccessToDocument) {
            logger.warn("User does not have access to document", {
                documentID: this.currentDocId,
                userIdentity: firstMsg.userIdentity,
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
                await RedisService.AddToCollaboratorsByDocumentId(this.currentDocId, this.userIdentity!);
                const collaborators = await RedisService.getCollaboratorsByDocumentId(this.currentDocId);
                if (firstMsg.offlineChanges) {
                    const offlineChanges: FugueMessage<string>[] = firstMsg.offlineChanges.flat().map((change) => {
                        return {
                            operation: change.operation! as Operation.INSERT | Operation.DELETE,
                            position: change.position,
                            data: change.value ?? null,
                            replicaId: firstMsg.replicaId!,
                            documentID: firstMsg.documentID,
                            userIdentity: firstMsg.userIdentity
                        }
                    });
                    doc.crdt.effect(offlineChanges);
                    logger.info(`Current state -> ${doc.crdt.observe()}`);
                    if(this.currentDocId) DocumentManager.persist(this.currentDocId);

                    doc.sockets.forEach((sock) => {
                        if (sock !== this.ws && sock.readyState === WebSocket.OPEN) sock.send(FugueMessageSerialzier.serialize(offlineChanges));
                    });

                }
                const joinMsg: FugueJoinMessage = {
                    operation: Operation.JOIN,
                    documentID: this.currentDocId,
                    state: doc.crdt.save(),
                    collaborators,
                    offlineChanges: firstMsg.offlineChanges
                };

                const serializedJoinMessage = FugueMessageSerialzier.serialize([joinMsg]);
                logger.info("Serialized Join Message size", { size: serializedJoinMessage.byteLength });
                this.ws.send(serializedJoinMessage); //send the state to the joining user

                const userJoinedNotification: FugueJoinMessage = {
                    operation: Operation.JOIN,
                    documentID: this.currentDocId,
                    state: null,
                    userIdentity: this.userIdentity,
                };

                const serialisedMsg = FugueMessageSerialzier.serialize([userJoinedNotification]);

                doc.sockets.forEach((sock) => {
                    if (sock !== this.ws && sock.readyState === WebSocket.OPEN) sock.send(serialisedMsg);
                });
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
        if (this.currentDocId) {
            await DocumentManager.removeUser(this.currentDocId, this.ws, this.userIdentity);
            this.currentDocId = undefined;
        }

        logger.info("Connection closed");
    }
}
