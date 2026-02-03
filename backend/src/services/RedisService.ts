import { redis } from "../redis";

const getCRDTStateByDocumentID = async (documentID: string) => {
    const serializedCRDTState = await redis.getBuffer(`doc:${documentID}`);
    if (!serializedCRDTState) return undefined;
    return serializedCRDTState;
};

const updateCRDTStateByDocumentID = async (documentID: string, CRDTStateUpdate: string | Buffer) => {
    await redis.set(`doc:${documentID}`, CRDTStateUpdate);
};

const deleteCRDTStateByDocumentID = async(documentID:string)=>{
    await redis.del(`doc:${documentID}`);
}

export const RedisService = {
    getCRDTStateByDocumentID,
    updateCRDTStateByDocumentID,
    deleteCRDTStateByDocumentID
};
