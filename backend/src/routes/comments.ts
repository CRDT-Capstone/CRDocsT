import { Router } from "express";
import { makeRouterRoute } from ".";
import { OnlyCollaboratorsAndOwners } from "../middlewares/documentMiddlewares";
import { CommentController } from "../controllers/comments";

export const CommentRouter = Router();

CommentRouter.use(OnlyCollaboratorsAndOwners)
const makeCommentRoute = makeRouterRoute(CommentRouter);
makeCommentRoute("post", "/comment", CommentController.CreateComment);
makeCommentRoute("get", "/comment/:documentId", CommentController.GetCommentForDocument);
makeCommentRoute("put", "/comment/:documentId/:commentId", CommentController.ResolveComment);
