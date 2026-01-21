import { Request, Response } from "express";
import { DocumentServices } from "../services/DocumentServices";
import { redis } from "../redis";
import { FugueList, FugueStateSerializer, StringTotalOrder } from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import { getAuth } from "@clerk/express";

const createDocument = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);
        const document = await DocumentServices.createDocument(userId);
        const CRDT = new FugueList(new StringTotalOrder(document._id.toString()), null, document._id.toString());
        
        RedisService.updateCRDTStateByDocumentID(
            document._id.toString(),
            Buffer.from(FugueStateSerializer.serialize(CRDT.state)),
        );

        res.status(200).send({
            message: "Successfully created document",
            data: document,
        });

        return;
    } catch (err) {
        console.log("There was an error creating document -> ", err);
        res.status(500).send({
            message: "Unable to create document",
        });
    }
};

const updateDocumentName = async (req: Request, res: Response) => {
    const { name } = req.body;
    const { documentID } = req.params;
    if (!name) {
        res.status(400).send({
            message: 'Title and documentID is required'
        });
        return;
    }
    try {
        await DocumentServices.updateDocumentById(documentID, { name });
        res.status(200).send({
            message: 'Successfully updated the name of the document'
        })
    } catch (err) {
        console.log("There was an error creating document -> ", err);
        res.status(500).send({
            message: "Unable to create document",
        });
    }
}

const getDocumentsByUserId = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);
    if(!userId){
        res.status(403).send({
            message: 'Unauthorised access'
        });
        return;
    }
    try {
        //Need to add some pagination or something to this
        const documents = await DocumentServices.getDocumentsByUserId(userId!);
        res.status(200).send({
            message: 'Successfully retrieved documents',
            data: documents
        });
    } catch (err: any) {
        console.log(`Unable to get documents for userID: ${userId}. Error-> `, err);
        res.status(500).send({
            message: 'Unable to retrieve documents'
        });
    }
}

const getDocumentById = async(req: Request, res: Response)=>{
    const { documentId } = req.params;
    try{
        const document = await DocumentServices.getDocumentMetadataById(documentId);
        if(!document){
            res.status(404).send({
                message: 'Document does not exist'
            });
            return;
        }
        res.status(200).send({
            message: 'Succesfully retrieved document',
            data: document
        });
    }catch(err: any){
        console.log(`Unable to get document with Id ${documentId}. Error-> `, err);
        res.status(500).send({
            message: 'Unable to retrieve document'
        });
    }
}

export const DocumentController = {
    createDocument,
    updateDocumentName,
    getDocumentsByUserId,
    getDocumentById
};
