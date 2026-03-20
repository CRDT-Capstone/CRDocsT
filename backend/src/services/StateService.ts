import { logger } from "@cr_docs_t/dts";
import { RedisService } from "./RedisService";
import { DocumentServices } from "./DocumentServices";

const getUpToDateState = async (documentID: string) => {
    let existingState: Buffer | undefined;

    logger.info("Attempting to get state from Redis");
    existingState = await RedisService.getCRDTStateByDocumentID(documentID);
    if (existingState) {
        logger.info(`Creating new ActiveDocument for ID ${documentID}. Existing state: found in Redis`);
    } else {
        logger.info("Attempting to get state from database");
        const document = await DocumentServices.getDocumentStateFromDB(documentID);
        if (document?.serializedCRDTState) {
            existingState = document.serializedCRDTState as Buffer;
            logger.info(`Creating new ActiveDocument for ID ${documentID}. Existing state: found in DB`);
        } else {
            logger.info(`Creating new ActiveDocument for ID ${documentID}. No existing state found`);
        }
    }

    return existingState;
};

export const StateService = {
    getUpToDateState,
};
