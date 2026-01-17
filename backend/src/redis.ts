import Redis from "ioredis";
import * as dotenv from "dotenv";

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
    console.error("Redis connection error -> ", err);
});

redis.on("ready", () => {
    console.log("Connected to Redis successfully");
});
