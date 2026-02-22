import { APIError, Project, ContributorType, CursorPaginatedResponse, ProjectWithDocuments } from "@cr_docs_t/dts";
import { DocumentModel } from "../models/Document.schema";
import { ProjectModel } from "../models/Project.schema";
import mongoose, { RootFilterQuery } from "mongoose";
import { ObjectId } from "mongodb";
import { UserService } from "./UserService";
import { logger } from "../logging";

const createProject = async (userId: string | null, name?: string) => {
    const project = await ProjectModel.create({ ownerId: userId, name });
    return project;
};

const findProjectById = async (projectId: string) => {
    // Get project
    const project = await ProjectModel.findById(projectId);

    if (!project) {
        throw new APIError("Project not found", 404);
    }

    // Get documents
    const documents = await DocumentModel.find({ _id: { $in: project.documentIds || [] } });

    const projectWithDocuments: ProjectWithDocuments = {
        project,
        documents,
    };

    return projectWithDocuments;
};

const updateProjectById = async (projectId: string, updateObj: Partial<Project>) => {
    await ProjectModel.findOneAndUpdate({ _id: projectId }, updateObj);
};

const getProjectsByUserId = async (
    userId: string,
    limit: number = 10,
    currentCursor?: string,
): Promise<CursorPaginatedResponse<Project>> => {
    // const projects = await ProjectModel.find({ ownerId: userId });
    // return projects;

    //current cursor is the id of the last document from a previous pagination...
    const query: RootFilterQuery<Project> = {
        ownerId: userId,
    };

    if (currentCursor) {
        query._id = { $lt: new ObjectId(currentCursor) };
    }

    const projects = await ProjectModel.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1);
    const hasNext = projects.length > limit;
    if (hasNext) projects.pop();
    const nextCursor = projects[limit - 1]?._id.toString() || undefined;

    return {
        data: projects,
        nextCursor,
        hasNext,
    };
};

const getSharedProjectsByUserId = async (userId: string, limit: number = 10, currentCursor?: string) => {
    const userEmail = (await UserService.getUserEmailById(userId)) || "";
    const query: RootFilterQuery<Project> = {
        $and: [
            { "contributors.email": userEmail },
            { ownerId: { $ne: userId } }, // Exclude projects owned by the user
        ],
    };

    if (currentCursor) {
        query._id = { $lt: new ObjectId(currentCursor) };
    }

    const projects = await ProjectModel.find(query)
        .sort({ _id: -1 })
        .limit(limit + 1);
    const hasNext = projects.length > limit;
    if (hasNext) projects.pop();
    const nextCursor = projects[limit - 1]?._id.toString() || undefined;

    return {
        data: projects,
        nextCursor,
        hasNext,
    };
};

const addDocumentToProject = async (projectId: string, documentId: string) => {
    const sess = await mongoose.startSession();
    try {
        await sess.withTransaction(async () => {
            // Add the document ID to the project's documentIds array
            await ProjectModel.findByIdAndUpdate(projectId, { $push: { documentIds: documentId } }, { session: sess });
            // Update the document's projectId field to reference the project
            await DocumentModel.findByIdAndUpdate(documentId, { projectId }, { session: sess });
        });
    } finally {
        await sess.endSession();
    }
};

const removeDocumentFromProject = async (projectId: string, documentId: string) => {
    const sess = await mongoose.startSession();
    try {
        await sess.withTransaction(async () => {
            // Remove the document ID from the project's documentIds array and delete the document itself
            await ProjectModel.findByIdAndUpdate(projectId, { $pull: { documentIds: documentId } }, { session: sess });
            // Delete the document from the Document collection
            await DocumentModel.findByIdAndDelete(documentId, { session: sess });
        });
    } finally {
        await sess.endSession();
    }
};

const deleteProjectById = async (projectId: string) => {
    // Find and delete all documents associated with the project before deleting the project itself
    const documentIds = await ProjectModel.findById(projectId).then((project) => project?.documentIds || []);
    await DocumentModel.deleteMany({ _id: { $in: documentIds } });
    await ProjectModel.findByIdAndDelete(projectId);
};

const addCollaborator = async (projectId: string, contributorEmail: string, contributionType: ContributorType) => {
    try {
        const user = await UserService.getUserByEmail(contributorEmail);
        logger.debug("Adding user as collaborator", {
            documentId: projectId,
            contributorEmail,
            contributionType,
            user,
        });

        // Use a transaction to ensure both project and document updates succeed or fail together
        const sess = await mongoose.startSession();
        try {
            await sess.withTransaction(async () => {
                // Add user as contributor to the project
                const filter = {
                    _id: projectId,
                    "contributors.email": { $ne: contributorEmail },
                    ...(user && { ownerId: { $ne: user.id } }),
                };
                const updatedProject = await ProjectModel.findOneAndUpdate(
                    filter,
                    {
                        $push: {
                            contributors: {
                                email: contributorEmail,
                                contributorType: contributionType,
                            },
                        },
                    },
                    {
                        new: true,
                        session: sess,
                    },
                );

                if (!updatedProject) {
                    throw new APIError("Project not found or user is already a contributor", 400);
                }

                // Add user as contributor to all documents in the project
                const documentIds = updatedProject.documentIds;
                await DocumentModel.updateMany(
                    { _id: { $in: documentIds }, "contributors.email": { $ne: contributorEmail } },
                    {
                        $push: {
                            contributors: {
                                email: contributorEmail,
                                contributorType: contributionType,
                            },
                        },
                    },
                    {
                        session: sess,
                    },
                );
            });
        } finally {
            await sess.endSession();
        }
    } catch (err) {
        logger.error("Error adding user as collaborator", { err });
        if (err instanceof APIError) {
            throw err;
        }
        const e = err as Error;
        throw new APIError(e.message || "Error adding user as collaborator", 500);
    }
};

const removeCollaborator = async (projectId: string, contributorEmail: string) => {
    try {
        const sess = await mongoose.startSession();
        try {
            await sess.withTransaction(async () => {
                // Remove user as contributor from the project
                const filter = {
                    _id: projectId,
                };
                const update = {
                    $pull: {
                        contributors: {
                            email: contributorEmail,
                        },
                    },
                };
                const updatedProject = await ProjectModel.findOneAndUpdate(filter, update, {
                    new: true,
                    session: sess,
                });

                if (!updatedProject) {
                    throw new APIError("Project not found", 400);
                }

                // Remove user as contributor from all documents in the project
                const documentIds = updatedProject.documentIds;
                await DocumentModel.updateMany(
                    { _id: { $in: documentIds } },
                    {
                        $pull: {
                            contributors: {
                                email: contributorEmail,
                            },
                        },
                    },
                    {
                        session: sess,
                    },
                );
            });
        } finally {
            await sess.endSession();
        }
    } catch (err) {
        logger.error("Error removing user as collaborator", { err });
        if (err instanceof APIError) {
            throw err;
        }
        const e = err as Error;
        throw new APIError(e.message || "Error removing user as collaborator", 500);
    }
};

const changeContributorType = async (projectId: string, email: string, contributorType: ContributorType) => {
    try {
        const sess = await mongoose.startSession();
        try {
            // Update project contributor type
            const res = await ProjectModel.findOneAndUpdate(
                { _id: projectId, "contributors.email": email },
                { $set: { "contributors.$.contributorType": contributorType } },
                { session: sess },
            );

            if (!res) {
                throw new APIError("Project not found or user is not a contributor", 400);
            }

            // Update document contributor type for all documents in the project
            const documentIds = res.documentIds;
            await DocumentModel.updateMany(
                { _id: { $in: documentIds }, "contributors.email": email },
                { $set: { "contributors.$.contributorType": contributorType } },
                { session: sess },
            );
        } finally {
            await sess.endSession();
        }
    } catch (err) {
        logger.error("Error changing contributor type", { err });
        if (err instanceof APIError) {
            throw err;
        }
        const e = err as Error;
        throw new APIError(e.message || "Error changing contributor type", 500);
    }
};

const isProjectOwner = async (projectId: string, userId: string) => {
    const project = await ProjectModel.findById(projectId);
    if (!project || !project.ownerId) return false;
    return project.ownerId === userId;
};

type IsProjectOwnerOrCollaboratorReturn = { hasAccess: boolean; contributorType: ContributorType | undefined };
const isProjectOwnerOrCollaborator = async (
    projectId: string,
    userId: string,
): Promise<IsProjectOwnerOrCollaboratorReturn> => {
    logger.debug("Checking if user is owner or collaborator", { projectId, userId });
    const project = await ProjectModel.findById(projectId);
    logger.debug("Project", { project });

    if (!project) throw Error("Project does not exist!");
    if (!project.ownerId) return { hasAccess: true, contributorType: ContributorType.EDITOR };

    const user = await UserService.getUserByEmail(userId);

    let isProjectOwnerOrCollaborator = false;
    const foundContributor = project.contributors.find((contributor) => contributor.email === userId);
    if ((user && project.ownerId === user.id) || (project.contributors.length > 0 && foundContributor)) {
        isProjectOwnerOrCollaborator = true;
    }
    logger.debug("Is Project Owner or Collaborator", { isProjectOwnerOrCollaborator });

    if (!isProjectOwnerOrCollaborator) return { hasAccess: false, contributorType: undefined };

    let contributorType: ContributorType;
    if (project.ownerId === user!.id) {
        contributorType = ContributorType.EDITOR;
    } else {
        const contributor = foundContributor;
        contributorType = contributor!.contributorType;
    }

    logger.info({ isDocumentOwnerOrCollaborator: isProjectOwnerOrCollaborator, contributorType });
    return { hasAccess: isProjectOwnerOrCollaborator, contributorType: contributorType };
};

export const ProjectServices = {
    createProject,
    findProjectById,
    updateProjectById,
    getProjectsByUserId,
    getSharedProjectsByUserId,
    addDocumentToProject,
    removeDocumentFromProject,
    deleteProjectById,
    addCollaborator,
    removeCollaborator,
    changeContributorType,
    isProjectOwner,
    isProjectOwnerOrCollaborator,
};
