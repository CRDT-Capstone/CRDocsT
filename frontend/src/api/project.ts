import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { ContributorType, Project, f, Msg, CursorPaginatedResponse, ProjectWithDocuments } from "@cr_docs_t/dts";

const ApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const path = "projects";

type TokenFunc = () => Promise<string | null>;

const includeToken = (token: string | null) => {
    return { Authorization: `Bearer ${token}` };
};

export const createProjectApi = (getToken: TokenFunc) => {
    const navigate = useNavigate();

    const createProject = async (name?: string) => {
        try {
            const token = await getToken();

            const response = await f.post<Msg<Project>, { name: string | undefined }>(
                `${ApiBaseUrl}/${path}/create`,
                { name: name },
                {
                    headers: {
                        ...includeToken(token),
                    },
                },
            );

            const project = response.data;
            return response;
        } catch (err) {
            console.error("There was an error creating a project -> ", err);
            throw err;
            //TODO: change this to some daisy UI element
        }
    };

    const deleteProject = async (projectId: string) => {
        try {
            const token = await getToken();
            const response = await f.delete<Msg>(`${ApiBaseUrl}/${path}/delete/${projectId}`, {
                headers: {
                    Authorization: `Bearer: ${token}`,
                },
            });

            return response;
        } catch (err) {
            console.error("There was an error deleting the project -> ", err);
            throw err;
        }
    };

    const updateProjectName = async (newProjName: string, projectID: string) => {
        try {
            const token = await getToken();

            const response = await f.put<Msg, { name: string }>(
                `${ApiBaseUrl}/${path}/update/${projectID}`,
                { name: newProjName },
                {
                    headers: {
                        ...includeToken(token),
                    },
                },
            );

            return response;
        } catch (err) {
            console.error("There was an error updating project name -> ", err);
            throw err;
            //TODO: change this to some daisy UI element
        }
    };

    const getProjectsByUserId = async (limit: number = 10, nextCursor?: string) => {
        try {
            const token = await getToken();
            const queryParams = new URLSearchParams({ limit: limit.toString() });
            if (nextCursor) {
                queryParams.append("nextCursor", nextCursor);
            }

            const response = await f.get<Msg<CursorPaginatedResponse<Project>>>(
                `${ApiBaseUrl}/${path}/user?${queryParams.toString()}`,
                {
                    headers: {
                        ...includeToken(token),
                    },
                },
            );

            return response.data;
        } catch (err) {
            console.error("There was an error retrieving projects-> ", err);
            throw err;
            //TODO: change this to some daisy UI element
        }
    };

    const getSharedProjectsByUserId = async (limit: number = 10, nextCursor?: string) => {
        try {
            const token = await getToken();
            const queryParams = new URLSearchParams({ limit: limit.toString() });
            if (nextCursor) {
                queryParams.append("nextCursor", nextCursor);
            }

            const response = await f.get<Msg<CursorPaginatedResponse<Project>>>(
                `${ApiBaseUrl}/${path}/shared-with-me?${queryParams.toString()}`,
                {
                    headers: {
                        ...includeToken(token),
                    },
                },
            );

            return response.data;
        } catch (err) {
            console.error("There was an error retrieving projects-> ", err);
            throw err;
            //TODO: change this to some daisy UI element
        }
    };

    const getProjectById = async (projectId: string) => {
        const token = await getToken();

        const response = await f.get<Msg<ProjectWithDocuments>>(`${ApiBaseUrl}/${path}/${projectId}`, {
            headers: {
                ...includeToken(token),
            },
        });

        const projectWDocs = response.data;
        return projectWDocs;
    };

    const createAndNavigateToProject = async (name?: string) => {
        const projId = await createProject(name);
        if (projId) {
            navigate(`/projects/${projId}`);
        }
    };

    const shareProject = async (projectId: string, email: string, contributorType: ContributorType) => {
        try {
            const token = await getToken();

            const response = await f.post<
                Msg,
                { receiverEmail: string; projectId: string; contributorType: ContributorType }
            >(
                `${ApiBaseUrl}/${path}/share`,
                {
                    receiverEmail: email,
                    projectId,
                    contributorType,
                },
                {
                    headers: {
                        ...includeToken(token),
                    },
                },
            );
            return response;
        } catch (err) {
            console.error("Unable to share project -> ", err);
            throw err;
        }
    };

    const removeCollaborator = async (projectId: string, email: string) => {
        try {
            const token = await getToken();

            const res = await f.post<Msg, { projectId: string; email: string }>(
                `${ApiBaseUrl}/${path}/${projectId}/remove-collaborator`,
                {
                    projectId: projectId,
                    email: email,
                },
                {
                    headers: {
                        ...includeToken(token),
                    },
                },
            );

            return res;
        } catch (err) {
            console.error("Unable to remove collaborator -> ", err);
            throw err;
        }
    };

    const updateCollaboratorType = async (projectId: string, email: string, collaboratorType: ContributorType) => {
        try {
            const token = await getToken();

            const res = await f.post<Msg, { projectId: string; email: string; contributorType: ContributorType }>(
                `${ApiBaseUrl}/${path}/${projectId}/update-collaborator-type`,
                {
                    projectId: projectId,
                    email: email,
                    contributorType: collaboratorType,
                },
                {
                    headers: {
                        ...includeToken(token),
                    },
                },
            );

            return res;
        } catch (err) {
            console.error("Unable to update collaborator type -> ", err);
            throw err;
        }
    };

    const getUserProjectAccess = async (projectId: string, userIdentifier: string | undefined) => {
        try {
            const token = await getToken();
            const res = await f.post<
                Msg<{ hasAccess: boolean; contributorType: ContributorType | undefined }>,
                { userIdentifier: string | undefined }
            >(
                `${ApiBaseUrl}/${path}/${projectId}/check-access`,
                {
                    userIdentifier: userIdentifier,
                },
                {
                    headers: {
                        ...includeToken(token),
                    },
                },
            );

            return res;
        } catch (err) {
            console.error("Unable to get user project access -> ", err);
            throw err;
        }
    };

    const createProjectDocument = async (projectId: string, documentName: string | undefined) => {
        try {
            const token = await getToken();

            const res = await f.post<Msg<{ documentId: string }>, { name: string | undefined }>(
                `${ApiBaseUrl}/${path}/${projectId}/create-document`,
                { name: documentName },
                {
                    headers: {
                        ...includeToken(token),
                    },
                },
            );

            return res;
        } catch (err) {
            console.error("There was an error creating a project document -> ", err);
            throw err;
        }
    };

    const removeProjectDocument = async (projectId: string, documentId: string) => {
        try {
            const token = await getToken();

            const res = await f.delete<Msg>(`${ApiBaseUrl}/${path}/${projectId}/remove-document/${documentId}`, {
                headers: {
                    ...includeToken(token),
                },
            });

            return res;
        } catch (err) {
            console.error("There was an error removing a project document -> ", err);
            throw err;
        }
    };

    return {
        createProject,
        deleteProject,
        createProjectDocument,
        removeProjectDocument,
        updateProjectName,
        getProjectsByUserId,
        getSharedProjectsByUserId,
        getProjectById,
        createAndNavigateToProject,
        shareProject,
        removeCollaborator,
        updateCollaboratorType,
        getUserProjectAccess,
    };
};
