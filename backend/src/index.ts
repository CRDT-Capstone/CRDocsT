import express, {} from "express";
import http from "http";
import * as dotenv from "dotenv";
import cors from "cors";
import WebSocket, { WebSocketServer } from "ws";
import mongoose from "mongoose";
import { DocumentRouter } from "./routes/documents";
import { clerkMiddleware } from "@clerk/express";
import { httpLogger, logger } from "./logging";
import { WSService } from "./services/WSService";
import ErrorHandler from "./middlewares/errorHandler";
import DocumentManager from "./managers/document";
import { redis } from "./redis";
import { ProjectRouter } from "./routes/project";

dotenv.config();

process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception", { message: err.message, stack: err.stack });
    process.exit(1);
});

process.on("unhandledRejection", (reason: any) => {
    logger.error("Unhandled Promise Rejection", {
        reason: reason?.message || reason,
        stack: reason?.stack,
    });
    process.exit(1);
});

const mongoUri = process.env.MONGO_URI! as string;

mongoose
    .connect(mongoUri)
    .then(() => logger.info("Successfully connected to mongo db!"))
    .catch((e) => {
        logger.info("error connecting to the db ", { error: e });
        process.exit(1);
    });

const app = express();
app.use(express.json());
app.use(httpLogger);

const server = http.createServer(app);
const port = process.env.PORT || 5001;

const wss = new WebSocketServer({ server });
DocumentManager.startPersistenceInterval();

wss.on("connection", (ws: WebSocket) => {
    try {
        new WSService(ws);
    } catch (err) {
        logger.error("WebSocket connection failed", { err });
        ws.terminate();
    }
});

let corsOptions: cors.CorsOptions = {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
};
if (process.env.NODE_ENV === "production") {
    corsOptions = {
        origin: ["https://crdocst.surge.sh"],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    };
}

// Use the CORS middleware
app.use(cors(corsOptions));
app.use(clerkMiddleware()); //by default allows anonymous and authenticated users
app.use("/docs", DocumentRouter);
app.use("/projects", ProjectRouter);
app.use(ErrorHandler);

server.listen(port, () => {
    logger.info(`Listening on port ${port}. Let's go!`);
});

process.on("SIGTERM", () => {
    logger.info("Cleaning up before shutdown...");
    server.close(() => {
        mongoose.connection.close();
        redis.quit();
        process.exit(0);
    });
});
