import Mongoose from 'mongoose';
import { OperationType } from './constants/operations';
import { ContributorType } from "@cr_docs_t/dts";

export interface identified {
    _id?: string | Mongoose.Types.ObjectId,
    createdAt: Date,
    updatedAt: Date
}

export interface Contributor {
    contributorType: ContributorType,
    email: string
}

export interface Document extends Identified {
    name: string,
    serializedCRDTState: string;
    ownerId?: string;
    contributors: Contributor[]
}
