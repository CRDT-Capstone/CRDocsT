"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_express_middleware_1 = require("zod-express-middleware");
const validate = (schema) => {
    return (0, zod_express_middleware_1.validateRequest)({
        body: schema.body,
        query: schema.query,
        params: schema.params,
    });
};
exports.validate = validate;
