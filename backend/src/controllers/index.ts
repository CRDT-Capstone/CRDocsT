import { RequestHandler } from "express";
import { AuthenticatedHandler, RequestHandlerWithSchema, Schema } from "../validaton";

export type EndpointWSchema<T extends Schema> = {
    con: RequestHandlerWithSchema<T> | AuthenticatedHandler<T> | RequestHandler;
    sch?: T;
};

export type ControllerWSchema<T extends Record<string, Schema>> = {
    [K in keyof T]: EndpointWSchema<T[K]>;
};

// map a record of endpoint descriptors -> a Controller type that keeps per-endpoint schema
export type ControllerWSchemaFromMap<
    M extends Record<
        string,
        { con: RequestHandler | RequestHandlerWithSchema<any> | AuthenticatedHandler<any>; sch?: Schema | undefined }
    >,
> = {
    [K in keyof M]: EndpointWSchema<M[K]["sch"] extends Schema ? M[K]["sch"] : Schema>;
};

// helper that preserves inference for each endpoint
export function defineController<
    T extends Record<
        string,
        { con: RequestHandler | RequestHandlerWithSchema<any> | AuthenticatedHandler<any>; sch?: Schema | undefined }
    >,
>(c: T): ControllerWSchemaFromMap<T> {
    return c as unknown as ControllerWSchemaFromMap<T>;
}
