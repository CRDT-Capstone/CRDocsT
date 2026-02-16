import { Request, Response, NextFunction } from "express";
import { logger } from "../logging";
import { APIError } from "@cr_docs_t/dts";

export const ErrorHandler = (err: APIError, req: Request, res: Response, next: NextFunction) => {
    try {
        if (res.headersSent) {
            return next(err);
        }
        const statusCode = err.status || 500;

        if (statusCode >= 500) {
            logger.error(`ErrorHandler -> ${err.message}`, { stack: err.stack });
        } else {
            // For 4xx errors, a simple warning is usually enough
            logger.warn(`ErrorHandler -> ${err.message}`);
        }

        res.status(statusCode).json({
            message: err.message || "Internal Server Error",
            error: err.message,
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    } catch (e) {
        logger.error(`ErrorHandler -> Failed to handle error: ${e instanceof Error ? e.message : e}`, {
            stack: e instanceof Error ? e.stack : undefined,
        });
        res.status(500).json({
            message: "An unexpected error occurred while handling the error.",
            error: e instanceof Error ? e.message : e,
            stack: process.env.NODE_ENV === "development" ? (e instanceof Error ? e.stack : undefined) : undefined,
        });
    }
};

export default ErrorHandler;
