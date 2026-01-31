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

export const OnlyCollaboratorsAndOwners = async (req: Request, res: Response, next: NextFunction) => {
    const { documentId } = req.params;

    let { email } = req.body; //has to be in there to allow for 'anonymous' users

    if (!email) {
        sendUnathorizedResponse(res, "Email is required");
        return;
    }

    const isAllowed = await DocumentServices.IsDocumentOwnerOrCollaborator(documentId, email);
    if (isAllowed) next();
    else
        sendUnathorizedResponse(res);

}

export const OnlyDocumentOwner = async (req: Request, res: Response, next: NextFunction) => {
    const { documentId } = req.body || req.params

    if (!documentId) sendUnathorizedResponse(res);

    const { userId } = getAuth(req);


    const isAllowed = await DocumentServices.isDocumentOwner(documentId, userId?.toString() || "");
    if (isAllowed) next();
    else
        sendUnathorizedResponse(res);
}