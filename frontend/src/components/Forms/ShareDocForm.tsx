import { ContributorType } from "@cr_docs_t/dts";
import { useState } from "react";
import { useDocumentApi } from "../../api/document";

export const ShareDocForm = ({ documentId }: { documentId: string }) => {
    const [email, setEmail] = useState('');
    const [contributionType, setContributionType] = useState<ContributorType>();
    const { shareDocument } = useDocumentApi();

    const shareDoc = async () => {
        const isShared = await shareDocument(documentId, email, contributionType!);
        if (!isShared) alert('Error sharing document');
    }

    return (
        <>
            <button className="btn btn-l btn-neutral m-4" onClick={() => (document.getElementById('shareDocForm') as HTMLDialogElement)!.showModal()}>Share</button>
            <dialog id="shareDocForm" className="modal">
                <div
                    className="modal-box flex flex-col p-4 justify-center items-center"
                >
                    <h1 className="m-2 font-extrabold">Share your document</h1>
                    <input
                        type="text"
                        placeholder="Enter email"
                        className="input m-4"
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <select
                        className="select"
                        value={contributionType ?? ""}
                        onChange={(e) =>
                            setContributionType(e.target.value as ContributorType)
                        }
                    >
                        <option value="" disabled>
                            Choose a contribution type
                        </option>
                        <option value={ContributorType.EDITOR}>{ContributorType.EDITOR}</option>
                        <option value={ContributorType.VIEWER}>{ContributorType.VIEWER}</option>
                    </select>
                    <div className="modal-action">
                        <form className="flex w-full justify-end" method="dialog">
                            <button
                                className="btn btn-l btn-neutral m-1"
                                onClick={shareDoc}
                            >
                                Share
                            </button>
                            <button
                                className="btn btn-l btn-neutral m-1"
                            >
                                Close
                            </button>
                        </form>
                    </div>
                </div>
            </dialog>
        </>
    );
}