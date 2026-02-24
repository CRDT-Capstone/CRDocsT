import { model, Schema } from "mongoose";
import { ContributorSchema } from "./Contributor.schema";
import { Project } from "@cr_docs_t/dts";

const ProjectSchema = new Schema<Project>(
    {
        name: {
            type: String,
            default: "New Project",
            required: true,
        },
        documentIds: {
            type: [String],
            default: [],
        },
        ownerId: {
            type: String,
            required: true,
        },
        contributors: {
            type: [ContributorSchema],
            default: [],
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
    },
);

export const ProjectModel = model<Project>("project", ProjectSchema);
