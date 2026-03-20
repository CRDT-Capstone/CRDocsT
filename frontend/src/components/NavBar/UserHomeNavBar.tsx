import User from "../User";
import uiStore from "../../stores/uiStore";
import { ShareDocForm } from "../Forms/ShareDocForm";
import { DocumentCollaborators } from "../Collaborators";

const UserHomeNavBar = () => {
    const activeDocumentId = uiStore((state) => state.activeDocumentId);

    return (
        <div className="flex flex-1 justify-end">
            {activeDocumentId && (
                <>
                    <DocumentCollaborators documentId={activeDocumentId} />
                    <ShareDocForm documentId={activeDocumentId} />
                </>
            )}
            <User />
        </div>
    );
};

export default UserHomeNavBar;
