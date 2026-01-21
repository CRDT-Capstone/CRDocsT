import { model, Schema } from "mongoose";
import { Document } from "../types/types"

const DocumentSchema = new Schema<Document>({

    name: {
        type: String,
        default: 'New Document',
        required: true,
    },
    serializedCRDTState: {
        type: String,
        required: false,
    },
    ownerId: {
        type: String,
        required: false
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

export const DocumentModel = model<Document>('document', DocumentSchema);
