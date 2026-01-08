import { FugueList, StringTotalOrder } from "@cr_docs_t/dts";
import { redis } from "../redis";
import crypto from 'crypto';

const getCRDTByDocumentID = async(documentID: string)=>{
    const serializedCRDTState = await redis.get(documentID);
    let CRDT: FugueList<string> | undefined;
    if(serializedCRDTState){
        const CRDTState = JSON.parse(serializedCRDTState);
        CRDT = new FugueList(new StringTotalOrder(crypto.randomBytes(3).toString()), null, documentID); //add documentID
        CRDT.state = CRDTState;
    }
    return CRDT;
}

const updateCRDTByDocumentID = async(documentID: string, CRDTStateUpdate: string)=>{
    await redis.set(documentID, CRDTStateUpdate);
}

export const RedisService = {
    getCRDTByDocumentID,
    updateCRDTByDocumentID
};