"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const dotenv = __importStar(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const mongoose_1 = __importDefault(require("mongoose"));
const documents_1 = require("./routes/documents");
const express_2 = require("@clerk/express");
const logging_1 = require("./logging");
const WSService_1 = require("./services/WSService");
const errorHandler_1 = __importDefault(require("./middlewares/errorHandler"));
dotenv.config();
const mongoUri = process.env.MONGO_URI;
mongoose_1.default
    .connect(mongoUri)
    .then(() => logging_1.logger.info("Successfully connected to mongo db!"))
    .catch((e) => logging_1.logger.info("error connecting to the db ", { error: e }));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(logging_1.httpLogger);
const server = http_1.default.createServer(app);
const port = process.env.PORT || 5001;
const wss = new ws_1.WebSocketServer({ server });
wss.on("connection", (ws) => {
    new WSService_1.WSService(ws);
});
let corsOptions = {
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
};
if (process.env.NODE_ENV === "production") {
    corsOptions = {
        origin: ["https://crdocst.surge.sh"],
        methods: ["GET", "POST", "PUT", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    };
}
// Use the CORS middleware
app.use((0, cors_1.default)(corsOptions));
app.use((0, express_2.clerkMiddleware)()); //by default allows anonymous and authenticated users
app.use("/docs", documents_1.DocumentRouter);
app.use(errorHandler_1.default);
server.listen(port, () => {
    logging_1.logger.info(`Listening on port ${port}. Let's go!`);
});
