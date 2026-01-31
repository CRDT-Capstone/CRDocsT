import { useState, useRef } from "react";
import { Contributor, Document } from "../../types";
import { useDocumentApi } from "../../api/document";
import { ContributorType } from "@cr_docs_t/dts";

interface CollaboratorsProps {
    documentId: string;
    document: Document;
}

const Collaborators = ({ documentId, document }: CollaboratorsProps) => {
    const [localCollaborators, setLocalCollaborators] = useState<Contributor[]>(document.contributors);
    const { removeCollaborator, updateCollaboratorType, getDocumentById } = useDocumentApi();
    const modalRef = useRef<HTMLDialogElement>(null);

    if (localCollaborators.length === 0) return <></>;

    const handleRemoveCollaborator = async (c: Contributor) => {
        try {
            await removeCollaborator(documentId, c.email);
            // Optimistic update or fetch fresh data
            const document = await getDocumentById(documentId);
            if (document) {
                setLocalCollaborators(document.contributors);
            }
        } catch (error) {
            console.error("Failed to remove collaborator", error);
            alert("Failed to remove collaborator");
        }
    };

    const handleChangeCollaboratorType = async (c: Contributor, t: ContributorType) => {
        try {
            setLocalCollaborators((prev) =>
                prev.map((collab) => (collab.email === c.email ? { ...collab, contributorType: t } : collab)),
            );
            await updateCollaboratorType(documentId, c.email, t);
            const document = await getDocumentById(documentId);
            if (document) {
                setLocalCollaborators(document.contributors);
            }
        } catch (error) {
            console.error("Failed to change collaborator type", error);
            alert("Failed to change collaborator type");
        }
    };

    const showCollaboratorModal = () => {
        modalRef.current?.showModal();
    };

    return (
        <>
            <div
                className="-space-x-6 transition-opacity cursor-pointer hover:opacity-80 avatar-group rtl:space-x-reverse"
                onClick={showCollaboratorModal}
                role="button"
                tabIndex={0}
                aria-label="Manage collaborators"
            >
                {localCollaborators.slice(0, 5).map((collaborator) => (
                    <div key={collaborator.email} className="avatar placeholder border-base-100">
                        <div className="w-10 bg-neutral text-neutral-content">
                            <span className="text-sm font-semibold">{collaborator.email[0].toUpperCase()}</span>
                        </div>
                    </div>
                ))}
                {localCollaborators.length > 5 && (
                    <div className="avatar placeholder border-base-100">
                        <div className="w-10 bg-neutral text-neutral-content">
                            <span className="text-xs">+{localCollaborators.length - 5}</span>
                        </div>
                    </div>
                )}
            </div>

            <dialog ref={modalRef} className="modal">
                <div className="w-11/12 max-w-2xl modal-box">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">Manage Collaborators</h3>
                        <form method="dialog">
                            <button className="btn btn-sm btn-circle btn-ghost">✕</button>
                        </form>
                    </div>

                    <div className="flex flex-col gap-4">
                        {localCollaborators.map((collaborator) => (
                            <div
                                key={collaborator.email}
                                className="flex flex-col gap-3 justify-between p-3 rounded-lg sm:flex-row sm:items-center bg-base-200/50"
                            >
                                {/* User Info */}
                                <div className="flex gap-3 items-center">
                                    <div className="avatar placeholder">
                                        <div className="w-10 rounded-full bg-neutral text-neutral-content">
                                            <span>{collaborator.email[0].toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="flex overflow-hidden flex-col">
                                        <span className="font-medium truncate max-w-[200px]" title={collaborator.email}>
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
                                            console.log("Changing type to ", e.target.value);
                                            handleChangeCollaboratorType(
                                                collaborator,
                                                e.target.value as ContributorType,
                                            );
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
                                        onClick={() => handleRemoveCollaborator(collaborator)}
                                        title="Remove collaborator"
                                    >
                                        {/* Trash Icon */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="modal-action">
                        <form method="dialog">
                            <button className="btn">Close</button>
                        </form>
                    </div>
                </div>

                {/* Backdrop click to close */}
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </>
    );
};

export default Collaborators;
