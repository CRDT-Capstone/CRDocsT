"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRouterRoute = exports.makeRoute = void 0;
const validationMiddleware_1 = require("../middlewares/validationMiddleware");
const dts_1 = require("@cr_docs_t/dts");
const makeRoute = (router, v, route, c) => {
    switch (v) {
        case "get":
            if (c.sch)
                return router.get(route, (0, validationMiddleware_1.validate)(c.sch), c.con);
            else
                router.get(route, c.con);
        case "post":
            if (c.sch)
                return router.post(route, (0, validationMiddleware_1.validate)(c.sch), c.con);
            return router.post(route, c.con);
        case "put":
            if (c.sch)
                return router.put(route, (0, validationMiddleware_1.validate)(c.sch), c.con);
            return router.put(route, c.con);
        case "delete":
            if (c.sch)
                return router.delete(route, (0, validationMiddleware_1.validate)(c.sch), c.con);
            return router.delete(route, c.con);
    }
    throw new dts_1.APIError("Invalid http verb", 500);
};
exports.makeRoute = makeRoute;
const makeRouterRoute = (router) => (v, route, c) => (0, exports.makeRoute)(router, v, route, c);
exports.makeRouterRoute = makeRouterRoute;
