import { useAuth } from "@clerk/clerk-react";
import { ContributorType, APIError } from "@cr_docs_t/dts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDocumentApi } from "../api/document";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const documentKeys = {
    all: ["documents"] as const,
    lists: () => [...documentKeys.all, "list"] as const,
    detail: (id: string) => [...documentKeys.all, "detail", id] as const,
};

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

export const useDocuments = () => {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
    const handleError = useApiErrorHandler();

    // Memoize API creation if needed, but usually cheap enough to recreate
    const api = createDocumentApi(getToken);

    const userDocumentsQuery = useQuery({
        queryKey: documentKeys.lists(),
        queryFn: () => api.getDocumentsByUserId(),
    });

    const createDocumentMutation = useMutation({
        mutationFn: api.createDocument,
        onSuccess: () => {
            // Invalidate the list so the new document appears immediately
            queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
        },
        onError: handleError,
    });

    return {
        queries: {
            userDocumentsQuery,
        },
        mutations: {
            createDocumentMutation,
        },
    };
};

export const useDocument = (documentId: string) => {
    const queryClient = useQueryClient();
    const { getToken } = useAuth();
    const handleError = useApiErrorHandler();
    const api = createDocumentApi(getToken);

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
        onError: handleError,
    });

    const shareDocumentMutation = useMutation({
        mutationFn: ({ email, contributorType }: { email: string; contributorType: ContributorType }) =>
            api.shareDocument(documentId, email, contributorType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
        },
        onError: handleError,
    });

    const removeCollaboratorMutation = useMutation({
        mutationFn: (email: string) => api.removeCollaborator(documentId, email),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
        },
        onError: handleError,
    });

    const updateCollaboratorTypeMutation = useMutation({
        mutationFn: ({ email, contributorType }: { email: string; contributorType: ContributorType }) =>
            api.updateCollaboratorType(documentId, email, contributorType),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
        },
        onError: handleError,
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
