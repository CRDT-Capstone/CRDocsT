import { useCallback, useLayoutEffect, useState } from "react";
import { ShareDocForm } from "../Forms/ShareDocForm";
import { DocumentCollaborators } from "../Collaborators";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { toast } from "sonner";
import { LuDownload } from "react-icons/lu";
import { usePresenceUpdate } from "../../hooks/presence";

interface CanvasNavBarProps {
    documentId: string;
}

const CanvasNavBar = ({ documentId }: CanvasNavBarProps) => {
    const document = mainStore((state) => state.document);

    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState("New Document");

    const { mutations } = useDocument(documentId);
    const { updateDocumentNameMutation, downloadDocumentMutation } = mutations;
    const { sendPresenceUpdateMsg } = usePresenceUpdate(undefined, undefined, documentId);

    useLayoutEffect(() => {
        if (document && !isEditing) {
            setTitle(document.name);
        }
    }, [document]);

    const saveTitle = useCallback(async () => {
        try {
            await updateDocumentNameMutation.mutateAsync(title);
            setIsEditing(false);
            sendPresenceUpdateMsg();
        } catch (error) {
            console.error("Failed to update document name", error);
            toast.error("Failed to update document name");
        }
    }, [title, updateDocumentNameMutation, documentId]);

    const handleDownload = useCallback(async () => {
        try {
            await downloadDocumentMutation.mutateAsync();
        } catch (error) {
            toast.error("Failed to download document");
        }
    }, [downloadDocumentMutation]);

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
            <button className="btn btn-success" onClick={handleDownload}>
                <LuDownload size={20} />
            </button>
            <DocumentCollaborators documentId={documentId} />
            <ShareDocForm documentId={documentId} />
        </>
    );
};

export default CanvasNavBar;
