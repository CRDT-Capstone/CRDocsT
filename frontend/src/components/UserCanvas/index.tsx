import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSession } from "@clerk/clerk-react";
import mainStore from "../../stores";
import { NavBarType } from "../../types";
import UserFileTree from "../UserFileTree";
import { Project, Document } from "@cr_docs_t/dts";
import { FileTreeItemType } from "../BaseFileTree";
import useTabbedEditor from "../TabbedEditor";
import { useDocuments, useProjects } from "../../hooks/queries";

const UserCanvas = () => {
    const nav = useNavigate();
    const { isSignedIn, isLoaded } = useSession();
    const setNavBarType = mainStore((state) => state.setNavBarType);
    const { TabbedEditor, addTab, removeTab, setActiveTab } = useTabbedEditor();

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

    const handleItemClick = (item: Document | Project, type: FileTreeItemType) => {
        if (type === FileTreeItemType.PROJECT) {
            nav(`/projects/${item._id}`);
        } else {
            // Add tab ig
            console.log({ item });
            addTab({
                id: item._id!,
                docId: item._id!,
                title: item.name,
            });
            setActiveTab(item._id!);
        }
    };

    const handleItemCreate = async (name: string, type: FileTreeItemType) => {
        if (type === FileTreeItemType.DOCUMENT) {
            await docM.createDocumentMutation.mutateAsync(name);
        } else {
            await projM.createProjectMutation.mutateAsync(name);
        }
    };

    const handleItemDelete = async (item: Document | Project, type: FileTreeItemType) => {
        if (type === FileTreeItemType.DOCUMENT) {
            removeTab(item._id!);
            await docM.deleteDocumentMutation.mutateAsync(item._id!);
        } else {
            await projM.deleteProjectMutation.mutateAsync(item._id!);
        }
    };

    return (
        <div className="w-screen h-screen drawer lg:drawer-open">
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
