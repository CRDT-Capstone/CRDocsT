import express, { } from "express";
import http from "http";
import * as dotenv from "dotenv";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";
import mongoose from "mongoose";
import {
    ContributorType,
    FugueJoinMessage,
    FugueLeaveMessage,
    FugueMessage,
    FugueMessageSerialzier,
    FugueMessageType,
    FugueRejectMessage,
    Operation,
} from "@cr_docs_t/dts";
import DocumentManager from "./managers/document";
import { DocumentRouter } from "./routes/documents";
import { clerkMiddleware } from "@clerk/express";
import { DocumentServices } from "./services/DocumentServices";
import { httpLogger, logger } from "./logging";
import { RedisService } from "./services/RedisService";
import { UserService } from "./services/UserService";

dotenv.config();
const mongoUri = process.env.MONGO_URI! as string;

mongoose
    .connect(mongoUri)
    .then(() => logger.info("Successfully connected to mongo db!"))
    .catch((e) => logger.info("error connecting to the db ", { error: e }));

const app = express();
app.use(express.json());
app.use(httpLogger);

const server = http.createServer(app);
const port = process.env.PORT || 5001;

const wss = new WebSocketServer({ server });
DocumentManager.startPersistenceInterval();

wss.on("connection", (ws: WebSocket) => {
    logger.info("New Web Socket Connection!");

    let currentDocId: string | undefined = undefined;
    let userIdentity: string | undefined = undefined;
    //userIdentity is the users email when the user is non anonymous and a random identifier for anonymous users
    // let documentUsers: WebSocket[];

    ws.on("message", async (message: Uint8Array<ArrayBuffer>) => {
        //There needs to be multiple message types
        //The first message type to be sent to the server whenever a client connects should be a join message
        //The join message should have the documentID ... that's pretty much it
        //We can add other things like possibly userId and all that jazz lateer
        //Then for every other message, we'd need to keep the documentID but everything else can be the same
        type FugueJoinMessageType<P> = Exclude<FugueMessageType<P>, FugueRejectMessage | FugueLeaveMessage>;

        const raw = FugueMessageSerialzier.deserialize(message);
        const isArray = Array.isArray(raw);
        const msgs: FugueJoinMessageType<string>[] = isArray
            ? (raw as FugueJoinMessageType<string>[])
            : ([raw] as FugueJoinMessageType<string>[]);

        if (msgs.length === 0) return;

        const firstMsg = msgs[0];
        logger.debug("First message", { firstMsg });
        currentDocId = firstMsg.documentID;
        //no email if the user is anonymous so we need an identifier.
        userIdentity = firstMsg.userIdentity || UserService.getIdentifierForAnonymousUser();

        const [hasAccessToDocument, accessType] = await DocumentServices.IsDocumentOwnerOrCollaborator(
            currentDocId,
            firstMsg.userIdentity,
        );
        if (!hasAccessToDocument) {
            logger.warn("User does not have access to document", { documentID: currentDocId, userIdentity: firstMsg.userIdentity });
            const rejectMessage: FugueRejectMessage = { operation: Operation.REJECT };
            const serializedRejectMessage = FugueMessageSerialzier.serialize([rejectMessage]);
            ws.send(serializedRejectMessage);
            ws.close(1000, "User does not have access");
            // 1000 -> normal expected socket connection closure
            return;
        }

        const doc = await DocumentManager.getOrCreate(currentDocId);
        doc.sockets.add(ws);

        if (firstMsg.operation === Operation.JOIN) {
            logger.info(`Join operation for doc id ${currentDocId}`);
            try {

                await RedisService.AddToCollaboratorsByDocumentId(currentDocId, userIdentity);
                const collaborators = await RedisService.getCollaboratorsByDocumentId(currentDocId);
                const joinMsg: FugueJoinMessage<string> = {
                    operation: Operation.JOIN,
                    documentID: currentDocId,
                    state: doc.crdt.state,
                    collaborators
                };

                const serializedJoinMessage = FugueMessageSerialzier.serialize<string>([joinMsg]);
                logger.info("Serialized Join Message size", { size: serializedJoinMessage.byteLength });
                ws.send(serializedJoinMessage); //send the state to the joining user

                const userJoinedNotification: FugueJoinMessage<string> = {
                    operation: Operation.JOIN,
                    documentID: currentDocId,
                    state: null,
                    userIdentity
                };

                const serialisedMsg = FugueMessageSerialzier.serialize<string>([userJoinedNotification]);

                doc.sockets.forEach((sock) => {
                    if (sock !== ws && sock.readyState === WebSocket.OPEN) sock.send(serialisedMsg);
                });


            } catch (err: any) {
                logger.error("Error handling join operation -> ", err);
            }
            return;
        }

        try {
            const ms = msgs as FugueMessage<string>[];
            logger.info(`Received ${msgs.length} operations for doc id ${currentDocId} from ${ms[0].replicaId}`);

            if (accessType === ContributorType.EDITOR) {
                //Ideally the editor would be disabled on the frontend but you can never be too sure.

                doc.crdt.effect(ms);
                DocumentManager.markDirty(currentDocId);
                const broadcastMsg = message; //relay the message as received
                doc.sockets.forEach((sock) => {
                    if (sock !== ws && sock.readyState === WebSocket.OPEN) sock.send(broadcastMsg);
                });
            }
        } catch (err: any) {
            logger.error("Error handling delete or insert operation", { err });
        }
    });

    ws.on("close", async () => {
        //remove the socket from the array
        // const index = documentUsers.indexOf(ws);
        // if (index !== -1) documentUsers.splice(index, 1);
        if (currentDocId) {
            await DocumentManager.removeUser(currentDocId, ws, userIdentity);
            currentDocId = undefined;
        }

        logger.info("Connection closed");
    });
});

let corsOptions: cors.CorsOptions = {
    origin: "*", // Allow requests from this origin
    methods: ["GET", "POST", "PUT"], // Allow specific methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
};
if (process.env.NODE_ENV === "production") {
    corsOptions = {
        origin: ["https://crdocst.surge.sh"],
        methods: ["GET", "POST", "PUT", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        preflightContinue: false,
        optionsSuccessStatus: 204,
    };
}

// Use the CORS middleware
app.use(cors(corsOptions));
app.use(clerkMiddleware()); //by default allows anonymous and authenticated users
app.use("/docs", DocumentRouter);

server.listen(port, () => {
    logger.info(`Listening on port ${port}. Let's go!`);
});
