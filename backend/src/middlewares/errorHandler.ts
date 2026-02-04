import { Request, Response, NextFunction } from "express";
import { logger } from "../logging";
import { APIError } from "@cr_docs_t/dts";

export const ErrorHandler = (err: APIError, req: Request, res: Response, next: NextFunction) => {
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
};

export default ErrorHandler;
