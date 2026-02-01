import winston from "winston";
import morgan from "morgan";
import "winston-daily-rotate-file";

const { combine, timestamp, printf, json, colorize, errors, metadata } = winston.format;

const isProduction = process.env.NODE_ENV === "production";

const colors = {
    fatal: "red",
    error: "red",
    warn: "yellow",
    info: "blue",
    debug: "white",
    trace: "magenta",
};
winston.addColors(colors);

const devFormat = combine(
    colorize({ all: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    metadata({ fillExcept: ["message", "level", "timestamp", "stack"] }),
    printf((info) => {
        const { timestamp, level, message, stack } = info;
        const metadata = (info.metadata as Record<string, any>) || {};

        const metaString = Object.keys(metadata).length ? `\n${JSON.stringify(metadata, null, 2)}` : "";

        return `[${timestamp}] ${level}: ${message}${stack ? `\n${stack}` : ""}${metaString}`;
    }),
);

const prodFormat = combine(
    errors({ stack: true }),
    timestamp(),
    metadata(), // Wraps extra arguments into a "metadata" field
    json(), // Pure JSON for log aggregators
);

const transports: winston.transport[] = [
    new winston.transports.Console({
        format: isProduction ? prodFormat : devFormat,
    }),
];

if (isProduction) {
    transports.push(
        new winston.transports.DailyRotateFile({
            filename: "logs/combined-%DATE%.log",
            datePattern: "YYYY-MM-DD",
            maxFiles: "14d", // Keep logs for 14 days
            format: prodFormat,
        }),
    );
}

const logger = winston.createLogger({
    levels: { fatal: 0, error: 1, warn: 2, info: 3, debug: 4, trace: 5 },
    level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
    transports,
    // Automatically catch unhandled issues
    exceptionHandlers: transports,
    rejectionHandlers: transports,
});

const httpLogger = morgan(
    (tokens, req, res) => {
        return JSON.stringify({
            method: tokens.method(req, res),
            url: tokens.url(req, res),
            status: Number(tokens.status(req, res)),
            contentLength: tokens.res(req, res, "content-length"),
            responseTime: Number(tokens["response-time"](req, res)),
        });
    },
    {
        stream: {
            write: (message) => logger.info("HTTP Request", JSON.parse(message)),
        },
    },
);

export { logger, httpLogger };
