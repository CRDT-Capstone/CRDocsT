import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSession, useUser } from "@clerk/clerk-react";
import { useDocumentApi } from "../../api/document";

interface NavBarProps {
    documentID: string,
    documentName: string
};

export const NavBar = ({ documentID, documentName }: NavBarProps) => {
    const navigate = useNavigate();
    const userData = useUser();

    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(documentName);

    const { updateDocumentName } = useDocumentApi();


    const saveTitle = async () => {
        const docNameChanged = await updateDocumentName(title, documentID);
        if (!docNameChanged) {
            //revert the name and show an error
        }
        setIsEditing(false);
    }

    return (
        <div className="navbar bg-base-100 shadow-sm">
            <div className="flex-none">
                <a className="btn btn-ghost text-xl" onClick={() => navigate('/')}>Bragi</a>
            </div>
            <div className="flex-1">
                <ul className="menu menu-horizontal px-1">
                    <li>
                        {isEditing ? (
                            <input className="input input-sm" value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") saveTitle();
                                    if (e.key === "Escape") setIsEditing(false)
                                }}
                                onBlur={() => saveTitle()} />
                        )
                            : (<h1

                                className="cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap"
                                onClick={() => setIsEditing(true)}>{title || 'Untitled Document'}</h1>)
                        }
                    </li>
                    <li><a>Link</a></li>
                    <li>
                        <details>
                            <summary>Parent</summary>
                            <ul className="bg-base-100 rounded-t-none p-2">
                                <li><a>Link 1</a></li>
                                <li><a>Link 2</a></li>
                            </ul>
                        </details>
                    </li>
                </ul>
            </div>
            {userData.user ? <div className="flex-none"> {userData.user.firstName}</div> : <></>}
        </div>
    );
}