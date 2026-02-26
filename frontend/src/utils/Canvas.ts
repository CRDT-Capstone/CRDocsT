import { AnnotationType } from "@codemirror/state";
import { ViewUpdate } from "@codemirror/view";
import { FugueTree } from "@cr_docs_t/dts";
import { RefObject } from "react";
import { WSClient } from "./WSClient";

/**
 * Handle changes from CodeMirror
 */
export const HandleChange = async (
    fugue: FugueTree,
    wsClient: WSClient | undefined,
    previousTextRef: RefObject<string>,
    RemoteUpdate: AnnotationType<boolean>,
    value: string,
    viewUpdate: ViewUpdate,
) => {
    // Get cursor changes
    if (wsClient && viewUpdate.selectionSet) {
        const pos = viewUpdate.state.selection.main.head;
        wsClient.sendCursorUpdate(pos);
    }

    if (!viewUpdate.docChanged) return;

    // If this transaction has the RemoteUpdate annotation we  ignore CRDT logic
    const isRemote = viewUpdate.transactions.some((tr) => tr.annotation(RemoteUpdate));

    if (isRemote) {
        // Just sync the ref so we don't diff against stale text later
        previousTextRef.current = value;
        return;
    }

    // Get the actual changes from viewUpdate
    const newText = value;

    viewUpdate.changes.iterChanges(async (fromA, toA, fromB, toB, inserted) => {
        const deleteLen = toA - fromA;
        const insertedLen = toB - fromB;
        const insertedTxt = inserted.toString();

        // Handle deletion
        if (deleteLen > 0) {
            const msgs = fugue.deleteMultiple(fromA, deleteLen);
        }

        // Handle insertion
        if (insertedLen > 0) {
            const msgs = fugue.insertMultiple(fromA, insertedTxt);
        }
    });

    previousTextRef.current = newText;
};
