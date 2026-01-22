import Mongoose from 'mongoose';
import { OperationType } from './constants/operations';
import { ContributorType } from '../enums';

export interface identified {
    _id?: string | Mongoose.Types.ObjectId,
    createdAt: Date,
    updatedAt: Date
}

export interface Contributor {
    contributorType: ContributorType,
    userId?: string
}

export interface Document extends Identified {
    name: string,
    serializedCRDTState: string;
    ownerId?: string;
    contributors?: Contributor[]
}
