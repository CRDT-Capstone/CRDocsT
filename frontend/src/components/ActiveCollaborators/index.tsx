import { useEffect, useState } from "react";
import mainStore from "../../stores";
import { genNRandomHexColors } from "../../utils";
import uiStore from "../../stores/uiStore";
import { ActiveCollaborator } from "../../types";

interface ActiveCollaboratorsProps {
    userIdentity: string;
}

const ActiveCollaborators = ({ userIdentity }: ActiveCollaboratorsProps) => {
    const activeCollaborators = uiStore((state) => state.activeCollaborators);
    const [displayCollaborators, setDisplayCollaborators] = useState<ActiveCollaborator[]>([]);

    useEffect(() => {
        // Filter out the current user from the list of active collaborators
        const filteredCollaborators = [...activeCollaborators.values()].filter(
            (collaborator) => collaborator.collaborator !== userIdentity,
        );
        setDisplayCollaborators(filteredCollaborators);
    }, [activeCollaborators]);

    return (
        <div className="dropdown dropdown-top dropdown-start">
            <div tabIndex={0} role="button" className="h-fit btn btn-sm btn-ghost">
                Collaborators ({displayCollaborators.length})
            </div>
            <ul
                tabIndex={0}
                className="overflow-y-auto flex-nowrap p-2 border shadow-xl w-fit max-h-100 dropdown-content menu bg-base-100 rounded-box z-100 border-base-300"
            >
                {displayCollaborators.length > 0 ? (
                    displayCollaborators.map((ac, index) => (
                        <li key={index} className={`py-1 px-2 text-sm italic`}>
                            <span>
                                {ac.collaborator}
                                <span
                                    className="inline-block ml-2 w-3 h-3 rounded-full"
                                    style={{ backgroundColor: ac.color }}
                                ></span>
                            </span>
                        </li>
                    ))
                ) : (
                    <li className="p-2 text-xs opacity-50">No other users active</li>
                )}
            </ul>
        </div>
    );
};

export default ActiveCollaborators;
