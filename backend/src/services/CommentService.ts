import { APIError, CommentType } from "@cr_docs_t/dts";
import { CommentModel } from "../models/Comment.schema"

const createComment = async (createCommentObj: CommentType) => {
    await CommentModel.create(createCommentObj);
}

const getCommentsByDocumentId = async (documentId: string) => {
    await CommentModel.find({ documentId });
}

const resolveComment = async (commentId: string) => {
    const comment = await CommentModel.findByIdAndUpdate({
        commentId
    }, { resolved: true }, {new: true});

    if(!comment)
        throw new APIError("Comment not found", 404);
}


export const CommentService = {
    createComment,
    getCommentsByDocumentId,
    resolveComment
};