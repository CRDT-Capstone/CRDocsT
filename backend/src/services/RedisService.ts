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
}

const AddToCollaboratorsByDocumentId = async (documentId: string, user: string) => {

    const key = `collab:${documentId}`;
    await redis.sadd(key, user);
}

const getCollaboratorsByDocumentId = async (documentId: string) => {
    const key = `collab:${documentId}`;
    const collabs = await redis.smembers(key);
    return collabs;
}

const removeCollaboratorsByDocumentId = async (documentId: string, user: string) => {
    const key = `collab:${documentId}`;
    await redis.srem(key, user);
}

export const RedisService = {
    getCRDTStateByDocumentID,
    updateCRDTStateByDocumentID,
    deleteCRDTStateByDocumentID,
    AddToCollaboratorsByDocumentId,
    removeCollaboratorsByDocumentId,
    getCollaboratorsByDocumentId
};
