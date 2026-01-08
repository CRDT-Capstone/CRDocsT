import { Request, Response } from 'express';
import { DocumentServices } from '../services/DocumentServices';
import { redis } from '../redis';
import { FugueList, StringTotalOrder } from '@cr_docs_t/dts';

const createDocument = async (req: Request, res: Response)=>{
    try{
        const document = await DocumentServices.createDocument();
        const CRDT = new FugueList(new StringTotalOrder(document._id.toString()), null);
        redis.set(document._id.toString(), JSON.stringify(CRDT));

        res.status(200).send({
            message: 'Successfully created document',
            data: document
        });

        return;
    }catch(err){
        console.log('There was an error creating document -> ', err);
        res.status(500).send({
            message: 'Unable to create document',
        });
    }
}

export const DocumentController = {
    createDocument
};