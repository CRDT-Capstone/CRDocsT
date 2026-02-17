import { Contributor, Document } from "@cr_docs_t/dts";
import { Tree } from "web-tree-sitter";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type DocumentState = {
    document?: Document;
    tree?: Tree;
    isParsing: boolean;
    activeCollaborators: string[];

    setDocument: (v: Document) => void;
    setTree: (v: Tree) => void;
    setIsParsing: (v: boolean) => void;
    setActiveCollaborators: (v: string[]) => void;
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

                    setDocument: (v) =>
                        set((state) => {
                            state.document = v;
                        }),

                    setTree: (v) =>
                        set((state) => {
                            state.tree = v;
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
