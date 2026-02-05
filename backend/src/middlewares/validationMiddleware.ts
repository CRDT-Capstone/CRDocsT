import { Schema } from "../validaton";
import { validateRequest } from "zod-express-middleware";

export const validate = (schema: Schema) => {
    return validateRequest({
        body: schema.body,
        query: schema.query,
        params: schema.params,
    });
};
