import Mongoose from "mongoose";
import { OperationType } from "./constants/operations";
import { ContributorType } from "@cr_docs_t/dts";

export interface identified {
    _id?: string | Mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
