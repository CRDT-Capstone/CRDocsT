import { ErrMsg, GenericMsg, Msg } from "@cr_docs_t/dts";
import { Response } from "express";

export const send = <T>(res: Response, msg: GenericMsg<T>, status: number) => {
    res.status(status).send(msg);
};

export const sendOk = <T>(res: Response, msg: Msg<T>) => {
    return send<T>(res, msg, 200);
};

export const sendErr = (res: Response, msg: ErrMsg, status: number = 500) => {
    return send<undefined>(res, msg, status);
};

export const sendUnathorizedResponse = (res: Response, message: string = "Unauthorised") => {
    return send<undefined>(res, { message, error: "Unauthorised" }, 401);
};

