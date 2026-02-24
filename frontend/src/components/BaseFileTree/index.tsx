import React, { ReactNode, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Document, Project } from "@cr_docs_t/dts";
import { LuFileText, LuFolder, LuPlus, LuTrash2, LuChevronDown, LuChevronRight } from "react-icons/lu";

export enum FileTreeItemType {
    DOCUMENT = "document",
    PROJECT = "project",
}

export interface SectionData {
    name: string;
    isLoading: boolean;
    documents?: Document[];
    projects?: Project[];
    modifiable: boolean;
    onAddClick?: () => void;
    onItemClick: (item: Document | Project, type: FileTreeItemType) => void;
    onItemDelete?: (item: Document | Project, type: FileTreeItemType) => void;
}

interface FileTreeItemProps {
    itemType: FileTreeItemType;
    doc: Document | Project;
    modifiable: boolean;
    onClick: () => void;
    onDelete?: () => void;
}

const FileTreeItem = ({ onClick, itemType, doc, modifiable, onDelete }: FileTreeItemProps) => {
    const Icon = itemType === FileTreeItemType.PROJECT ? LuFolder : LuFileText;
    const iconColor = itemType === FileTreeItemType.PROJECT ? "text-secondary" : "text-primary";

    return (
        <li className="w-full group">
            <button
                className="flex justify-between items-center py-1.5 px-2 w-full rounded-md transition-colors is-drawer-close:justify-center is-drawer-close:tooltip is-drawer-close:tooltip-right hover:bg-base-300"
                data-tip={doc.name}
                onClick={onClick}
            >
                <span className="flex overflow-hidden gap-2 items-center">
                    <Icon className={`${iconColor} size-4 shrink-0`} />
                    <span className="text-sm text-left truncate max-w-32 is-drawer-close:hidden">{doc.name}</span>
                </span>

                {modifiable && (
                    <span
                        className="p-1 ml-auto rounded-md opacity-0 transition-opacity group-hover:opacity-100 is-drawer-close:hidden hover:text-error hover:bg-error/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.();
                        }}
                    >
                        <LuTrash2 size={14} />
                    </span>
                )}
            </button>
        </li>
    );
};

interface BaseFileTreeProps {
    sections: SectionData[];
    modalTitle: string;
    closeModal: () => void;
    // ModalComponent: React.FC<{ title: string; children: React.ReactNode }>;
    modalRef?: React.RefObject<HTMLDialogElement | null>;
    ModalComponent: React.ForwardRefExoticComponent<
        { title: string; children: ReactNode } & React.RefAttributes<HTMLDialogElement>
    >;
    onSubmitItem: (name: string, type: FileTreeItemType) => Promise<void>;
    hideProjectOption?: boolean; // For ProjectFileTree where we only add documents
}

const BaseFileTree = ({
    sections,
    modalTitle,
    closeModal,
    ModalComponent,
    onSubmitItem,
    modalRef,
    hideProjectOption = false,
}: BaseFileTreeProps) => {
    const form = useForm({
        defaultValues: {
            name: "",
            type: FileTreeItemType.DOCUMENT,
        },
        onSubmit: async ({ value }) => {
            await onSubmitItem(value.name, value.type);
            form.reset();
            closeModal();
        },
    });

    return (
        <>
            <div className="z-10 drawer-side is-drawer-close:overflow-visible">
                <label htmlFor="main-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
                <div className="flex flex-col items-start min-h-full border-r transition-all duration-300 bg-base-200 border-base-300 is-drawer-close:w-16 is-drawer-open:w-80">
                    {sections.map((section, idx) => (
                        <FileTreeSection key={idx} section={section} />
                    ))}
                </div>
            </div>

            <ModalComponent ref={modalRef} title={modalTitle}>
                <div className="flex flex-col gap-4 items-center w-full">
                    <form
                        className="p-2 w-full"
                        onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            form.handleSubmit();
                        }}
                    >
                        <fieldset className="p-4 w-full fieldset rounded-box">
                            <form.Field
                                name="name"
                                children={(f) => (
                                    <>
                                        <label className="label">Name</label>
                                        <input
                                            id={f.name}
                                            name={f.name}
                                            value={f.state.value}
                                            onChange={(e) => f.handleChange(e.target.value)}
                                            className="w-full input"
                                            autoFocus
                                        />
                                    </>
                                )}
                            />
                            {!hideProjectOption && (
                                <form.Field
                                    name="type"
                                    children={(f) => (
                                        <>
                                            <label className="label">Type</label>
                                            <select
                                                id={f.name}
                                                name={f.name}
                                                value={f.state.value}
                                                onChange={(e) => f.handleChange(e.target.value as FileTreeItemType)}
                                                className="w-full select"
                                            >
                                                <option value={FileTreeItemType.DOCUMENT}>Document</option>
                                                <option value={FileTreeItemType.PROJECT}>Project</option>
                                            </select>
                                        </>
                                    )}
                                />
                            )}
                        </fieldset>
                        <form.Subscribe
                            selector={(state) => [state.canSubmit, state.isSubmitting]}
                            children={([canSubmit, isSubmitting]) => (
                                <div className="flex flex-row justify-between items-center w-full">
                                    <button className="m-4 w-1/4 btn btn-success" type="submit" disabled={!canSubmit}>
                                        {isSubmitting ? (
                                            <span className="loading loading-spinner loading-sm"></span>
                                        ) : (
                                            "Submit"
                                        )}
                                    </button>
                                    <button
                                        className="m-4 w-1/4 btn btn-ghost"
                                        type="button"
                                        onClick={() => {
                                            form.reset();
                                            closeModal();
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        />
                    </form>
                </div>
            </ModalComponent>
        </>
    );
};

const FileTreeSection = ({ section }: { section: SectionData }) => {
    const [showProjects, setShowProjects] = useState(true);
    const [showDocs, setShowDocs] = useState(true);

    return (
        <div className="flex overflow-hidden flex-col flex-1 w-full h-1/2">
            <div className="flex sticky top-0 z-10 justify-between items-center p-4 w-full border-b shadow-sm border-base-300 bg-base-200 is-drawer-close:justify-center is-drawer-close:px-2">
                <span className="text-sm font-semibold tracking-wider uppercase text-base-content/80 is-drawer-close:hidden">
                    {section.name}
                </span>
                {section.modifiable && (
                    <button
                        className="btn btn-ghost btn-sm btn-square is-drawer-close:tooltip is-drawer-close:tooltip-right hover:bg-base-300"
                        data-tip="New Item"
                        disabled={section.isLoading}
                        onClick={section.onAddClick}
                    >
                        {section.isLoading ? (
                            <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                            <LuPlus size={18} />
                        )}
                    </button>
                )}
            </div>

            <div className="overflow-y-auto flex-1 p-2 w-full custom-scrollbar">
                {/* Projects Section */}
                {section.projects && (
                    <div className="mb-4">
                        <button
                            className="flex gap-1 items-center w-full text-xs font-semibold uppercase transition-colors text-base-content/60 is-drawer-close:justify-center hover:text-base-content"
                            onClick={() => setShowProjects(!showProjects)}
                        >
                            <span className="is-drawer-close:hidden">
                                {showProjects ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
                            </span>
                            <span className="is-drawer-close:hidden">Projects</span>
                        </button>

                        {showProjects &&
                            (section.isLoading ? (
                                <div className="flex justify-center p-4">
                                    <span className="loading loading-dots loading-sm"></span>
                                </div>
                            ) : (
                                <ul className="gap-1 mt-1 w-full menu menu-sm rounded-box is-drawer-close:p-0">
                                    {section.projects.length === 0 ? (
                                        <li className="py-2 px-4 text-xs italic opacity-50 is-drawer-close:hidden">
                                            No projects yet.
                                        </li>
                                    ) : (
                                        section.projects.map((proj) => (
                                            <FileTreeItem
                                                key={proj._id}
                                                itemType={FileTreeItemType.PROJECT}
                                                doc={proj}
                                                modifiable={section.modifiable}
                                                onClick={() => section.onItemClick(proj, FileTreeItemType.PROJECT)}
                                                onDelete={() => section.onItemDelete?.(proj, FileTreeItemType.PROJECT)}
                                            />
                                        ))
                                    )}
                                </ul>
                            ))}
                    </div>
                )}

                {/* Documents Section */}
                {section.documents && (
                    <div>
                        <button
                            className="flex gap-1 items-center w-full text-xs font-semibold uppercase transition-colors text-base-content/60 is-drawer-close:justify-center hover:text-base-content"
                            onClick={() => setShowDocs(!showDocs)}
                        >
                            <span className="is-drawer-close:hidden">
                                {showDocs ? <LuChevronDown size={14} /> : <LuChevronRight size={14} />}
                            </span>
                            <span className="is-drawer-close:hidden">Documents</span>
                        </button>

                        {showDocs &&
                            (section.isLoading ? (
                                <div className="flex justify-center p-4">
                                    <span className="loading loading-dots loading-sm"></span>
                                </div>
                            ) : (
                                <ul className="gap-1 mt-1 w-full menu menu-sm rounded-box is-drawer-close:p-0">
                                    {section.documents.length === 0 ? (
                                        <li className="py-2 px-4 text-xs italic opacity-50 is-drawer-close:hidden">
                                            No documents yet.
                                        </li>
                                    ) : (
                                        section.documents.map((doc) => (
                                            <FileTreeItem
                                                key={doc._id}
                                                itemType={FileTreeItemType.DOCUMENT}
                                                doc={doc}
                                                modifiable={section.modifiable}
                                                onClick={() => section.onItemClick(doc, FileTreeItemType.DOCUMENT)}
                                                onDelete={() => section.onItemDelete?.(doc, FileTreeItemType.DOCUMENT)}
                                            />
                                        ))
                                    )}
                                </ul>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BaseFileTree;
