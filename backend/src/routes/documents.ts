import { Router } from "express";
import { DocumentController } from "../controllers/documents";
import { OnlyCollaboratorsAndOwners } from "../middlewares/documentMiddlewares";
import { makeRouterRoute } from ".";

export const DocumentRouter = Router();

const makeDocumentRoute = makeRouterRoute(DocumentRouter);
makeDocumentRoute("post", "/create", DocumentController.CreateDocument);
//TODO: make this a general update endpoint
makeDocumentRoute("put", "/update/:documentId", DocumentController.UpdateDocumentName);
makeDocumentRoute("get", "/user", DocumentController.GetDocumentsByUserId);
makeDocumentRoute("get", "/:documentId", DocumentController.GetDocumentById);
makeDocumentRoute("post", "/share", DocumentController.ShareDocumentViaEmail);
makeDocumentRoute("post", "/:documentId/remove-collaborator", DocumentController.RemoveContributor);
makeDocumentRoute("post", "/:documentId/update-collaborator-type", DocumentController.UpdateContributorType);
