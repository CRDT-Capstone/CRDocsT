import { Request, Response } from "express";
import { ProjectServices } from "../services/ProjectServices";
import { ContributorType, FugueList, FugueStateSerializer, StringTotalOrder } from "@cr_docs_t/dts";
import { RedisService } from "../services/RedisService";
import { getAuth } from "@clerk/express";
import { DocumentServices } from "../services/DocumentServices";
import { z } from "zod";
import { AuthenticatedRequest, Schema, ValidatedRequest } from "../validaton";
import { ControllerWSchema, defineController } from ".";
import { handleErrorAsAPIError } from "../utils";
import { logger } from "../logging";
import { sendErr, sendOk } from "../utils/ApiResponseUtils";
import { MailService } from "../services/MailService";

const projectIdSchema = () =>
    z.strictObject({
        projectId: z.string().min(1, "projectId is required"),
    });

const createProjectSchema = {
    body: z.strictObject({
        name: z.string().min(1, "Name cannot be empty").optional(),
    }),
};

const createProject = async (req: AuthenticatedRequest<typeof createNewProjectDocumentSchema>, res: Response) => {
    try {
        const userId = req.auth.userId;
        const { name } = req.body;

        const project = await ProjectServices.createProject(userId, name);
        return sendOk(res, {
            message: "Successfully created project",
            data: undefined,
        });
    } catch (err) {
        logger.error("There was an error creating project", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const updateProjectNameSchema = {
    params: projectIdSchema(),
    body: z.strictObject({
        name: z.string().min(1, "name is required"),
    }),
};

const updateProjectName = async (req: ValidatedRequest<typeof updateProjectNameSchema>, res: Response) => {
    try {
        const { name } = req.body;
        const { projectId } = req.params;

        await ProjectServices.updateProjectById(projectId, { name });
        return sendOk(res, {
            message: "Successfully updated project name",
            data: undefined,
        });
    } catch (err) {
        logger.error("There was an error updating project name", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const pagninatedParams = () =>
    z.strictObject({
        nextCursor: z.string().optional(),
        limit: z.string().optional(),
    });

const getProjectsByUserIdSchema = {
    query: pagninatedParams(),
};

const getProjectsByUserId = async (req: AuthenticatedRequest<typeof getProjectsByUserIdSchema>, res: Response) => {
    try {
        const userId = req.auth.userId;

        if (!userId) {
            res.status(403).send({
                message: "Unauthorised access",
            });
            return;
        }
        const projects = await ProjectServices.getProjectsByUserId(userId);
        return sendOk(res, {
            message: "Successfully fetched projects",
            data: projects,
        });
    } catch (err) {
        logger.error("There was an error fetching projects", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const getSharedProjectsByUserIdSchema = {
    query: pagninatedParams(),
};

const getSharedProjectsByUserId = async (
    req: AuthenticatedRequest<typeof getSharedProjectsByUserIdSchema>,
    res: Response,
) => {
    try {
        const userId = req.auth.userId;

        const projects = await ProjectServices.getSharedProjectsByUserId(userId!);
        return sendOk(res, {
            message: "Successfully fetched shared projects",
            data: projects,
        });
    } catch (err) {
        logger.error("There was an error fetching shared projects", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const getProjectByIdSchema = {
    params: projectIdSchema(),
};

const getProjectById = async (req: ValidatedRequest<typeof getProjectByIdSchema>, res: Response) => {
    const { projectId } = req.params;

    try {
        const project = await ProjectServices.findProjectById(projectId);
        return sendOk(res, {
            message: "Successfully fetched project",
            data: project,
        });
    } catch (err) {
        logger.error("There was an error fetching project", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const addDocumentToProjectSchema = {
    params: projectIdSchema().extend({
        documentId: z.string().min(1, "documentId is required"),
    }),
};

const addDocumentToProject = async (req: ValidatedRequest<typeof addDocumentToProjectSchema>, res: Response) => {
    try {
        const { projectId, documentId } = req.params;

        await ProjectServices.addDocumentToProject(projectId, documentId);
        return sendOk(res, {
            message: "Successfully added document to project",
            data: undefined,
        });
    } catch (err) {
        logger.error("There was an error adding document to project", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const removeDocumentFromProjectSchema = {
    params: projectIdSchema().extend({
        documentId: z.string().min(1, "documentId is required"),
    }),
};

const removeDocumentFromProject = async (
    req: ValidatedRequest<typeof removeDocumentFromProjectSchema>,
    res: Response,
) => {
    const { projectId, documentId } = req.params;

    try {
        await ProjectServices.removeDocumentFromProject(projectId, documentId);
        return sendOk(res, {
            message: "Successfully removed document from project",
            data: undefined,
        });
    } catch (err) {
        logger.error("There was an error removing document from project", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const createNewProjectDocumentSchema = {
    params: projectIdSchema(),
    body: z.strictObject({
        name: z.string().optional(),
    }),
};

const createNewProjectDocument = async (
    req: AuthenticatedRequest<typeof createNewProjectDocumentSchema>,
    res: Response,
) => {
    const { projectId } = req.params;
    const { name } = req.body;
    const userId = req.auth.userId;

    try {
        const document = await DocumentServices.createDocument(userId, name);
        await ProjectServices.addDocumentToProject(projectId, document._id.toString());

        return sendOk(res, {
            message: "Successfully created document and added to project",
            data: document,
        });
    } catch (err) {
        logger.error("There was an error creating document and adding to project", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const deleteProjectSchema = {
    params: projectIdSchema(),
};

const deleteProject = async (req: ValidatedRequest<typeof deleteProjectSchema>, res: Response) => {
    const { projectId } = req.params;

    try {
        await ProjectServices.deleteProjectById(projectId);
        return sendOk(res, {
            message: "Successfully deleted project",
            data: undefined,
        });
    } catch (err) {
        logger.error("There was an error deleting project", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const shareProjectViaEmailSchema = {
    body: projectIdSchema().extend({
        receiverEmail: z.email(),
        contributorType: z.enum(ContributorType),
    }),
};

const shareProjectViaEmail = async (req: ValidatedRequest<typeof shareProjectViaEmailSchema>, res: Response) => {
    try {
        const { receiverEmail, projectId, contributorType } = req.body;

        //we should add the user's email to the project's collaborators list if it isn't there
        await ProjectServices.addCollaborator(projectId, receiverEmail, contributorType);

        logger.info("Sending email", { receiverEmail, projectId, contributorType });
        const mailres = await MailService.sendShareProjectEmail(receiverEmail, projectId, contributorType);
        logger.info("Successfully sent email");

        sendOk(res, {
            message: "Successfully shared project through email",
            data: undefined,
        });
    } catch (err: any) {
        logger.error("Unable to share project through email", { err });
        const e = handleErrorAsAPIError(err, "Unable to share document through email");
        return sendErr(res, e.msg, e.status);
    }
};

const getUserDocumentAccessSchema = {
    params: projectIdSchema(),
    body: z.strictObject({
        userIdentifier: z.email(),
    }),
};

const getUserProjectAccess = async (req: ValidatedRequest<typeof getUserDocumentAccessSchema>, res: Response) => {
    try {
        const { projectId } = req.params;
        const { userIdentifier } = req.body;

        const access = await ProjectServices.isProjectOwnerOrCollaborator(projectId, userIdentifier);
        return sendOk(res, {
            message: "Successfully fetched user project access",
            data: access,
        });
    } catch (err) {
        logger.error("There was an error fetching user project access", { err });
        const e = handleErrorAsAPIError(err);
        return sendErr(res, e.msg, e.status);
    }
};

const removeContributorSchema = {
    params: projectIdSchema(),
    body: projectIdSchema().extend({
        email: z.email(),
    }),
};

const removeContributor = async (req: ValidatedRequest<typeof removeContributorSchema>, res: Response) => {
    try {
        const { projectId, email } = req.body;
        await ProjectServices.removeCollaborator(projectId, email);
        return sendOk(res, {
            message: "Successfully removed contributor",
            data: undefined,
        });
    } catch (err: any) {
        logger.error("Unable to remove contributor", { err });
        const e = handleErrorAsAPIError(err, "Unable to remove contributor");
        return sendErr(res, e.msg, e.status);
    }
};

const updateContributorTypeSchema = {
    params: projectIdSchema(),
    body: projectIdSchema().extend({
        email: z.email(),
        contributorType: z.enum(ContributorType),
    }),
};

const updateContributorType = async (req: ValidatedRequest<typeof updateContributorTypeSchema>, res: Response) => {
    try {
        const { projectId, email, contributorType } = req.body;
        await ProjectServices.changeContributorType(projectId, email, contributorType);
        return sendOk(res, {
            message: "Successfully changed contributor type",
            data: undefined,
        });
    } catch (err: any) {
        logger.error("Unable to change contributor type", { err });
        const e = handleErrorAsAPIError(err, "Unable to change contributor type");
        return sendErr(res, e.msg, e.status);
    }
};

export const ProjectController = defineController({
    CreateProject: {
        con: createProject,
        sch: createProjectSchema,
    },
    UpdateProjectName: {
        con: updateProjectName,
        sch: updateProjectNameSchema,
    },
    GetProjectsByUserId: {
        con: getProjectsByUserId,
        sch: getProjectsByUserIdSchema,
    },
    GetSharedProjectsByUserId: {
        con: getSharedProjectsByUserId,
        sch: getSharedProjectsByUserIdSchema,
    },
    GetProjectById: {
        con: getProjectById,
        sch: getProjectByIdSchema,
    },
    AddDocumentToProject: {
        con: addDocumentToProject,
        sch: addDocumentToProjectSchema,
    },
    RemoveDocumentFromProject: {
        con: removeDocumentFromProject,
        sch: removeDocumentFromProjectSchema,
    },
    CreateNewProjectDocument: {
        con: createNewProjectDocument,
        sch: createNewProjectDocumentSchema,
    },
    DeleteProject: {
        con: deleteProject,
        sch: deleteProjectSchema,
    },
    ShareProjectViaEmail: {
        con: shareProjectViaEmail,
        sch: shareProjectViaEmailSchema,
    },
    GetUserProjectAccess: {
        con: getUserProjectAccess,
        sch: getUserDocumentAccessSchema,
    },
    RemoveProjectCollaborator: {
        con: removeContributor,
        sch: removeContributorSchema,
    },
    UpdateProjectCollaboratorType: {
        con: updateContributorType,
        sch: updateContributorTypeSchema,
    },
});
