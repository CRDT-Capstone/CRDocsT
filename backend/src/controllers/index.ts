import { RequestHandler } from "express";
import { Schema } from "../validaton";

export type EndpointWSchema = {
    con: RequestHandler;
    sch?: Schema;
};

export type ControllerWSchema = Record<string, EndpointWSchema>;
