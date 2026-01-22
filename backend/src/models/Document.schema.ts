import { model, Schema } from "mongoose";
import { Contributor, Document } from "../types/types"
import { ContributorType } from "../enums";

const ContributorSchema = new Schema<Contributor>({
    contributorType: {
        required: true,
        type: String,
        enum: ContributorType,
    },
    userId: {
        type: String,
        required: false
    }
})

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
    },
    contributors: {
        type: [ContributorSchema],
        default: []
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

export const DocumentModel = model<Document>('document', DocumentSchema);
