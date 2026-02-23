import { ContributorType, Document } from "@cr_docs_t/dts";
import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import { useDocument, useDocuments, useProject } from "../../hooks/queries";
import { toast } from "sonner";
import { useForm, type FormApi } from "@tanstack/react-form";
import useModal from "../../hooks/modal";

interface BaseFormProps {
    triggerText: ReactNode;
    triggerClassName?: string;
    title?: string;
    submitText?: string;
    children: ReactNode;
}

export const BaseForm = ({
    triggerText,
    triggerClassName = "m-4 btn btn-l btn-primary",
    title,
    submitText = "Submit",
    children,
}: BaseFormProps) => {
    const { Modal, showModal } = useModal();

    return (
        <>
            <button type="button" className={triggerClassName} onClick={showModal}>
                {triggerText}
            </button>

            <Modal title={title} className="flex flex-col justify-center items-center p-4 modal-box">
                {children}
            </Modal>
        </>
    );
};

interface ShareDocFormProps {
    documentId: string;
}

interface ShareValues {
    email: string;
    contributionType: ContributorType | "";
}

export const ShareDocForm = ({ documentId }: ShareDocFormProps) => {
    const { mutations } = useDocument(documentId);
    const { shareDocumentMutation } = mutations;

    const shareDoc = async (values: ShareValues): Promise<boolean> => {
        if (!values.email || !values.contributionType) {
            toast.error("Please provide both email and contribution type");
            return false;
        }

        try {
            const p = shareDocumentMutation.mutateAsync({
                email: values.email,
                contributorType: values.contributionType as ContributorType,
            });

            toast.promise(p, {
                loading: "Sharing document...",
                error: "Failed to share document",
            });

            const res = await p;
            toast.success(res.message || "Document shared successfully");

            return true; // Tells BaseForm to close the modal
        } catch (error) {
            return false;
        }
    };

    const form = useForm({
        defaultValues: {
            email: "",
            contributionType: ContributorType.EDITOR,
        },
        onSubmit: async ({ value }) => {
            const success = await shareDoc(value);
            if (success) {
                form.reset();
            }
        },
    });

    return (
        <BaseForm triggerText="Share" title="Share your document" submitText="Share">
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
                        name="email"
                        children={(f) => (
                            <>
                                <label className="label">Email</label>
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
                    <form.Field
                        name="contributionType"
                        children={(f) => (
                            <>
                                <label className="label">Permission</label>
                                <select
                                    id={f.name}
                                    name={f.name}
                                    value={f.state.value}
                                    onChange={(e) => f.handleChange(e.target.value as ContributorType)}
                                    className="w-full select"
                                >
                                    <option value={ContributorType.EDITOR}>Editor</option>
                                    <option value={ContributorType.VIEWER}>Viewer</option>
                                </select>
                            </>
                        )}
                    />
                </fieldset>
                <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                    children={([canSubmit, isSubmitting]) => (
                        <div className="flex flex-row justify-between items-center w-full">
                            <button className="m-4 w-1/4 btn btn-success" type="submit" disabled={!canSubmit}>
                                {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : "Submit"}
                            </button>
                            <button
                                className="m-4 w-1/4 btn btn-ghost"
                                type="button"
                                onClick={() => {
                                    form.reset();
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                />
            </form>
        </BaseForm>
    );
};

interface ShareProjFormProps {
    projectId: string;
}

export const ShareProjForm = ({ projectId }: ShareProjFormProps) => {
    const { mutations } = useProject(projectId);
    const { shareProjectMutation } = mutations;

    const shareProj = async (values: ShareValues): Promise<boolean> => {
        if (!values.email || !values.contributionType) {
            toast.error("Please provide both email and contribution type");
            return false;
        }

        try {
            const p = shareProjectMutation.mutateAsync({
                email: values.email,
                contributorType: values.contributionType as ContributorType,
            });

            toast.promise(p, {
                loading: "Sharing document...",
                error: "Failed to share document",
            });

            const res = await p;
            toast.success(res.message || "Document shared successfully");

            return true; // Tells BaseForm to close the modal
        } catch (error) {
            return false;
        }
    };

    const form = useForm({
        defaultValues: {
            email: "",
            contributionType: ContributorType.EDITOR,
        },
        onSubmit: async ({ value }) => {
            const success = await shareProj(value);
            if (success) {
                form.reset();
            }
        },
    });

    return (
        <BaseForm triggerText="Share" title="Share your document" submitText="Share">
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
                        name="email"
                        children={(f) => (
                            <>
                                <label className="label">Email</label>
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
                    <form.Field
                        name="contributionType"
                        children={(f) => (
                            <>
                                <label className="label">Permission</label>
                                <select
                                    id={f.name}
                                    name={f.name}
                                    value={f.state.value}
                                    onChange={(e) => f.handleChange(e.target.value as ContributorType)}
                                    className="w-full select"
                                >
                                    <option value={ContributorType.EDITOR}>Editor</option>
                                    <option value={ContributorType.VIEWER}>Viewer</option>
                                </select>
                            </>
                        )}
                    />
                </fieldset>
                <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                    children={([canSubmit, isSubmitting]) => (
                        <div className="flex flex-row justify-between items-center w-full">
                            <button className="m-4 w-1/4 btn btn-success" type="submit" disabled={!canSubmit}>
                                {isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : "Submit"}
                            </button>
                            <button
                                className="m-4 w-1/4 btn btn-ghost"
                                type="button"
                                onClick={() => {
                                    form.reset();
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                />
            </form>
        </BaseForm>
    );
};
