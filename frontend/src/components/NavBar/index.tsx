import { Dispatch, SetStateAction, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession, useUser } from "@clerk/clerk-react";
import { useDocumentApi } from "../../api/document";
import { ShareDocForm } from "../Forms/ShareDocForm";
import { Document } from "../../types";
import Collaborators from "../Collaborators";

interface NavBarProps {
    documentID: string;
    document: Document;
    updateDocument: Dispatch<SetStateAction<Document | undefined>>;
}

export const NavBar = ({ documentID, document, updateDocument }: NavBarProps) => {
    const navigate = useNavigate();
    const userData = useUser();

    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(document.name);

    const { updateDocumentName } = useDocumentApi();

    const saveTitle = async () => {
        const docNameChanged = await updateDocumentName(title, documentID);
        if (!docNameChanged) {
            //revert the name and show an error
        }
        setIsEditing(false);
    };

    return (
        <div className="shadow-sm navbar bg-base-100">
            <div className="flex-none">
                <a className="text-xl btn btn-ghost" onClick={() => navigate("/")}>
                    Bragi
                </a>
            </div>
            <div className="flex-1">
                <ul className="px-1 menu menu-horizontal">
                    <li>
                        {isEditing ? (
                            <input
                                className="input input-sm"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveTitle();
                                    if (e.key === "Escape") setIsEditing(false);
                                }}
                                onBlur={() => saveTitle()}
                            />
                        ) : (
                            <h1
                                className="overflow-hidden whitespace-nowrap cursor-pointer text-ellipsis"
                                onClick={() => setIsEditing(true)}
                            >
                                {title || "Untitled Document"}
                            </h1>
                        )}
                    </li>
                    <li>
                        <a>Link</a>
                    </li>
                    <li>
                        <details>
                            <summary>Parent</summary>
                            <ul className="p-2 rounded-t-none bg-base-100">
                                <li>
                                    <a>Link 1</a>
                                </li>
                                <li>
                                    <a>Link 2</a>
                                </li>
                            </ul>
                        </details>
                    </li>
                </ul>
            </div>
            <Collaborators documentId={documentID} document={document} />
            <ShareDocForm documentId={documentID} updateDocument={updateDocument} />
        </div>
    );
};
