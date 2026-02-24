import type { z, ZodObject, ZodRawShape } from "zod";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { getAuth } from "@clerk/express";

export type AnyZodObject = ZodObject<ZodRawShape>;

export interface Schema {
    query?: AnyZodObject;
    body?: AnyZodObject;
    params?: AnyZodObject;
    header?: AnyZodObject;
}

export type ValidatedRequest<T extends Schema, Locals extends Record<string, any> = Record<string, any>> = Request<
    T["params"] extends ZodObject<any> ? z.infer<T["params"]> : any,
    any,
    T["body"] extends ZodObject<any> ? z.infer<T["body"]> : any,
    T["query"] extends ZodObject<any> ? z.infer<T["query"]> : any,
    Locals
>;

export type AuthenticatedRequest<
    T extends Schema,
    Locals extends Record<string, any> = Record<string, any>,
> = ValidatedRequest<T, Locals> & { auth: ReturnType<typeof getAuth> };

export type RequestHandlerWithSchema<
    T extends Schema,
    Locals extends Record<string, any> = Record<string, any>,
> = RequestHandler<
    T["params"] extends ZodObject<any> ? z.infer<T["params"]> : any,
    any,
    T["body"] extends ZodObject<any> ? z.infer<T["body"]> : any,
    T["query"] extends ZodObject<any> ? z.infer<T["query"]> : any,
    Locals
>;

export type AuthenticatedHandler<T extends Schema, Locals extends Record<string, any> = Record<string, any>> = (
    req: AuthenticatedRequest<T, Locals>,
    res: Response,
    next: NextFunction,
) => any;
