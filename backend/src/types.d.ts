import Mongoose from 'mongoose';
import { OperationType } from './constants/operations';

export interface identified {
    _id?: string | Mongoose.Types.ObjectId,
    createdAt: Date,
    updatedAt: Date
}

export interface Document extends Identified {
    name: string,
    serializedCRDTState: string
}
