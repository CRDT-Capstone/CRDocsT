import { model, Schema } from "mongoose";
import { ContributorType, Contributor, Document } from "@cr_docs_t/dts";

const ContributorSchema = new Schema<Contributor>({
    contributorType: {
        required: true,
        type: String,
        enum: ContributorType,
    },
    email: {
        type: String,
        required: false,
    },
});

const DocumentSchema = new Schema<Document>(
    {
        name: {
            type: String,
            default: "New Document",
            required: true,
        },
        serializedCRDTState: {
            type: String,
            required: false,
        },
        ownerId: {
            type: String,
            required: false,
        },
        contributors: {
            type: [ContributorSchema],
            default: [],
        },
    },
    {
        timestamps: true,
    },
);

DocumentSchema.index({ _id: 1, "contributors.email": 1 }, { unique: true });

export const DocumentModel = model<Document>("document", DocumentSchema);
