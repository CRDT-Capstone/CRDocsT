import { Request, Response } from "express";
import { DocumentServices } from "../services/DocumentServices";
import { redis } from "../redis";
import { FugueList, FugueStateSerializer, StringTotalOrder } from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import DocumentManager from "../managers/document";

const createDocument = async (req: Request, res: Response) => {
    try {
        const document = await DocumentServices.createDocument();
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

export const DocumentController = {
    createDocument,
};
