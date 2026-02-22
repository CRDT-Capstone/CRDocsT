import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "@tanstack/react-form";
import { Document, Project } from "@cr_docs_t/dts";
import {
    LuChevronLeft,
    LuFileText,
    LuFolder,
    LuPlus,
    LuTrash2,
    LuMenu,
    LuChevronDown,
    LuChevronRight,
} from "react-icons/lu";

import { useDocuments, useProjects, useProject } from "../../hooks/queries";
import useModal from "../../hooks/modal";
import BaseFileTree, { FileTreeItemType } from "../BaseFileTree";
import { useClerk, useSession } from "@clerk/clerk-react";

interface UserFileTreeProps {
    handleItemClick: (item: Document | Project, type: FileTreeItemType) => void;
    handleItemDelete: (item: Document | Project, type: FileTreeItemType) => Promise<void>;
    handleItemCreate: (name: string, type: FileTreeItemType) => Promise<void>;
}

const UserFileTree = ({ handleItemClick, handleItemCreate, handleItemDelete }: UserFileTreeProps) => {
    const nav = useNavigate();
    const { user } = useClerk();
    const { Modal, showModal, closeModal } = useModal();

    // Fetch global user queries and mutations
    const { queries: docQ, mutations: docM } = useDocuments();
    const { queries: projQ, mutations: projM } = useProjects();

    const userDocs = docQ.userDocumentsQuery.data?.pages.flatMap((p) => p.data) || [];
    const userProjs = projQ.userProjectsQuery.data?.pages.flatMap((p) => p.data) || [];
    const sharedDocs = docQ.sharedDocumentsQuery.data?.pages.flatMap((p) => p.data) || [];
    const sharedProjs = projQ.sharedProjectsQuery.data?.pages.flatMap((p) => p.data) || [];

    const isUserLoading = docQ.userDocumentsQuery.isLoading || projQ.userProjectsQuery.isLoading;
    const isSharedLoading = docQ.sharedDocumentsQuery.isLoading || projQ.sharedProjectsQuery.isLoading;

    return (
        <BaseFileTree
            modalTitle="Add New Workspace Item"
            closeModal={closeModal}
            ModalComponent={Modal}
            onSubmitItem={handleItemCreate}
            sections={[
                {
                    name: "My Documents",
                    isLoading: isUserLoading,
                    documents: userDocs,
                    projects: userProjs,
                    modifiable: true,
                    onAddClick: showModal,
                    onItemClick: handleItemClick,
                    onItemDelete: handleItemDelete,
                },
                {
                    name: "Shared with me",
                    isLoading: isSharedLoading,
                    documents: sharedDocs,
                    projects: sharedProjs,
                    modifiable: false,
                    onItemClick: handleItemClick,
                },
            ]}
        />
    );
};

export default UserFileTree;
