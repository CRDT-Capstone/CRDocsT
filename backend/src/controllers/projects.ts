import { Request, Response } from "express";
import { ProjectServices } from "../services/ProjectServices";
import { FugueList, FugueStateSerializer, StringTotalOrder } from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import { getAuth } from "@clerk/express";
import { DocumentServices } from "../services/DocumentServices";

const createProject = async (req: Request, res: Response) => {
    try {
        const { userId } = getAuth(req);

        const project = await ProjectServices.createProject(userId);
        res.status(200).send({
            message: "Successfully created project",
            data: project,
        });

        return;
    } catch (err) {
        console.log("There was an error creating project -> ", err);
        res.status(500).send({
            message: "Unable to create project",
        });
    }
};

const updateProjectName = async (req: Request, res: Response) => {
    const { name } = req.body;
    const { projectID } = req.params;

    if (!name) {
        res.status(400).send({
            message: "Title and projectID is required",
        });
        return;
    }

    try {
        await ProjectServices.updateProjectById(projectID, { name });
        res.status(200).send({
            message: "Successfully updated the name of the project",
        });
    } catch (err) {
        console.log("There was an error updating project -> ", err);
        res.status(500).send({
            message: "Unable to update project",
        });
    }
};

const getProjectsByUserId = async (req: Request, res: Response) => {
    const { userId } = getAuth(req);

    if (!userId) {
        res.status(403).send({
            message: "Unauthorised access",
        });
        return;
    }

    try {
        const projects = await ProjectServices.getProjectsByUserId(userId);
        res.status(200).send({
            message: "Successfully fetched projects",
            data: projects,
        });
    } catch (err) {
        console.log("There was an error fetching projects -> ", err);
        res.status(500).send({
            message: "Unable to fetch projects",
        });
    }
};

const getProjectById = async (req: Request, res: Response) => {
    const { projectID } = req.params;

    try {
        const project = await ProjectServices.findProjectById(projectID);
        res.status(200).send({
            message: "Successfully fetched project",
            data: project,
        });
    } catch (err) {
        console.log("There was an error fetching project -> ", err);
        res.status(500).send({
            message: "Unable to fetch project",
        });
    }
};

const addDocumentToProject = async (req: Request, res: Response) => {
    const { projectID, documentID } = req.params;

    try {
        await ProjectServices.addDocumentToProject(projectID, documentID);
        res.status(200).send({
            message: "Successfully added document to project",
        });
    } catch (err) {
        console.log("There was an error adding document to project -> ", err);
        res.status(500).send({
            message: "Unable to add document to project",
        });
    }
};

const removeDocumentFromProject = async (req: Request, res: Response) => {
    const { projectID, documentID } = req.params;

    try {
        await ProjectServices.removeDocumentFromProject(projectID, documentID);
        res.status(200).send({
            message: "Successfully removed document from project",
        });
    } catch (err) {
        console.log("There was an error removing document from project -> ", err);
        res.status(500).send({
            message: "Unable to remove document from project",
        });
    }
};

const createNewProjectDocument = async (req: Request, res: Response) => {
    const { projectID } = req.params;
    const { userId } = getAuth(req);

    try {
        if (!userId) {
            res.status(403).send({
                message: "Unauthorised access",
            });
            return;
        }

        const document = await DocumentServices.createDocument(userId);
        await ProjectServices.addDocumentToProject(projectID, document._id.toString());

        res.status(200).send({
            message: "Successfully created document and added to project",
            data: document,
        });
    } catch (err) {
        console.log("There was an error creating document -> ", err);
        res.status(500).send({
            message: "Unable to create document",
        });
    }
};

export const ProjectController = {
    createProject,
    updateProjectName,
    getProjectsByUserId,
    getProjectById,
    addDocumentToProject,
    removeDocumentFromProject,
    createNewProjectDocument,
};
