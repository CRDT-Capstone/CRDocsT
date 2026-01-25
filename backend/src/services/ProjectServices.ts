import { ProjectModel } from "../models/Project.schema";
import { Project } from "../types/types";

const createProject = async (userId: string | null) => {
    const project = await ProjectModel.create({ ownerId: userId });
    return project;
};

const findProjectById = async (projectId: string) => {
    const project = await ProjectModel.findById(projectId);
    return project;
};

const updateProjectById = async (projectId: string, updateObj: Partial<Project>) => {
    await ProjectModel.findOneAndUpdate({ _id: projectId }, updateObj);
};

const getProjectsByUserId = async (userId: string) => {
    const projects = await ProjectModel.find({ ownerId: userId });
    return projects;
};

const addDocumentToProject = async (projectId: string, documentId: string) => {
    await ProjectModel.findByIdAndUpdate(projectId, { $push: { documentIds: documentId } });
};

const removeDocumentFromProject = async (projectId: string, documentId: string) => {
    await ProjectModel.findByIdAndUpdate(projectId, { $pull: { documentIds: documentId } });
};

export const ProjectServices = {
    createProject,
    findProjectById,
    updateProjectById,
    getProjectsByUserId,
    addDocumentToProject,
    removeDocumentFromProject,
};
