import type { z, ZodObject, ZodRawShape } from "zod";

export type AnyZodObject = ZodObject<ZodRawShape>;

export interface Schema {
    query?: ZodObject<any>;
    body?: ZodObject<any>;
    params?: ZodObject<any>;
    header?: ZodObject<any>;
}
