import { Router, RequestHandler } from "express";
import { EndpointWSchema } from "../controllers";
import { validate } from "../middlewares/validationMiddleware";
import { APIError } from "@cr_docs_t/dts";
import type { Schema } from "../validaton";

export type VERB = "get" | "post" | "put" | "delete";

const toReqHandler = (h: unknown): RequestHandler => h as RequestHandler;

export const makeRoute = <T extends Schema>(router: Router, v: VERB, route: string, c: EndpointWSchema<T>) => {
    // build handlers, but cast to RequestHandler for the router call
    const handlers: RequestHandler[] = c.sch
        ? [toReqHandler(validate(c.sch)), toReqHandler(c.con)]
        : [toReqHandler(c.con)];

    switch (v) {
        case "get":
            return router.get(route, ...handlers);
        case "post":
            return router.post(route, ...handlers);
        case "put":
            return router.put(route, ...handlers);
        case "delete":
            return router.delete(route, ...handlers);
        default:
            throw new APIError("Invalid http verb", 500);
    }
};

export const makeRouterRoute =
    (router: Router) =>
    <T extends Schema>(v: VERB, route: string, c: EndpointWSchema<T>) =>
        makeRoute(router, v, route, c);
