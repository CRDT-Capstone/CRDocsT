import { model, Schema } from "mongoose";
import { ContributorType, Contributor } from "@cr_docs_t/dts";

export const ContributorSchema = new Schema<Contributor>({
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
