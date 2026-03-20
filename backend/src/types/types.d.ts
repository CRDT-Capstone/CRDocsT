import Mongoose from "mongoose";
import { ContributorType } from "@cr_docs_t/dts";

export interface identified {
    _id?: string | Mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
