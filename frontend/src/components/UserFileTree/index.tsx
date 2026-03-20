import { useEffect } from "react";
import { Document, Project } from "@cr_docs_t/dts";
import { useDocuments, useProjects } from "../../hooks/queries";
import useModal, { Modal } from "../../hooks/modal";
import BaseFileTree, { FileTreeItemType } from "../BaseFileTree";
import { usePresenceUpdate } from "../../hooks/presence";

interface UserFileTreeProps {
    handleItemClick: (item: Document | Project, type: FileTreeItemType) => void;
    handleItemDelete: (item: Document | Project, type: FileTreeItemType) => Promise<void>;
    handleItemCreate: (name: string, type: FileTreeItemType) => Promise<void>;
}

const UserFileTree = ({ handleItemClick, handleItemCreate, handleItemDelete }: UserFileTreeProps) => {
    const { modalRef, showModal, closeModal } = useModal();

    const { queries: docQ } = useDocuments();
    const { queries: projQ } = useProjects();

    // Flatten paginated data
    const userDocs = docQ.userDocumentsQuery.data?.pages.flatMap((p) => p.data) || [];
    const userProjs = projQ.userProjectsQuery.data?.pages.flatMap((p) => p.data) || [];
    const sharedDocs = docQ.sharedDocumentsQuery.data?.pages.flatMap((p) => p.data) || [];
    const sharedProjs = projQ.sharedProjectsQuery.data?.pages.flatMap((p) => p.data) || [];

    const isUserLoading = docQ.userDocumentsQuery.isLoading || projQ.userProjectsQuery.isLoading;
    const isSharedLoading = docQ.sharedDocumentsQuery.isLoading || projQ.sharedProjectsQuery.isLoading;


    const load = () => {
        docQ.userDocumentsQuery.refetch();
        docQ.sharedDocumentsQuery.refetch();
        projQ.userProjectsQuery.refetch();
        projQ.userProjectsQuery.refetch();
    };

    useEffect(() => {
        load();

    }, []);

    return (
        <BaseFileTree
            modalTitle="Add New Workspace Item"
            closeModal={closeModal}
            ModalComponent={Modal}
            modalRef={modalRef}
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
