import { Response } from "express"

export const sendUnathorizedResponse = (res: Response, message: string = "Unauthorised") => {
    res.status(401).send({
        message: message
    });
}