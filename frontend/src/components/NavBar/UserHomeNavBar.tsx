import { useNavigate } from "react-router-dom";
import { useDocuments } from "../../hooks/queries";
import { useClerk } from "@clerk/clerk-react";
import User from "../User";

const UserHomeNavBar = () => {
    const navigate = useNavigate();
    const { signOut } = useClerk();
    const { user } = useClerk();
    const { mutations } = useDocuments();
    const { createDocumentMutation } = mutations;

    return (
        <div className="flex flex-1 justify-end">
            <User />
        </div>
    );
};

export default UserHomeNavBar;
