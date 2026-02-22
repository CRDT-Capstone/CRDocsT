import { Dispatch, SetStateAction, useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession, useUser } from "@clerk/clerk-react";
import { createDocumentApi } from "../../api/document";
import { ShareDocForm } from "../Forms/ShareDocForm";
import { Document } from "@cr_docs_t/dts";
import Collaborators from "../Collaborators";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { toast } from "sonner";
import { LuCheck } from "react-icons/lu";
import { ConnectionState } from "../../types";

interface NavBarProps {
    documentID: string;
}

export const NavBar = ({ documentID }: NavBarProps) => {
    const navigate = useNavigate();
    const userData = useUser();

    const document = mainStore((state) => state.document);
    const setDocument = mainStore((state) => state.setDocument);
    const connectionState = mainStore((state) => state.connectionState);

    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState("New Document");

    const { mutations } = useDocument(documentID);
    const { updateDocumentNameMutation } = mutations;

    useLayoutEffect(() => {
        if (document) {
            setTitle(document.name);
        }
    }, [document]);

    const saveTitle = async () => {
        try {
            const res = await updateDocumentNameMutation.mutateAsync(title);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update document name", error);
            toast.error("Failed to update document name");
        }
    };

    let connectionBadge = "badge-success";
    switch (connectionState) {
        case ConnectionState.CONNECTED:
            connectionBadge = "badge-success";
            break;
        case ConnectionState.RECONNECTING:
            connectionBadge = "badge-warning";
            break;
        case ConnectionState.DISCONNECTED:
            connectionBadge = "badge-error";
            break;
    }

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
            {/* Is connectde notifier */}
            <div className="flex-none">
                <div className={`badge badge-outline  ${connectionBadge}`}>
                    {connectionState.toString().toUpperCase()}
                </div>
            </div>
            <Collaborators documentId={documentID} />
            <ShareDocForm documentId={documentID} />
        </div>
    );
};
