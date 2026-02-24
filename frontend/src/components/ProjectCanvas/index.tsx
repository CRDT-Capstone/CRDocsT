import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useState, memo } from "react";
import { useAuth, useClerk, useSession } from "@clerk/clerk-react";
import mainStore from "../../stores";
import { LuFileText } from "react-icons/lu";
import { NavBarType } from "../../types";
import { ProjectFileTree } from "../ProjectFileTree";
import UserFileTree from "../UserFileTree";
import { useProject } from "../../hooks/queries";
import { Project, Document } from "@cr_docs_t/dts";
import { FileTreeItemType } from "../BaseFileTree";
import TabbedEditor from "../TabbedEditor";
import uiStore from "../../stores/uiStore";
import { createProjectApi } from "../../api/project";
import { toast } from "sonner";

const ProjectCanvas = () => {
    const nav = useNavigate();
    const { projectId } = useParams();
    const { isSignedIn, isLoaded } = useSession();
    const setNavBarType = uiStore((state) => state.setNavBarType);
    const project = mainStore((state) => state.project);
    const setProject = mainStore((state) => state.setProject);
    const selectedTabId = uiStore((state) => state.selectedTabId);
    const activeTabs = uiStore((state) => state.activeTabs);
    const setActiveProjectId = uiStore((state) => state.setActiveProjectId);
    const addTab = uiStore((state) => state.addTab);
    const removeTab = uiStore((state) => state.removeTab);
    const setActiveTab = uiStore((state) => state.setSelectedTab);
    const { user } = useClerk();
    const userIdentity = user?.primaryEmailAddress?.emailAddress;
    const { getToken } = useAuth();
    const api = createProjectApi(getToken);

    useEffect(() => {
        if (projectId) {
            setActiveProjectId(projectId);
        }
        return () => {
            setActiveProjectId(undefined);
        };
    }, []);

    useEffect(() => {
        if (!(projectId && userIdentity)) return;
        (async () => {
            const res = await api.getUserProjectAccess(projectId, userIdentity);
            console.log({ access: res });
            if (!res.data.hasAccess) {
                toast.error("You do not have access to this project. Redirecting...");
                nav("/");
            }
        })();
    }, [projectId, userIdentity]);

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
    const { createProjectDocumentMutation, removeProjectDocumentMutation } = mutations;

    const handleItemClick = useCallback(
        (item: Document | Project, type: FileTreeItemType) => {
            if (!item._id) return;
            addTab({
                id: item._id,
                docId: item._id,
                title: item.name,
            });
            setActiveTab(item._id!);
        },
        [addTab, setActiveTab],
    );

    const handleItemCreate = useCallback(
        async (name: string | undefined, type: FileTreeItemType) => {
            await createProjectDocumentMutation.mutateAsync(name);
        },
        [createProjectDocumentMutation],
    );

    const handleItemDelete = useCallback(
        async (item: Document | Project, type: FileTreeItemType) => {
            removeTab(item._id!);
            await removeProjectDocumentMutation.mutateAsync(item._id!);
        },
        [removeProjectDocumentMutation, removeTab],
    );

    return (
        <div className="w-full drawer drawer-open">
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
                handleItemCreate={handleItemCreate}
                handleItemDelete={handleItemDelete}
            />
        </div>
    );
};

export default memo(ProjectCanvas);
