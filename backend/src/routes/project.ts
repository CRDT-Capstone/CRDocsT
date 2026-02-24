import { Router } from "express";
import { ProjectController } from "../controllers/projects";
import { requireAuth } from "@clerk/express";
import { makeRouterRoute } from ".";

export const ProjectRouter = Router();

const makeProjectRoute = makeRouterRoute(ProjectRouter);
ProjectRouter.use(requireAuth());
makeProjectRoute("get", "/user", ProjectController.GetProjectsByUserId);
makeProjectRoute("get", "/shared-with-me", ProjectController.GetSharedProjectsByUserId);
makeProjectRoute("get", "/:projectId", ProjectController.GetProjectById);

makeProjectRoute("post", "/create", ProjectController.CreateProject);
makeProjectRoute("post", "/:projectId/create-document", ProjectController.CreateNewProjectDocument);
makeProjectRoute("post", "/share", ProjectController.ShareProjectViaEmail);
makeProjectRoute("post", "/:projectId/remove-collaborator", ProjectController.RemoveProjectCollaborator);
makeProjectRoute("post", "/:projectId/update-collaborator-type", ProjectController.UpdateProjectCollaboratorType);
makeProjectRoute("post", "/:projectId/check-access", ProjectController.GetUserProjectAccess);

makeProjectRoute("put", "/update/:projectId", ProjectController.UpdateProjectName);

makeProjectRoute("delete", "/delete/:projectId", ProjectController.DeleteProject);
makeProjectRoute("delete", "/:projectId/remove-document/:documentId", ProjectController.RemoveDocumentFromProject);
