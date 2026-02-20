import { logger } from "../logging";
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

const bufferCRDTOperationsByDocumentID = async (documentID: string, op: FugueMessage[])=>{
    //TODO: chunk the ops so that we don't hit redis limits

    //converting to base 64 because sets only take strings

    const pipeline = redis.pipeline();
    const serializedMessages = op.map((operation)=> Buffer.from(FugueMessageSerialzier.serializeSingleMessage(operation)).toString("base64"));
    serializedMessages.forEach((msg)=> pipeline.sadd(`doc:${documentID}:operations`, msg));
    await pipeline.exec();
}

const getBufferedCRDTOperationsByDocumentId = async (documentID: string)=>{
    const base64CRDTOps = await redis.smembers(`doc:${documentID}:operations`);
    if(!base64CRDTOps) return undefined;
    const bufferedCRDTOps = base64CRDTOps.map((op)=> Buffer.from(op, "base64"));
    return bufferedCRDTOps;
}

const deleteCRDTStateByDocumentID = async (documentID: string) => {
    await redis.del(`doc:${documentID}`);
};

const AddToCollaboratorsByDocumentId = async (documentId: string, user: string) => {
    const key = `collab:${documentId}`;
    await redis.sadd(key, user);
};

const getCollaboratorsByDocumentId = async (documentId: string) => {
    const key = `collab:${documentId}`;
    const collabs = await redis.smembers(key);
    return collabs;
};

const removeCollaboratorsByDocumentId = async (documentId: string, user: string) => {
    logger.info("Did we get here?");
    const key = `collab:${documentId}`;
    await redis.srem(key, user);
};

export const RedisService = {
    getCRDTStateByDocumentID,
    updateCRDTStateByDocumentID,
    deleteCRDTStateByDocumentID,
    AddToCollaboratorsByDocumentId,
    removeCollaboratorsByDocumentId,
    getCollaboratorsByDocumentId,
    bufferCRDTOperationsByDocumentID,
    getBufferedCRDTOperationsByDocumentId
};
