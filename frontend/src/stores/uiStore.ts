import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { enableMapSet } from "immer";
import { NavBarType, Tab, TabMap } from "../types";

enableMapSet();

export type UIState = {
    navBarType: NavBarType;
    activeDocumentId?: string;
    activeProjectId?: string;
    activeTabs: TabMap;
    selectedTabId?: string;

    setNavBarType: (v: NavBarType) => void;
    setActiveDocumentId: (v: string | undefined) => void;
    setActiveProjectId: (v: string | undefined) => void;

    setActiveTabs: (tabs: TabMap) => void;
    addTab: (tab: Tab) => void;
    removeTab: (tabId: string, e?: React.MouseEvent) => void;
    setSelectedTab: (tabId?: string) => void;
};

export type State = UIState;

const uiStore = create<State>()(
    immer(
        devtools((set) => ({
            // NavBar State
            navBarType: NavBarType.UNSPECIFIED,

            activeDocumentId: undefined,
            activeProjectId: undefined,

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
                    state.activeTabs = tabs;
                }),

            addTab: (tab) =>
                set((state) => {
                    state.activeTabs.set(tab.id, tab);
                    state.selectedTabId = tab.id;
                }),

            removeTab: (tabId, e) =>
                set((state) => {
                    e?.stopPropagation();
                    state.activeTabs.delete(tabId);
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
        })),
    ),
);

export default uiStore;
