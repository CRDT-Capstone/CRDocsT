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

const users: Map<String, WebSocket> = new Map();

const wss = new WebSocketServer({ server });

const centralCRDT = new FugueList(new StringTotalOrder(crypto.randomBytes(3).toString()), null);

wss.on("connection", (ws: WebSocket) => {
    console.log("New Web Socket Connection!");
    let id = crypto.randomBytes(5).toString("hex");
    while (users.has(id)) {
        id = crypto.randomBytes(16).toString("hex");
    }

    console.log(`User ${id} has joined`);
    users.set(id, ws);

    //need to broadcast the crdt to the new user, but the user has their own crdt
    ws.send(
        JSON.stringify({
            operation: Operation.JOIN,
            state: centralCRDT.state,
        }),
    );

    ws.on("message", (message: WebSocket.Data) => {
        console.log("A message has been sent");
        console.log("Message -> ", message.toString());

        const parsedMsg = JSON.parse(message.toString());
        // Update the central CRDT
        if (Array.isArray(parsedMsg)) {
            const msgs: FugueMessage<string>[] = parsedMsg;
            for (const msg of msgs) {
                centralCRDT.effect(msg);
            }
        } else {
            centralCRDT.effect(parsedMsg);
        }

        // Brodcast the message to all other users
        for (const [userId, userWS] of users) {
            if (userId === id) continue;
            userWS.send(message.toString());
        }
    });

    ws.on("close", () => {
        users.delete(id);
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
