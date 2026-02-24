import { useNavigate, useParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import { NavBarType } from "../../types";
import UserFileTree from "../UserFileTree";
import { Project, Document } from "@cr_docs_t/dts";
import { FileTreeItemType } from "../BaseFileTree";
import TabbedEditor from "../TabbedEditor";
import { useDocuments, useProjects } from "../../hooks/queries";
import uiStore from "../../stores/uiStore";

const UserCanvas = () => {
    const nav = useNavigate();
    const { isSignedIn, isLoaded } = useSession();
    const setNavBarType = uiStore((state) => state.setNavBarType);
    const addTab = uiStore((state) => state.addTab);
    const removeTab = uiStore((state) => state.removeTab);
    const setActiveTab = uiStore((state) => state.setSelectedTab);
    const setActiveDocumentId = uiStore((state) => state.setActiveDocumentId);

    const { mutations: docM } = useDocuments();
    const { mutations: projM } = useProjects();

    useEffect(() => {
        if (isLoaded && !isSignedIn) nav("/sign-in");
    }, [nav, isSignedIn, isLoaded]);

    useEffect(() => {
        setNavBarType(NavBarType.HOME);
        return () => {
            setNavBarType(NavBarType.UNSPECIFIED);
        };
    }, [setNavBarType]);

    useEffect(() => {
        return () => {
            setActiveDocumentId(undefined);
        };
    }, []);

    const handleItemClick = useCallback(
        (item: Document | Project, type: FileTreeItemType) => {
            if (type === FileTreeItemType.PROJECT) {
                nav(`/projects/${item._id}`);
            } else {
                addTab({
                    id: item._id!,
                    docId: item._id!,
                    title: item.name,
                });
                setActiveTab(item._id!);
                setActiveDocumentId(item._id!);
            }
        },
        [nav, addTab, setActiveTab],
    );

    const handleItemCreate = useCallback(
        async (name: string, type: FileTreeItemType) => {
            if (type === FileTreeItemType.DOCUMENT) {
                await docM.createDocumentMutation.mutateAsync(name);
            } else {
                await projM.createProjectMutation.mutateAsync(name);
            }
        },
        [docM, projM],
    );

    const handleItemDelete = useCallback(
        async (item: Document | Project, type: FileTreeItemType) => {
            if (type === FileTreeItemType.DOCUMENT) {
                removeTab(item._id!);
                await docM.deleteDocumentMutation.mutateAsync(item._id!);
            } else {
                await projM.deleteProjectMutation.mutateAsync(item._id!);
            }
        },
        [docM, projM, removeTab],
    );

    return (
        <div className="w-full drawer drawer-open">
            <input id="user-canvas-drawer" type="checkbox" className="drawer-toggle" />

            <div className="flex overflow-hidden flex-col drawer-content">
                {/* Tabbed editor */}
                <TabbedEditor />
            </div>

            {/* File tree */}
            <UserFileTree
                handleItemDelete={handleItemDelete}
                handleItemCreate={handleItemCreate}
                handleItemClick={handleItemClick}
            />
        </div>
    );
};

export default UserCanvas;
