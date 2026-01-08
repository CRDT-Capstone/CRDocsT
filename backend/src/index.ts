import express, { Request, Response } from "express";
import http from "http";
import * as dotenv from "dotenv";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";
import mongoose from "mongoose";
import crypto from "crypto";
import { FugueJoinMessage, FugueList, FugueMessage, Operation, StringTotalOrder } from "@cr_docs_t/dts";
import { RedisService } from "./services/RedisService";
import DocumentManager from "./managers/document";

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

const DocumentIDToUserMap: Map<String, WebSocket[]> = new Map();
const wss = new WebSocketServer({ server });
DocumentManager.startPersistenceInterval();

wss.on("connection", (ws: WebSocket) => {
    console.log("New Web Socket Connection!");

    let currentDocId: string | undefined = undefined;
    // let documentUsers: WebSocket[];

    ws.on("message", async (message: WebSocket.Data) => {
        console.log("A message has been sent");

        //There needs to be multiple message types
        //The first message type to be sent to the server whenever a client connects should be a join message
        //The join message should have the documentID ... that's pretty much it
        //We can add other things like possibly userId and all that jazz lateer
        //Then for every other message, we'd need to keep the documentID but everything else can be the same

        const handleOneMessage = async (parsedMsg: FugueMessage<string>) => {
            const { documentID, operation } = parsedMsg;
            currentDocId = documentID;

            const doc = await DocumentManager.getOrCreate(documentID);
            doc.sockets.add(ws);

            // if (!DocumentIDToUserMap.has(documentID)) DocumentIDToUserMap.set(documentID, []);
            //
            // documentUsers = DocumentIDToUserMap.get(documentID)!;
            // if (!documentUsers.includes(ws)) documentUsers.push(ws);

            switch (operation) {
                case Operation.JOIN:
                    try {
                        // const CRDTState = await RedisService.getCRDTStateByDocumentID(documentID);
                        // if (CRDTState) {
                        //     const message: FugueJoinMessage<string> = {
                        //         state: CRDTState,
                        //     };
                        //
                        //     ws.send(JSON.stringify(message));
                        // } else {
                        //     console.log("Unable to retrieve CRDT State from redis");
                        // }
                        const joinMsg: FugueJoinMessage<string> = {
                            state: doc.crdt.state,
                        };

                        ws.send(JSON.stringify(joinMsg));
                    } catch (err: any) {
                        console.log("Error handling join operation -> ", err);
                    }

                    break;

                case Operation.DELETE:
                case Operation.INSERT:
                    try {
                        // const CRDT: FugueList<string> = new FugueList(
                        //     new StringTotalOrder(crypto.randomBytes(3).toString()),
                        //     null,
                        //     documentID,
                        // );
                        // CRDT.effect(parsedMsg);
                        // const newCRDTState = CRDT.state;
                        // await RedisService.updateCRDTStateByDocumentID(documentID, JSON.stringify(newCRDTState));
                        //
                        // for (const socket of documentUsers!) {
                        //     if (socket !== ws) socket.send(message); //relay the message to the document users
                        // }
                        doc.crdt.effect(parsedMsg);
                        DocumentManager.markDirty(documentID);
                        DocumentManager.persist(documentID); //async persistence

                        const broadcastMsg = JSON.stringify(parsedMsg);
                        doc.sockets.forEach((sock) => {
                            if (sock !== ws && sock.readyState === WebSocket.OPEN) sock.send(broadcastMsg);
                        });
                        break;
                    } catch (err: any) {
                        console.log("Error handling delete or insert operation -> ", err);
                    }
            }
        };

        const parsedMsg: FugueMessage<string> | FugueMessage<string>[] = JSON.parse(message.toString());
        if (Array.isArray(parsedMsg)) {
            for (const singleMsg of parsedMsg) {
                await handleOneMessage(singleMsg);
            }
        } else {
            await handleOneMessage(parsedMsg);
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

const corsOptions = {
    origin: "*", // Allow requests from this origin
    methods: ["GET", "POST", "PUT"], // Allow specific methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
};

// Use the CORS middleware
app.use(cors(corsOptions));

server.listen(port, () => {
    console.log(`Listening on port ${port}. Let's go!`);
});
