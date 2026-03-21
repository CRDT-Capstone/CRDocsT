import { Document, FugueMessage, Project } from "@cr_docs_t/dts";
import { Tree } from "web-tree-sitter";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { ConnectionState } from "../types";

export type ProjectState = {
    project?: Project;

    setProject: (v: Project | undefined) => void;
};

export type DocumentState = {
    document?: Document;
    ygg?: Tree; // Concrete Syntax Tree (Yggdrasil)
    isParsing: boolean;
    isSynching: boolean;
    connectionState: ConnectionState;

    isEffecting: boolean;
    unEffectedMsgs: FugueMessage[];

    setDocument: (v: Document | undefined) => void;
    setYgg: (v: Tree) => void;
    setIsParsing: (v: boolean) => void;
    setIsSynching: (v: boolean) => void;

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

export type State = DocumentState & UserState & DevState & ProjectState;

const mainStore = create<State>()(
    immer(
        devtools((set) => ({
            project: undefined,

            setProject: (v) =>
                set((state) => {
                    state.project = v;
                }),

            anonUserIdentity: undefined,
            document: undefined,
            isParsing: false,
            isSynching: false,
            connectionState: ConnectionState.DISCONNECTED,
            isEffecting: true,
            unEffectedMsgs: [],

            setIsSynching: (v) =>
                set((state) => {
                    state.isSynching = v;
                }),

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
        })),
    ),
);

export default mainStore;
