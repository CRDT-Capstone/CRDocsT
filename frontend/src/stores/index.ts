import { Contributor, Document, FugueMessage } from "@cr_docs_t/dts";
import { Tree } from "web-tree-sitter";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type DocumentState = {
    document?: Document;
    ygg?: Tree; // Concrete Syntax Tree (Yggdrasil)
    isParsing: boolean;
    activeCollaborators: string[];

    isEffecting: boolean;
    unEffectedMsgs: FugueMessage[];

    setDocument: (v: Document) => void;
    setYgg: (v: Tree) => void;
    setIsParsing: (v: boolean) => void;
    setActiveCollaborators: (v: string[]) => void;

    toggleIsEffecting: () => void;
    setUnEffectedMsgs: (v: FugueMessage[]) => void;
};

export type UserState = {
    email?: string;

    setEmail: (v: string) => void;
};

export type State = DocumentState & UserState;

const mainStore = create<State>()(
    immer(
        devtools(
            persist(
                (set) => ({
                    document: undefined,
                    activeCollaborators: [],
                    isParsing: false,
                    email: undefined,
                    isEffecting: true,
                    unEffectedMsgs: [],

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

                    setActiveCollaborators: (v) =>
                        set((state) => {
                            state.activeCollaborators = v;
                        }),

                    setEmail: (v) =>
                        set((state) => {
                            state.email = v;
                        }),

                    toggleIsEffecting: () =>
                        set((state) => {
                            state.isEffecting = !state.isEffecting;
                        }),

                    setUnEffectedMsgs: (v) =>
                        set((state) => {
                            state.unEffectedMsgs = v;
                        }),
                }),
                {
                    name: "mainStore",
                    storage: createJSONStorage(() => sessionStorage),
                },
            ),
        ),
    ),
);

export default mainStore;
