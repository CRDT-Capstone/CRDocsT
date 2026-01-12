import { model, Schema } from "mongoose";
import { Document } from '../types'

const DocumentSchema = new Schema<Document>({

    name: {
        type: String,
        default: 'New Document',
        required: true,
    },
    serializedCRDTState: {
        type: String,
        required: false,
    }
    /* 
    To be added
    - Owner (the user that created this)
    - User permissions (how we share and all that shit)
    */

}, {
    timestamps: true
});

export const DocumentModel = model<Document>('document', DocumentSchema);
