import { Dispatch, SetStateAction, useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession, useUser } from "@clerk/clerk-react";
import { createDocumentApi } from "../../api/document";
import { ShareDocForm } from "../Forms/ShareDocForm";
import { Document } from "@cr_docs_t/dts";
import { DocumentCollaborators } from "../Collaborators";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { toast } from "sonner";
import { LuCheck } from "react-icons/lu";
import { ConnectionState } from "../../types";

interface CanvasNavBarProps {
    documentId: string;
}

const CanvasNavBar = ({ documentId }: CanvasNavBarProps) => {
    const document = mainStore((state) => state.document);
    const setDocument = mainStore((state) => state.setDocument);

    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState("New Document");

    const { mutations } = useDocument(documentId);
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

    return (
        <>
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
                </ul>
            </div>
            <DocumentCollaborators documentId={documentId} />
            <ShareDocForm documentId={documentId} />
        </>
    );
};

export default CanvasNavBar;
