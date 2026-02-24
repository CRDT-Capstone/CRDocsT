import { model, Schema } from "mongoose";
import { ContributorType, Contributor, Document } from "@cr_docs_t/dts";
import { ContributorSchema } from "./Contributor.schema";

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
        projectId: {
            type: String,
            required: false,
        },
    },
    {
        timestamps: true,
    },
);

DocumentSchema.index({ _id: 1, "contributors.email": 1 }, { unique: true });

export const DocumentModel = model<Document>("document", DocumentSchema);
