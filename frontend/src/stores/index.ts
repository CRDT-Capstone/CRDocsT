import { Document } from "@cr_docs_t/dts";
import { create } from "zustand";
import { createJSONStorage, devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

export type DocumentState = {
    document?: Document;

    setDocument: (v: Document) => void;
};

export type State = DocumentState;

const mainStore = create<State>()(
    immer(
        devtools((set) => ({
            document: undefined,

            setDocument: (v) =>
                set((state) => {
                    state.document = v;
                }),
        })),
    ),
);

export default mainStore;
