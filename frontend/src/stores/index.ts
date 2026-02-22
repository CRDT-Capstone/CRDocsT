import { Contributor, Document, FugueMessage, Project } from "@cr_docs_t/dts";
import { Tree } from "web-tree-sitter";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ConnectionState, NavBarType } from "../types";

export type ProjectState = {
    project?: Project;

    setProject: (v: Project | undefined) => void;
};

export type DocumentState = {
    document?: Document;
    ygg?: Tree; // Concrete Syntax Tree (Yggdrasil)
    isParsing: boolean;
    activeCollaborators: string[];
    connectionState: ConnectionState;

    isEffecting: boolean;
    unEffectedMsgs: FugueMessage[];

    setDocument: (v: Document) => void;
    setYgg: (v: Tree) => void;
    setIsParsing: (v: boolean) => void;
    setActiveCollaborators: (v: string[]) => void;

    setConnectionState: (v: ConnectionState) => void;
    toggleIsEffecting: () => void;
    setUnEffectedMsgs: (v: FugueMessage[]) => void;
};

export type DevState = {
    devBarPos: { x: number; y: number };

    setDevBarPos: (v: { x: number; y: number }) => void;
};

export type UserState = {
    anonUserIdentity: string | undefined;

    setAnonUserIdentity: (v?: string) => void;
};

export type UIState = {
    navBarType: NavBarType;
    activeDocumentId?: string;
    activeProjectId?: string;

    setNavBarType: (v: NavBarType) => void;
    setActiveDocumentId: (v: string | undefined) => void;
    setActiveProjectId: (v: string | undefined) => void;
};

export type State = DocumentState & UserState & DevState & UIState & ProjectState;

const mainStore = create<State>()(
    immer(
        devtools(
            // persist(
            (set) => ({
                // Project State
                project: undefined,

                setProject: (v) =>
                    set((state) => {
                        state.project = v;
                    }),

                anonUserIdentity: undefined,
                document: undefined,
                activeCollaborators: [],
                isParsing: false,
                connectionState: ConnectionState.DISCONNECTED,
                isEffecting: true,
                unEffectedMsgs: [],

                setAnonUserIdentity: (v) =>
                    set((state) => {
                        state.anonUserIdentity = v;
                    }),

                setDocument: (v) =>
                    set((state) => {
                        state.document = v;
                    }),

                setYgg: (v) =>
                    set((state) => {
                        state.ygg = v;
                    }),

                setIsParsing: (v) =>
                    set((state) => {
                        state.isParsing = v;
                    }),

                setConnectionState: (v) =>
                    set((state) => {
                        state.connectionState = v;
                    }),

                setActiveCollaborators: (v) =>
                    set((state) => {
                        state.activeCollaborators = v;
                    }),

                toggleIsEffecting: () =>
                    set((state) => {
                        state.isEffecting = !state.isEffecting;
                    }),

                setUnEffectedMsgs: (v) =>
                    set((state) => {
                        state.unEffectedMsgs = v;
                    }),

                // DevState

                devBarPos: { x: 20, y: -20 },

                setDevBarPos: (v) =>
                    set((state) => {
                        state.devBarPos = v;
                    }),

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
            }),
            //     {
            //         name: "mainStore",
            //         storage: createJSONStorage(() => localStorage),
            //         partialize: (state) => ({ anonUserIdentity: state.anonUserIdentity }),
            //     },
            // ),
        ),
    ),
);

export default mainStore;
