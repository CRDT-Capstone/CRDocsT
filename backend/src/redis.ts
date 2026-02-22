import Redis from "ioredis";
import * as dotenv from "dotenv";
import { logger } from "./logging";

dotenv.config();

const db = parseInt(process.env.REDIS_DB || "") || 0;

export const redis = new Redis({
    username: process.env.REDIS_UNAME || "default",
    password: process.env.REDIS_PASSWORD!,
    host: process.env.REDIS_HOST!,
    db: db,
    port: Number(process.env.REDIS_PORT!),
});

redis.on("error", (err) => {
    logger.error("Redis connection error", { err });
    process.exit(1);
});

redis.on("ready", () => {
    logger.info("Connected to Redis successfully");
});
