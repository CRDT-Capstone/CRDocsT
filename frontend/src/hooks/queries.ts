import { useAuth } from "@clerk/clerk-react";
import { ContributorType, APIError } from "@cr_docs_t/dts";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDocumentApi } from "../api/document";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createProjectApi } from "../api/project";

const useApiErrorHandler = () => {
    const nav = useNavigate();

    return (err: unknown) => {
        const apiError = err as APIError;
        if (apiError.status === 401 || apiError.status === 403) {
            nav("/sign-in");
        } else {
            console.error("API Error:", apiError.message || err);
            toast.error(apiError.message || "An unexpected error occurred");
        }
    };
};

// Document queries and mutations

export const documentKeys = {
    all: ["documents"] as const,
    lists: () => [...documentKeys.all, "list"] as const,
    shared: () => [...documentKeys.all, "shared"] as const,
    detail: (id: string) => [...documentKeys.all, "detail", id] as const,
};

export const useDocuments = () => {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
    const handleError = useApiErrorHandler();

    const api = createDocumentApi(getToken);
    queryClient.setMutationDefaults([documentKeys.lists()], {
        onError: handleError,
    });

    const userDocumentsQuery = useInfiniteQuery({
        queryKey: documentKeys.lists(),
        queryFn: ({ pageParam }) => api.getDocumentsByUserId(10, pageParam === null ? undefined : pageParam),
        initialPageParam: null as string | null,
        placeholderData: keepPreviousData,
        getNextPageParam: (lastPage) => {
            return lastPage.nextCursor ?? null;
        },
    });

    const sharedDocumentsQuery = useInfiniteQuery({
        queryKey: documentKeys.shared(),
        queryFn: ({ pageParam }) => api.getSharedDocumentsByUserId(10, pageParam === null ? undefined : pageParam),
        initialPageParam: null as string | null,
        placeholderData: keepPreviousData,
        getNextPageParam: (lastPage) => {
            return lastPage.nextCursor ?? null;
        },
    });

    const createDocumentMutation = useMutation({
        mutationFn: api.createDocument,
        onSuccess: () => {
            // Invalidate the list so the new document appears immediately
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
        },
    });

    const deleteDocumentMutation = useMutation({
        mutationFn: (documentId: string) => api.deleteDocument(documentId),
        onSuccess: () => {
            // Invalidate the list so the deleted document disappears immediately
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
        },
    });

    return {
        queries: {
            userDocumentsQuery,
            sharedDocumentsQuery,
        },
        mutations: {
            createDocumentMutation,
            deleteDocumentMutation,
        },
    };
};

export const useDocument = (documentId: string) => {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
    const handleError = useApiErrorHandler();
    const api = createDocumentApi(getToken);
    queryClient.setMutationDefaults([documentKeys.lists()], {
        onError: handleError,
    });

    const documentQuery = useQuery({
        queryKey: documentKeys.detail(documentId),
        queryFn: () => api.getDocumentById(documentId),
        enabled: !!documentId,
    });

    const updateDocumentNameMutation = useMutation({
        mutationFn: (newName: string) => api.updateDocumentName(newName, documentId),
        onSuccess: () => {
            // Invalidate specific document AND the list (since list shows names)
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
        },
    });

    const shareDocumentMutation = useMutation({
        mutationFn: ({ email, contributorType }: { email: string; contributorType: ContributorType }) =>
            api.shareDocument(documentId, email, contributorType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
        },
    });

    const removeCollaboratorMutation = useMutation({
        mutationFn: (email: string) => api.removeCollaborator(documentId, email),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
        },
    });

    const updateCollaboratorTypeMutation = useMutation({
        mutationFn: ({ email, contributorType }: { email: string; contributorType: ContributorType }) =>
            api.updateCollaboratorType(documentId, email, contributorType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
        },
    });

    return {
        queries: { documentQuery },
        mutations: {
            updateDocumentNameMutation,
            shareDocumentMutation,
            removeCollaboratorMutation,
            updateCollaboratorTypeMutation,
        },
    };
};

// Project queries and mutations

export const projectKeys = {
    all: ["projects"] as const,
    lists: () => [...projectKeys.all, "list"] as const,
    shared: () => [...projectKeys.all, "shared"] as const,
    detail: (id: string) => [...projectKeys.all, "detail", id] as const,
};

export const useProjects = () => {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
    const handleError = useApiErrorHandler();

    const api = createProjectApi(getToken);
    queryClient.setMutationDefaults([documentKeys.lists()], {
        onError: handleError,
    });

    const userProjectsQuery = useInfiniteQuery({
        queryKey: projectKeys.lists(),
        queryFn: ({ pageParam }) => api.getProjectsByUserId(10, pageParam === null ? undefined : pageParam),
        initialPageParam: null as string | null,
        placeholderData: keepPreviousData,
        getNextPageParam: (lastPage) => {
            return lastPage.nextCursor ?? null;
        },
    });

    const sharedProjectsQuery = useInfiniteQuery({
        queryKey: projectKeys.shared(),
        queryFn: ({ pageParam }) => api.getSharedProjectsByUserId(10, pageParam === null ? undefined : pageParam),
        initialPageParam: null as string | null,
        placeholderData: keepPreviousData,
        getNextPageParam: (lastPage) => {
            return lastPage.nextCursor ?? null;
        },
    });

    const createProjectMutation = useMutation({
        mutationFn: api.createProject,
        onSuccess: () => {
            // Invalidate the list so the new project appears immediately
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });

    const deleteProjectMutation = useMutation({
        mutationFn: (projectId: string) => api.deleteProject(projectId),
        onSuccess: () => {
            // Invalidate the list so the deleted project disappears immediately
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });

    return {
        queries: {
            userProjectsQuery,
            sharedProjectsQuery,
        },
        mutations: {
            createProjectMutation,
            deleteProjectMutation,
        },
    };
};

export const useProject = (projectId: string) => {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
    const handleError = useApiErrorHandler();
    const api = createProjectApi(getToken);
    queryClient.setMutationDefaults([projectKeys.lists()], {
        onError: handleError,
    });

    const projectQuery = useQuery({
        queryKey: projectKeys.detail(projectId),
        queryFn: () => api.getProjectById(projectId),
        enabled: !!projectId,
    });

    const updateProjectNameMutation = useMutation({
        mutationFn: (newName: string) => api.updateProjectName(newName, projectId),
        onSuccess: () => {
            // Invalidate specific project AND the list (since list shows names)
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });

    const shareProjectMutation = useMutation({
        mutationFn: ({ email, contributorType }: { email: string; contributorType: ContributorType }) =>
            api.shareProject(projectId, email, contributorType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        },
    });

    const removeCollaboratorMutation = useMutation({
        mutationFn: (email: string) => api.removeCollaborator(projectId, email),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        },
    });

    const updateCollaboratorTypeMutation = useMutation({
        mutationFn: ({ email, contributorType }: { email: string; contributorType: ContributorType }) =>
            api.updateCollaboratorType(projectId, email, contributorType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        },
    });

    const createProjectDocumentMutation = useMutation({
        mutationFn: (documentName: string | undefined) => api.createProjectDocument(projectId, documentName),
        onSuccess: () => {
            // Invalidate project details and all project lists
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });

    const removeProjectDocumentMutation = useMutation({
        mutationFn: (documentId: string) => api.removeProjectDocument(projectId, documentId),
        onSuccess: () => {
            // Invalidate project details and all project lists
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
            queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        },
    });

    return {
        queries: { projectQuery },
        mutations: {
            updateProjectNameMutation,
            shareProjectMutation,
            removeCollaboratorMutation,
            updateCollaboratorTypeMutation,
            createProjectDocumentMutation,
            removeProjectDocumentMutation,
        },
    };
};
