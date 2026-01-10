import Redis from 'ioredis';
import * as dotenv from "dotenv";

dotenv.config();

export const redis = new Redis({
    username: 'default',
    password: process.env.REDIS_PASSWORD!,
    host: process.env.REDIS_HOST!,
    db:0,
    port: Number(process.env.REDIS_PORT!)
});


redis.on('error', (err)=>{
    console.error('Redis connection error -> ', err);
});

redis.on('ready', ()=>{
    console.log('Connected to Redis successfully');
});


