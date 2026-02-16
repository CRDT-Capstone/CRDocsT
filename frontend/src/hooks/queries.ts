import { useAuth } from "@clerk/clerk-react";
import { ContributorType, APIError } from "@cr_docs_t/dts";
import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDocumentApi } from "../api/document";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const documentKeys = {
    all: ["documents"] as const,
    lists: () => [...documentKeys.all, "list"] as const,
    listsPaginated: (page: string) => [documentKeys.all, "list", page] as const,
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
