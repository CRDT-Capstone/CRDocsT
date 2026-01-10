import { FugueList, FugueState, StringTotalOrder } from "@cr_docs_t/dts";
import { redis } from "../redis";
import crypto from 'crypto';

const getCRDTStateByDocumentID = async(documentID: string)=>{
    const serializedCRDTState = await redis.get(documentID);
    let CRDTState: FugueState<string> | undefined;
    if(serializedCRDTState){
        CRDTState = JSON.parse(serializedCRDTState);
    }
    return CRDTState;
}

const updateCRDTStateByDocumentID = async(documentID: string, CRDTStateUpdate: string)=>{
    await redis.set(documentID, CRDTStateUpdate);
}

export const RedisService = {
    getCRDTStateByDocumentID,
    updateCRDTStateByDocumentID
};