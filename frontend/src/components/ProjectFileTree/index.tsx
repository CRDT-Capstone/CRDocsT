import { useEffect } from "react";
import { Document, Project } from "@cr_docs_t/dts";
import { useProject } from "../../hooks/queries";
import useModal, { Modal } from "../../hooks/modal";
import BaseFileTree, { FileTreeItemType } from "../BaseFileTree";
import mainStore from "../../stores";

interface ProjectFileTreeProps {
    projectId: string;
    projectQueriesAndMutations: ReturnType<typeof useProject>;
    handleItemClick: (item: Document | Project, type: FileTreeItemType) => void;
    handleItemDelete: (item: Document | Project, type: FileTreeItemType) => Promise<void>;
    handleItemCreate: (name: string, type: FileTreeItemType) => Promise<void>;
    handleItemRename: (name: string, item: Document | Project, type: FileTreeItemType) => Promise<void>;
    handleDownload?: () => Promise<void>;
    isSharedProject?: boolean;
}

export const ProjectFileTree = ({
    projectId,
    projectQueriesAndMutations,
    handleItemClick,
    handleItemDelete,
    handleItemCreate,
    handleDownload,
    handleItemRename
}: ProjectFileTreeProps) => {
    const setProject = mainStore((state) => state.setProject);
    const { modalRef, showModal, closeModal } = useModal();

    const { queries } = projectQueriesAndMutations;
    const { projectQuery } = queries;

    useEffect(() => {
        if (projectId && projectQuery.data) setProject(projectQuery.data.project);
    }, [projectId, projectQuery.data]);

    useEffect(() => {
        projectQuery.refetch();
        const docs = queries.projectQuery.data?.documents || [];
    }, []);

    const projectDocs = queries.projectQuery.data?.documents || [];

    return (
        <BaseFileTree
            modalTitle="Add Document to Project"
            closeModal={closeModal}
            modalRef={modalRef}
            ModalComponent={Modal}
            onSubmitItem={handleItemCreate}
            hideProjectOption={true}
            sections={[
                {
                    name: "Project Files",
                    isLoading: queries.projectQuery.isLoading,
                    documents: projectDocs,
                    projects: undefined,
                    modifiable: true,
                    onAddClick: showModal,
                    onItemClick: handleItemClick,
                    onItemDelete: handleItemDelete,
                    onDownload: handleDownload,
                    onItemRename: handleItemRename,
                },
            ]}
        />
    );
};
