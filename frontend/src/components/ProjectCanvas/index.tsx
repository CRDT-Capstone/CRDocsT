import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import mainStore from "../../stores";
import { LuFileText } from "react-icons/lu";
import { NavBarType } from "../../types";
import { ProjectFileTree } from "../ProjectFileTree";
import UserFileTree from "../UserFileTree";
import { useProject } from "../../hooks/queries";
import { Project, Document } from "@cr_docs_t/dts";
import { FileTreeItemType } from "../BaseFileTree";
import useTabbedEditor from "../TabbedEditor";

const ProjectCanvas = () => {
    const nav = useNavigate();
    const { projectId } = useParams();
    const { isSignedIn, isLoaded } = useSession();
    const setNavBarType = mainStore((state) => state.setNavBarType);
    const project = mainStore((state) => state.project);
    const setProject = mainStore((state) => state.setProject);
    const setActiveProjectId = mainStore((state) => state.setActiveProjectId);

    const { TabbedEditor, addTab } = useTabbedEditor();

    useEffect(() => {
        if (projectId) {
            setActiveProjectId(projectId);
        }
        return () => {
            setActiveProjectId(undefined);
        };
    }, []);

    useEffect(() => {
        if (isLoaded && !isSignedIn) nav("/sign-in");
    }, [nav, isSignedIn, isLoaded]);

    useEffect(() => {
        setNavBarType(NavBarType.PROJECT);
        return () => {
            setNavBarType(NavBarType.UNSPECIFIED);
        };
    }, [setNavBarType]);

    const { queries, mutations } = useProject(projectId!);

    const handleItemClick = (item: Document | Project, type: FileTreeItemType) => {
        // Add tab ig
        addTab({
            id: item._id!,
            docId: item._id!,
            title: item.name,
        });
    };

    return (
        <div className="w-screen h-screen drawer lg:drawer-open">
            <input id="user-canvas-drawer" type="checkbox" className="drawer-toggle" />

            <div className="flex overflow-hidden flex-col drawer-content">
                {/* Tabbed editor */}
                <TabbedEditor />
            </div>

            {/* File tree */}
            <ProjectFileTree
                projectId={projectId!}
                projectQueriesAndMutations={{ queries, mutations }}
                handleItemClick={handleItemClick}
            />
        </div>
    );
};

export default ProjectCanvas;
