"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleErrorAsAPIError = void 0;
const dts_1 = require("@cr_docs_t/dts");
const handleErrorAsAPIError = (err, fallbackMsg = "Unknown error") => {
    if (err instanceof dts_1.APIError) {
        return {
            status: err.status,
            msg: {
                message: err.message,
                error: err.stack || "API Error",
            },
        };
    }
    return {
        status: 500,
        msg: {
            message: "Internal Server Error",
            error: err instanceof Error ? err.message : fallbackMsg,
        },
    };
};
exports.handleErrorAsAPIError = handleErrorAsAPIError;
