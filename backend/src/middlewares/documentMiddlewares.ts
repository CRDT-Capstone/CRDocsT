/*
Need to implement things to help with permissions
View Only 
Can Edit 

Not even sure this is where it should be, but yeah 
- Tani
*/

import { NextFunction, Request, Response } from "express";
import { DocumentServices } from "../services/DocumentServices";
import { getAuth } from "@clerk/express";
import { sendUnathorizedResponse } from "../utils/ApiResponseUtils";
import { UserService } from "../services/UserService";
import { APIError, logger } from "@cr_docs_t/dts";

export const OnlyCollaboratorsAndOwners = async (req: Request, res: Response, next: NextFunction) => {
    const { documentId } = req.params;

    let { email } = req.body; //has to be in there to allow for 'anonymous' users

    if (!email) {
        sendUnathorizedResponse(res, "Email is required");
        return;
    }

    try {
        const isAllowed = await DocumentServices.IsDocumentOwnerOrCollaborator(documentId as string, email);
        if (isAllowed) next();
        else sendUnathorizedResponse(res);
    } catch (error: unknown) {
        if (error instanceof APIError) {
            logger.error("Error checking document permissions", { msg: error.message, stack: error.stack, error });
        } else if (error instanceof Error) {
            logger.error("Unknown error checking document permissions", {
                msg: error.message,
                error,
            });
        } else {
            logger.error("Non-error thrown in document permissions check", { error });
        }

        sendUnathorizedResponse(res);
    }
};

export const OnlyDocumentOwner = async (req: Request, res: Response, next: NextFunction) => {
    const { documentId } = req.body || req.params;

    if (!documentId) sendUnathorizedResponse(res);

    const { userId } = getAuth(req);

    const isAllowed = await DocumentServices.isDocumentOwner(documentId, userId?.toString() || "");
    if (isAllowed) next();
    else sendUnathorizedResponse(res);
};
