import { useProject } from "../../hooks/queries";
import mainStore from "../../stores";
import { useLayoutEffect, useState } from "react";
import { toast } from "sonner";
import { ProjectCollaborators } from "../Collaborators";
import { ShareProjForm } from "../Forms/ShareDocForm";
import User from "../User";
import { usePresenceUpdate } from "../../hooks/presence";

interface ProjectNavBarProps {
    projectId: string;
}

const ProjectNavBar = ({ projectId }: ProjectNavBarProps) => {
    const project = mainStore((state) => state.project);

    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState("New Document");

    const { mutations, queries } = useProject(projectId);
    const { projectQuery } = queries;
    const { updateProjectNameMutation } = mutations;
    const { sendPresenceUpdateMsg } = usePresenceUpdate(() => {
        projectQuery.refetch();
    }, projectId);


    useLayoutEffect(() => {
        if (project) {
            setTitle(project.name);
        }
    }, [project]);

    const saveTitle = async () => {
        try {
            await updateProjectNameMutation.mutateAsync(title);
            setIsEditing(false);
            sendPresenceUpdateMsg();
        } catch (error) {
            console.error("Failed to update project name", error);
            toast.error("Failed to update project name");
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
            <div className="flex justify-end">
                <ProjectCollaborators projectId={projectId} />
                <ShareProjForm projectId={projectId} />
                <User />
            </div>
        </>
    );
};

export default ProjectNavBar;
