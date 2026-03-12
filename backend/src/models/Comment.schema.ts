import { CommentType } from "@cr_docs_t/dts"
import { model, Schema } from "mongoose"
const CommentSchema = new Schema<CommentType>({
    text: {
        type: String, 
        required: true
    },
    documentId: {
        type: String,
        required: true
    },
    from: {
        type: Number,
        required: true
    },
    to: {
        type: Number,
        required: true
    },
    userId: {
        type: String,
    },
    parentCommentId: {
        type: String
    },
    resolved: {
        type: Boolean, 
        default: true
    }
}, {
    timestamps: true
});

CommentSchema.index({ documentId: 1});

export const CommentModel = model<CommentType>("comment", CommentSchema);
