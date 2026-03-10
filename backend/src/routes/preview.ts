import { Router } from "express";
import { makeRouterRoute } from ".";
import { PreviewController } from "../controllers/preview";

export const PreviewRouter = Router();

const makePreviewRoute = makeRouterRoute(PreviewRouter);
makePreviewRoute("post", "/render", PreviewController.RenderContent);
