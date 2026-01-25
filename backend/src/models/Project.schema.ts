import { model, Schema } from "mongoose";
import { Project } from "../types/types";

const ProjectSchema = new Schema<Project>(
    {
        name: {
            type: String,
            default: "New Project",
            required: true,
        },
        description: {
            type: String,
            required: false,
        },
        documentIds: {
            type: [String],
            default: [],
        },
        ownerId: {
            type: String,
            required: true,
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
