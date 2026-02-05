import { Document } from "@cr_docs_t/dts";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type DocumentState = {
    document?: Document;

    setDocument: (v: Document) => void;
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
                    email: undefined,

                    setDocument: (v) =>
                        set((state) => {
                            state.document = v;
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
