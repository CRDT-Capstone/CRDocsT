import { useNavigate } from "react-router-dom";
import { useDocuments } from "../../hooks/queries";
import { useClerk } from "@clerk/clerk-react";

const UserHomeNavBar = () => {
    const navigate = useNavigate();
    const { signOut } = useClerk();
    const { user } = useClerk();
    const { mutations } = useDocuments();
    const { createDocumentMutation } = mutations;

    return (
        <div className="flex flex-1 justify-end">
            <button className="m-4 btn btn-l btn-neutral" onClick={() => signOut()}>
                Sign Out
            </button>
        </div>
    );
};

export default UserHomeNavBar;
