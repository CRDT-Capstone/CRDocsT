import { FugueList } from "@cr_docs_t/dts";
import { redis } from "../redis";

const getCRDTByDocumentID = async(documentID: string)=>{
    const serializedCRDT = await redis.get(documentID);
    let CRDT: FugueList<string> | undefined ;
    if(serializedCRDT) CRDT = JSON.parse(serializedCRDT);
    return CRDT;
}

const updateCRDTByDocumentID = async(documentID: string, CRDTUpdate: string)=>{
    await redis.set(documentID, CRDTUpdate);
}

export const RedisService = {
    getCRDTByDocumentID,
    updateCRDTByDocumentID
};