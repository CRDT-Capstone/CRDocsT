import express, { Request, Response } from "express";
import http from "http";
import * as dotenv from "dotenv";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";
import mongoose from "mongoose";
import crypto from "crypto";
import { FugueList, FugueMessage, Operation, StringTotalOrder } from "@cr_docs_t/dts";



dotenv.config();
// const mongoUri = process.env.MONGO_URI! as string;

// mongoose
// 	.connect(mongoUri)
// 	.then(() => console.log("Successfully connected to mongo db!"))
// 	.catch((e) => console.log("error connecting to the db -> ", e));

const app = express();
app.use(express.json());

const server = http.createServer(app);
const port = process.env.PORT || 5001;


const DocumentIDToUserMap: Map<String, WebSocket[]> = new Map();
const wss = new WebSocketServer({ server });

const centralCRDT = new FugueList(new StringTotalOrder(crypto.randomBytes(3).toString()), null);

console.log(JSON.stringify(centralCRDT));
wss.on("connection", (ws: WebSocket) => {
    console.log("New Web Socket Connection!");

    ws.on("message", (message: WebSocket.Data) => {
        console.log("A message has been sent");
        console.log("Message -> ", message.toString());

        //There needs to be multiple message types
        //The first message type to be sent to the server whenever a client connects should be a join message
        //The join message should have the documentID ... that's pretty much it
        //We can add other things like possibly userId and all that jazz lateer
        //Then for every other message, we'd need to keep the documentID but everything else can be the same

        const parsedMsg = JSON.parse(message.toString());
        const { documentID } = parsedMsg;

        if(!DocumentIDToUserMap.has(documentID)) DocumentIDToUserMap.set(documentID, []);
        
        const documentUsers = DocumentIDToUserMap.get(documentID);
        if(!documentUsers!.find(socket => socket === ws)) documentUsers!.push(ws);

        //if the message type is a join message 
        //get the CRDT and push it to the user

        // Brodcast the message to all other users

    });

    ws.on("close", () => {
        //remove the socket from the map
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
