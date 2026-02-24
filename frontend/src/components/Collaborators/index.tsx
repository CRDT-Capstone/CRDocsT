import { useState, useEffect } from "react";
import { ContributorType, Contributor } from "@cr_docs_t/dts";
import { LuTrash2 } from "react-icons/lu";
import { useDocument, useProject } from "../../hooks/queries";
import mainStore from "../../stores";
import { toast } from "sonner";
import useModal, { Modal } from "../../hooks/modal";

interface BaseCollaboratorsProps {
    collaborators: Contributor[];
    removeCollaborator: (collaborator: Contributor) => Promise<void>;
    updateCollaboratorType: (collaborator: Contributor, type: ContributorType) => Promise<void>;
}

const BaseCollaborators = ({ collaborators, removeCollaborator, updateCollaboratorType }: BaseCollaboratorsProps) => {
    const { modalRef, showModal, closeModal } = useModal();

    return (
        <>
            <div
                className="flex items-center -space-x-6 transition-opacity cursor-pointer hover:opacity-80 avatar-group rtl:space-x-reverse"
                onClick={showModal}
                role="button"
                tabIndex={0}
                aria-label="Manage collaborators"
            >
                {collaborators.slice(0, 5).map((collaborator) => (
                    <div key={collaborator.email} className="avatar avatar-placeholder">
                        <div className="w-10 bg-neutral text-neutral-content">
                            <span className="text-xl font-medium">{collaborator.email[0].toUpperCase()}</span>
                        </div>
                    </div>
                ))}
                {collaborators.length > 5 && (
                    <div className="avatar avatar-placeholder border-base-100">
                        <div className="w-10 bg-neutral text-neutral-content">
                            <span className="text-xs">+{collaborators.length - 5}</span>
                        </div>
                    </div>
                )}
            </div>

            <Modal ref={modalRef} title="Manage Collaborators">
                <div className="flex flex-col gap-4">
                    {collaborators.map((collaborator) => (
                        <div
                            key={collaborator.email}
                            className="flex flex-col gap-3 justify-between p-3 rounded-lg sm:flex-row sm:items-center bg-base-200/50"
                        >
                            <div className="flex gap-3 items-center">
                                <div className="avatar avatar-placeholder">
                                    <div className="w-10 rounded-full bg-neutral text-neutral-content">
                                        <span>{collaborator.email[0].toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="flex overflow-hidden flex-col">
                                    <span className="font-medium truncate max-w-50" title={collaborator.email}>
                                        {collaborator.email}
                                    </span>
                                    <span className="text-xs text-base-content/60">
                                        Current access: {collaborator.contributorType}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 items-center">
                                <select
                                    className="w-full sm:w-auto select select-bordered select-sm"
                                    value={collaborator.contributorType}
                                    onChange={(e) => {
                                        updateCollaboratorType(collaborator, e.target.value as ContributorType);
                                    }}
                                >
                                    {Object.values(ContributorType).map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    className="btn btn-sm btn-soft btn-error btn-square"
                                    onClick={() => removeCollaborator(collaborator)}
                                    title="Remove collaborator"
                                >
                                    <LuTrash2 />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="modal-action">
                    <button type="button" onClick={closeModal} className="btn">
                        Close
                    </button>
                </div>
            </Modal>
        </>
    );
};

interface DocumentCollaboratorsProps {
    documentId: string;
}

export const DocumentCollaborators = ({ documentId }: DocumentCollaboratorsProps) => {
    const document = mainStore((state) => state.document);
    const [localCollaborators, setLocalCollaborators] = useState<Contributor[]>([]);
    const { mutations } = useDocument(documentId);
    const { removeCollaboratorMutation, updateCollaboratorTypeMutation } = mutations;

    useEffect(() => {
        if (document) {
            setLocalCollaborators(document.contributors);
        }
    }, [document?.contributors, document]);

    if (localCollaborators.length === 0) return null;

    const handleRemoveCollaborator = async (c: Contributor) => {
        try {
            const p = removeCollaboratorMutation.mutateAsync(c.email);
            toast.promise(p, {
                loading: "Removing collaborator...",
                error: "Failed to remove collaborator",
            });
            const res = await p;
            toast.success(res.message || "Collaborator removed");
        } catch (error) {
            console.error("Failed to remove collaborator", error);
            toast.error("Failed to remove collaborator");
        }
    };

    const handleChangeCollaboratorType = async (c: Contributor, t: ContributorType) => {
        try {
            setLocalCollaborators((prev) =>
                prev.map((collab) => (collab.email === c.email ? { ...collab, contributorType: t } : collab)),
            );
            const p = updateCollaboratorTypeMutation.mutateAsync({
                email: c.email,
                contributorType: t,
            });
            toast.promise(p, {
                loading: "Updating collaborator type...",
                error: "Failed to update collaborator type",
            });
            const res = await p;
            toast.success(res.message || "Collaborator type updated");
        } catch (error) {
            console.error("Failed to change collaborator type", error);
            toast.error("Failed to change collaborator type");
        }
    };

    return (
        <BaseCollaborators
            collaborators={localCollaborators}
            removeCollaborator={handleRemoveCollaborator}
            updateCollaboratorType={handleChangeCollaboratorType}
        />
    );
};

interface ProjectCollaboratorsProps {
    projectId: string;
}

export const ProjectCollaborators = ({ projectId }: ProjectCollaboratorsProps) => {
    const project = mainStore((state) => state.project);
    const [localCollaborators, setLocalCollaborators] = useState<Contributor[]>([]);
    const { mutations } = useProject(projectId);
    const { removeCollaboratorMutation, updateCollaboratorTypeMutation } = mutations;

    useEffect(() => {
        if (project) {
            setLocalCollaborators(project.contributors);
        }
    }, [project?.contributors, project]);

    if (localCollaborators.length === 0) return null;

    const handleRemoveCollaborator = async (c: Contributor) => {
        try {
            const p = removeCollaboratorMutation.mutateAsync(c.email);
            toast.promise(p, {
                loading: "Removing collaborator...",
                error: "Failed to remove collaborator",
            });
            const res = await p;
            toast.success(res.message || "Collaborator removed");
        } catch (error) {
            console.error("Failed to remove collaborator", error);
            toast.error("Failed to remove collaborator");
        }
    };

    const handleChangeCollaboratorType = async (c: Contributor, t: ContributorType) => {
        try {
            setLocalCollaborators((prev) =>
                prev.map((collab) => (collab.email === c.email ? { ...collab, contributorType: t } : collab)),
            );
            const p = updateCollaboratorTypeMutation.mutateAsync({
                email: c.email,
                contributorType: t,
            });
            toast.promise(p, {
                loading: "Updating collaborator type...",
                error: "Failed to update collaborator type",
            });
            const res = await p;
            toast.success(res.message || "Collaborator type updated");
        } catch (error) {
            console.error("Failed to change collaborator type", error);
            toast.error("Failed to change collaborator type");
        }
    };

    return (
        <BaseCollaborators
            collaborators={localCollaborators}
            removeCollaborator={handleRemoveCollaborator}
            updateCollaboratorType={handleChangeCollaboratorType}
        />
    );
};
