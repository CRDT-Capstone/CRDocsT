import { useClerk, useUser } from "@clerk/clerk-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

const User = () => {
    const { signOut } = useClerk();
    const { user } = useUser();
    const nav = useNavigate();

    const email = user?.primaryEmailAddress?.emailAddress;
    const initial = email ? email.charAt(0).toUpperCase() : "?";

    const handleSignOut = useCallback(async () => {
        await signOut();
        nav("/");
    }, [signOut, nav]);

    return (
        <div className="flex p-4">
            <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar avatar-placeholder">
                    <div className="w-24 rounded-full bg-neutral text-neutral-content">
                        <span className="text-3xl font-medium">{initial}</span>
                    </div>
                </div>

                <ul
                    tabIndex={0}
                    className="p-2 mt-3 w-40 border shadow-lg menu menu-sm dropdown-content z-1 bg-base-100 rounded-box border-base-300"
                >
                    <li>
                        <button
                            onClick={handleSignOut}
                            className="font-medium text-error hover:bg-error/10 hover:text-error"
                        >
                            Sign Out
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    );
};

export default User;
