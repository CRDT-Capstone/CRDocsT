"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const logging_1 = require("../logging");
const ErrorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;
    if (statusCode >= 500) {
        logging_1.logger.error(`ErrorHandler -> ${err.message}`, { stack: err.stack });
    }
    else {
        // For 4xx errors, a simple warning is usually enough
        logging_1.logger.warn(`ErrorHandler -> ${err.message}`);
    }
    res.status(statusCode).json({
        message: err.message || "Internal Server Error",
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};
exports.ErrorHandler = ErrorHandler;
exports.default = exports.ErrorHandler;
