import { FugueList, FugueState, StringTotalOrder } from "@cr_docs_t/dts";
import { redis } from "../redis";
import crypto from "crypto";

const getCRDTStateByDocumentID = async (documentID: string) => {
    const serializedCRDTState = await redis.getBuffer(`doc:${documentID}`);
    if (!serializedCRDTState) return undefined;
    return serializedCRDTState;
};

const updateCRDTStateByDocumentID = async (documentID: string, CRDTStateUpdate: string | Buffer) => {
    await redis.set(`doc:${documentID}`, CRDTStateUpdate);
};

export const RedisService = {
    getCRDTStateByDocumentID,
    updateCRDTStateByDocumentID,
};
