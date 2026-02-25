import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { ActiveCollaborator, ActiveCollaboratorMap, NavBarType, Tab, TabMap } from "../types";
import { genNRandomHexColors } from "../utils";

enableMapSet();

export type UIState = {
    navBarType: NavBarType;
    activeDocumentId?: string;
    activeProjectId?: string;
    activeTabs: TabMap;
    selectedTabId?: string;
    activeCollaborators: ActiveCollaboratorMap;

    setNavBarType: (v: NavBarType) => void;
    setActiveDocumentId: (v: string | undefined) => void;
    setActiveProjectId: (v: string | undefined) => void;

    setActiveTabs: (tabs: TabMap | undefined) => void;
    addTab: (tab: Tab) => void;
    removeTab: (tabId: string, e?: React.MouseEvent) => void;
    setSelectedTab: (tabId?: string) => void;

    setActiveCollaborators: (v: ActiveCollaboratorMap | undefined) => void;
    assignCollaboratorPos: (collaborator: string, pos?: number) => void;
    addActiveCollaborators: (v: string[]) => void;
};

export type State = UIState;

const uiStore = create<State>()(
    immer(
        devtools((set) => ({
            // NavBar State
            navBarType: NavBarType.UNSPECIFIED,

            activeDocumentId: undefined,
            activeProjectId: undefined,

            activeCollaborators: new Map(),

            setActiveDocumentId: (v) =>
                set((state) => {
                    state.activeDocumentId = v;
                }),

            setActiveProjectId: (v) =>
                set((state) => {
                    state.activeProjectId = v;
                }),

            setNavBarType: (v) =>
                set((state) => {
                    state.navBarType = v;
                }),

            // Tabbed Editor State
            activeTabs: new Map(),
            selectedTabId: undefined,

            setActiveTabs: (tabs) =>
                set((state) => {
                    if (!tabs) {
                        state.activeTabs.clear();
                        return;
                    }
                    state.activeTabs = tabs;
                }),

            addTab: (tab) =>
                set((state) => {
                    const exists = state.activeTabs.has(tab.id);
                    const selected = state.selectedTabId === tab.id;
                    if (exists && selected) return;

                    if (!exists) state.activeTabs.set(tab.id, tab);
                    state.selectedTabId = tab.id;
                }),

            removeTab: (tabId, e) =>
                set((state) => {
                    e?.stopPropagation();
                    state.activeTabs.delete(tabId);
                    // If the removed tab was the selected one select the most recently added remaining tab, if any
                    if (state.selectedTabId === tabId) {
                        const remainingKeys = Array.from(state.activeTabs.keys());
                        state.selectedTabId =
                            remainingKeys.length > 0 ? remainingKeys[remainingKeys.length - 1] : undefined;
                    }
                }),

            setSelectedTab: (tabId) =>
                set((state) => {
                    if (state.activeTabs.has(tabId!)) {
                        state.selectedTabId = tabId;
                    } else {
                        state.selectedTabId = undefined;
                    }
                }),

            // Active Collaborators State
            setActiveCollaborators: (collaborators) =>
                set((state) => {
                    if (!collaborators) {
                        state.activeCollaborators.clear();
                        return;
                    }
                    state.activeCollaborators = collaborators;
                }),

            assignCollaboratorPos: (col, pos) =>
                set((state) => {
                    const collaborator = state.activeCollaborators.get(col);
                    if (!collaborator) return;
                    collaborator.pos = pos;
                }),

            addActiveCollaborators: (collaborators) =>
                set((state) => {
                    const currMap = state.activeCollaborators;
                    const oldSet = new Set(currMap.keys());
                    const newSet = new Set(collaborators);
                    const toRemove = [...oldSet].filter((x) => !newSet.has(x));

                    console.log({ oldSet, newSet, toRemove });

                    for (const col of toRemove) {
                        const res = currMap.delete(col);
                        console.log({ removedCol: col, res });
                    }

                    for (const col of collaborators) {
                        console.log({ col });
                        if (!currMap.has(col)) {
                            currMap.set(col, { collaborator: col, color: genNRandomHexColors()[0] });
                        }
                    }
                    state.activeCollaborators = currMap;
                }),
        })),
    ),
);

export default uiStore;
