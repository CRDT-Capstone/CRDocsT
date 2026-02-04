import { ContributorType, Document } from "@cr_docs_t/dts";
import { Dispatch, SetStateAction, useState } from "react";
import { useDocument, useDocuments } from "../../hooks/queries";
import { toast } from "sonner";

interface ShareDocFormProps {
    documentId: string;
}

export const ShareDocForm = ({ documentId }: ShareDocFormProps) => {
    const [email, setEmail] = useState("");
    const [contributionType, setContributionType] = useState<ContributorType>();
    const { mutations, queries } = useDocument(documentId);
    const { shareDocumentMutation } = mutations;

    const shareDoc = async () => {
        if (!email || !contributionType) {
            toast.error("Please provide both email and contribution type");
            return false;
        }

        try {
            const p = shareDocumentMutation.mutateAsync({ email, contributorType: contributionType });
            toast.promise(p, {
                loading: "Sharing document...",
                error: "Failed to share document",
            });
            const res = await p;
            toast.success(res.message || "Document shared successfully");
            setContributionType(undefined);
            setEmail("");
            return true;
        } catch (error) {
            toast.error("Failed to share document");
            return true;
        }
    };

    return (
        <>
            <button
                className="m-4 btn btn-l btn-neutral"
                onClick={() => (document.getElementById("shareDocForm") as HTMLDialogElement)!.showModal()}
            >
                Share
            </button>
            <dialog id="shareDocForm" className="modal">
                <div className="flex flex-col justify-center items-center p-4 modal-box">
                    <h1 className="m-2 font-extrabold">Share your document</h1>
                    <input
                        type="text"
                        placeholder="Enter email"
                        className="m-4 input"
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <select
                        className="select"
                        value={contributionType ?? ""}
                        onChange={(e) => setContributionType(e.target.value as ContributorType)}
                    >
                        <option value="" disabled>
                            Choose a contribution type
                        </option>
                        <option value={ContributorType.EDITOR}>{ContributorType.EDITOR}</option>
                        <option value={ContributorType.VIEWER}>{ContributorType.VIEWER}</option>
                    </select>
                    <div className="modal-action">
                        <form className="flex justify-end w-full" method="dialog">
                            <button className="m-1 btn btn-l btn-neutral" onClick={shareDoc}>
                                Share
                            </button>
                            <button className="m-1 btn btn-l btn-neutral">Close</button>
                        </form>
                    </div>
                </div>
            </dialog>
        </>
    );
};
