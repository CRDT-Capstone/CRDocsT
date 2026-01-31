import { ContributorType } from "@cr_docs_t/dts";
import { Dispatch, SetStateAction, useState } from "react";
import { useDocumentApi } from "../../api/document";
import { Document } from "../../types";

interface ShareDocFormProps {
    documentId: string;
    updateDocument: Dispatch<SetStateAction<Document | undefined>>;
}

export const ShareDocForm = ({ documentId, updateDocument }: ShareDocFormProps) => {
    const [email, setEmail] = useState("");
    const [contributionType, setContributionType] = useState<ContributorType>();
    const { shareDocument, getDocumentById } = useDocumentApi();

    const shareDoc = async () => {
        const isShared = await shareDocument(documentId, email, contributionType!);
        const document = await getDocumentById(documentId);
        if (document) updateDocument(document);
        if (!isShared) alert("Error sharing document");
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
