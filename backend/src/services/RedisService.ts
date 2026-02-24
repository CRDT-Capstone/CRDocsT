import { FugueMessage } from "@cr_docs_t/dts";
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

const deleteCRDTStateByDocumentID = async (documentID: string) => {
    await redis.del(`doc:${documentID}`);
};

const AddToCollaboratorsByDocumentId = async (documentId: string, user: string) => {
    const key = `collab:${documentId}`;
    await redis.sadd(key, user);
};

const updateCollaboratorsByDocumentId = async (documentId: string, users: Set<string>) => {
    const key = `collab:${documentId}`;
    await redis.del(key);
    if (users.size > 0) {
        await redis.sadd(key, ...Array.from(users));
    }
};

const getCollaboratorsByDocumentId = async (documentId: string) => {
    const key = `collab:${documentId}`;
    const collabs = await redis.smembers(key);
    return collabs;
};

const removeCollaboratorsByDocumentId = async (documentId: string, user: string) => {
    const key = `collab:${documentId}`;
    await redis.srem(key, user);
};

const bufferCRDTOperationsByDocumentID = async (documentID: string, op: FugueMessage[]) => {
    //TODO: chunk the ops so that we don't hit redis limits

    //converting to base 64 because sets only take strings

    //const serializedMessages = op.map((operation)=> Buffer.from(FugueMessageSerialzier.serializeSingleMessage(operation)).toString("base64"));
    //serializedMessages.forEach((msg)=> pipeline.sadd(`doc:${documentID}:operations`, msg));

    const CHUNK_SIZE = 1000;

    for (let i = 0; i < op.length; i += CHUNK_SIZE) {
        const chunkedOps = op.slice(i, i + CHUNK_SIZE);
        const processedChunkedOps = chunkedOps.map((op) => JSON.stringify(op));
        await redis.sadd(`doc:${documentID}:operations`, ...processedChunkedOps);
    }
};

const getBufferedCRDTOperationsByDocumentId = async (documentID: string) => {
    // const base64CRDTOps = await redis.smembers(`doc:${documentID}:operations`);
    // if(!base64CRDTOps) return undefined;

    const ops = await redis.smembers(`doc:${documentID}:operations`);
    return ops;
};

export const RedisService = {
    getCRDTStateByDocumentID,
    updateCRDTStateByDocumentID,
    deleteCRDTStateByDocumentID,
    AddToCollaboratorsByDocumentId,
    removeCollaboratorsByDocumentId,
    getCollaboratorsByDocumentId,
    updateCollaboratorsByDocumentId,
    bufferCRDTOperationsByDocumentID,
    getBufferedCRDTOperationsByDocumentId,
};
