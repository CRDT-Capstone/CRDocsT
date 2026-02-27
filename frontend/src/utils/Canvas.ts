import { AnnotationType } from "@codemirror/state";
import { ViewUpdate } from "@codemirror/view";
import { chunkArray, FugueMessage, FugueTree } from "@cr_docs_t/dts";
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

    // Collect all change regions first
    const changes: Array<{ fromA: number; toA: number; fromB: number; inserted: string }> = [];
    viewUpdate.changes.iterChanges((fromA, toA, fromB, _toB, inserted) => {
        changes.push({ fromA, toA, fromB, inserted: inserted.toString() });
    });

    // Now process each change region asynchronously with yielding
    for (const { fromA, toA, fromB, inserted } of changes) {
        const deleteLen = toA - fromA;
        const insertedLen = inserted.length;

        if (deleteLen > 0) {
            const msgs = fugue.deleteMultiple(fromA, deleteLen);
            fugue.propagate(msgs);
        }

        if (insertedLen > 0) {
            const msgs = fugue.insertMultiple(fromB, inserted);
            fugue.propagate(msgs);
        }
    }

    previousTextRef.current = value;
};
