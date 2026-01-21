import express, {} from "express";
import http from "http";
import * as dotenv from "dotenv";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";
import mongoose from "mongoose";
import { FugueJoinMessage, FugueMessage, FugueMessageSerialzier, FugueMessageType, Operation } from "@cr_docs_t/dts";
import DocumentManager from "./managers/document";
import { DocumentRouter } from "./routes/documents";

dotenv.config();
const mongoUri = process.env.MONGO_URI! as string;

mongoose
    .connect(mongoUri)
    .then(() => console.log("Successfully connected to mongo db!"))
    .catch((e) => console.log("error connecting to the db -> ", e));

const app = express();
app.use(express.json());

const server = http.createServer(app);
const port = process.env.PORT || 5001;

const wss = new WebSocketServer({ server });
DocumentManager.startPersistenceInterval();

wss.on("connection", (ws: WebSocket) => {
    console.log("New Web Socket Connection!");

    let currentDocId: string | undefined = undefined;
    // let documentUsers: WebSocket[];

    ws.on("message", async (message: Uint8Array<ArrayBuffer>) => {
        //There needs to be multiple message types
        //The first message type to be sent to the server whenever a client connects should be a join message
        //The join message should have the documentID ... that's pretty much it
        //We can add other things like possibly userId and all that jazz lateer
        //Then for every other message, we'd need to keep the documentID but everything else can be the same

        const raw = FugueMessageSerialzier.deserialize(message);
        const isArray = Array.isArray(raw);
        const msgs: FugueMessageType<string>[] = isArray
            ? (raw as FugueMessageType<string>[])
            : ([raw] as FugueMessageType<string>[]);

        if (msgs.length === 0) return;

        const firstMsg = msgs[0];
        currentDocId = firstMsg.documentID;
        const doc = await DocumentManager.getOrCreate(currentDocId);
        doc.sockets.add(ws);

        if (firstMsg.operation === Operation.JOIN) {
            console.log(`Join operation for doc id ${currentDocId}`);
            try {
                const joinMsg: FugueJoinMessage<string> = {
                    operation: Operation.JOIN,
                    documentID: currentDocId,
                    state: doc.crdt.state,
                };

                const serializedJoinMessage = FugueMessageSerialzier.serialize<string>([joinMsg]);
                console.log("Serialized Join Message -> ", serializedJoinMessage);
                console.log("Serialized Join Message size -> ", serializedJoinMessage.byteLength);
                ws.send(serializedJoinMessage); //send the state to the joining user
            } catch (err: any) {
                console.log("Error handling join operation -> ", err);
            }
            return;
        }

        try {
            const ms = msgs as FugueMessage<string>[];
            console.log(`Received ${msgs.length} operations for doc id ${currentDocId} from ${ms[0].replicaId}`);
            doc.crdt.effect(ms);
            DocumentManager.markDirty(currentDocId);
            const broadcastMsg = message; //relay the message as received
            doc.sockets.forEach((sock) => {
                if (sock !== ws && sock.readyState === WebSocket.OPEN) sock.send(broadcastMsg);
            });
        } catch (err: any) {
            console.log("Error handling delete or insert operation -> ", err);
        }
    });

    ws.on("close", () => {
        //remove the socket from the array
        // const index = documentUsers.indexOf(ws);
        // if (index !== -1) documentUsers.splice(index, 1);
        if (currentDocId) {
            DocumentManager.removeUser(currentDocId, ws);
            currentDocId = undefined;
        }

        console.log("Connection closed");
    });
});

let corsOptions = {
    origin: "*", // Allow requests from this origin
    methods: ["GET", "POST", "PUT"], // Allow specific methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
};
if (process.env.NODE_ENV === "production") {
    corsOptions = {
        origin: "https://crdocst.surge.sh/", // Production frontend URL
        methods: ["GET", "POST", "PUT"],
        allowedHeaders: ["Content-Type", "Authorization"],
    };
}

// Use the CORS middleware
app.use(cors(corsOptions));
app.use("/docs", DocumentRouter);

server.listen(port, () => {
    console.log(`Listening on port ${port}. Let's go!`);
});
