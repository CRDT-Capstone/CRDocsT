import { z } from "zod";
import { Schema } from "../validaton";
import val, { ErrorRequestHandler } from "express-zod-safe";
import { logger } from "../logging";

const handler: ErrorRequestHandler = (errs, req, res, next) => {
    logger.warn(`Validation failed for ${req.method} ${req.path}`, {
        details: errs.map((e) => ({
            source: e.type, // 'body', 'query', or 'params'
            errors: e.errors.issues,
        })),
    });

    res.status(400).json({
        message: "Validation Error",
        errors: errs.reduce(
            (acc, curr) => {
                // Use .format() for a nested object or .flatten() for simple lists
                acc[curr.type] = z.treeifyError(curr.errors);
                return acc;
            },
            {} as Record<string, any>,
        ),
        // 3. Proper Stack Tracing
        ...(process.env.NODE_ENV === "development" && {
            debug: errs.map((e) => ({
                source: e.type,
                stack: e.errors.stack,
            })),
        }),
    });
};

export const validate = (schema: Schema) => {
    return val({
        handler, // Shorthand
        body: schema.body,
        query: schema.query,
        params: schema.params,
    });
};
