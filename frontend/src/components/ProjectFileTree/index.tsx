import React, { useEffect, useState } from "react";
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
import mainStore from "../../stores";

interface ProjectFileTreeProps {
    projectId: string;
    projectQueriesAndMutations: ReturnType<typeof useProject>;
    handleItemClick: (item: Document | Project, type: FileTreeItemType) => void;
    handleItemDelete: (item: Document | Project, type: FileTreeItemType) => Promise<void>;
    handleItemCreate: (name: string, type: FileTreeItemType) => Promise<void>;
    isSharedProject?: boolean;
}

export const ProjectFileTree = ({
    projectId,
    projectQueriesAndMutations,
    handleItemClick,
    handleItemDelete,
    handleItemCreate,
}: ProjectFileTreeProps) => {
    const nav = useNavigate();
    const setProject = mainStore((state) => state.setProject);
    const { Modal, showModal, closeModal } = useModal();

    const { queries } = projectQueriesAndMutations;
    const { projectQuery } = queries;

    useEffect(() => {
        if (projectId && projectQuery.data) setProject(projectQuery.data.project);
    }, [projectId, projectQuery.data]);

    useEffect(() => {
        projectQuery.refetch();
    }, []);

    const projectDocs = queries.projectQuery.data?.documents || [];

    return (
        <BaseFileTree
            modalTitle="Add Document to Project"
            closeModal={closeModal}
            ModalComponent={Modal}
            onSubmitItem={handleItemCreate}
            hideProjectOption={true} // Only allow adding documents inside a project
            sections={[
                {
                    name: "Project Files",
                    isLoading: queries.projectQuery.isLoading,
                    documents: projectDocs,
                    projects: undefined, // Hide the projects toggle entirely
                    modifiable: true,
                    onAddClick: showModal,
                    onItemClick: handleItemClick,
                    onItemDelete: handleItemDelete,
                },
            ]}
        />
    );
};
