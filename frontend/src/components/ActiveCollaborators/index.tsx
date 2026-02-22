import { useEffect, useState } from "react";
import mainStore from "../../stores";

interface ActiveCollaboratorsProps {
    userIdentity: string;
}

const ActiveCollaborators = ({ userIdentity }: ActiveCollaboratorsProps) => {
    const activeCollaborators = mainStore((state) => state.activeCollaborators);
    const [displayCollaborators, setDisplayCollaborators] = useState<string[]>([]);

    useEffect(() => {
        // Filter out the current user from the list of active collaborators
        const filteredCollaborators = activeCollaborators.filter((collaborator) => collaborator !== userIdentity);
        setDisplayCollaborators(filteredCollaborators);
    }, [activeCollaborators]);

    return (
        <footer className="flex justify-start p-2 border-t bg-base-200">
            <div className="dropdown dropdown-top dropdown-start">
                <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
                    Collaborators ({displayCollaborators.length})
                </div>
                <ul
                    tabIndex={0}
                    className="overflow-y-auto flex-nowrap p-2 border shadow-xl w-fit max-h-100 dropdown-content menu bg-base-100 rounded-box z-100 border-base-300"
                >
                    {displayCollaborators.length > 0 ? (
                        displayCollaborators.map((ac, index) => (
                            <li key={index} className="py-1 px-2 text-sm italic">
                                {ac}
                            </li>
                        ))
                    ) : (
                        <li className="p-2 text-xs opacity-50">No other users active</li>
                    )}
                </ul>
            </div>
        </footer>
    );
};

export default ActiveCollaborators;
