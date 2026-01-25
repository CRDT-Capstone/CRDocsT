import { Router } from "express";
import { ProjectController } from "../controllers/projects";
import { requireAuth } from "@clerk/express";

export const ProjectRouter = Router();

ProjectRouter.use(requireAuth());
ProjectRouter.post("/create", ProjectController.createProject);
ProjectRouter.put("/update/:projectID", ProjectController.updateProjectName);
ProjectRouter.get("/user", ProjectController.getProjectsByUserId);
ProjectRouter.post("/:projectID/add-document/:documentID", ProjectController.addDocumentToProject);
ProjectRouter.post("/:projectID/remove-document/:documentID", ProjectController.removeDocumentFromProject);
ProjectRouter.post("/:projectID/new", ProjectController.createNewProjectDocument);
ProjectRouter.get("/:projectID", ProjectController.getProjectById);
