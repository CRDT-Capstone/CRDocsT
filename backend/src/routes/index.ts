import { Router } from "express";
import { EndpointWSchema } from "../controllers";
import { validate } from "../middlewares/validationMiddleware";
import { APIError } from "@cr_docs_t/dts";

export type VERB = "get" | "post" | "put" | "delete";

export const makeRoute = (router: Router, v: VERB, route: string, c: EndpointWSchema) => {
    switch (v) {
        case "get":
            if (c.sch) return router.get(route, validate(c.sch), c.con);
            else router.get(route, c.con);
        case "post":
            if (c.sch) return router.post(route, validate(c.sch), c.con);
            return router.post(route, c.con);
        case "put":
            if (c.sch) return router.put(route, validate(c.sch), c.con);
            return router.put(route, c.con);
        case "delete":
            if (c.sch) return router.delete(route, validate(c.sch), c.con);
            return router.delete(route, c.con);
    }
    throw new APIError("Invalid http verb", 500);
};

export const makeRouterRoute = (router: Router) => (v: VERB, route: string, c: EndpointWSchema) =>
    makeRoute(router, v, route, c);
