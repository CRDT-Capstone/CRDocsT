import { AnnotationType } from "@codemirror/state";
import { ViewUpdate } from "@codemirror/view";
import { FugueTree } from "@cr_docs_t/dts";
import { RefObject } from "react";

/**
 * Handle changes from CodeMirror
 */
export const HandleChange = async (
    fugue: FugueTree,
    previousTextRef: RefObject<string>,
    RemoteUpdate: AnnotationType<boolean>,
    value: string,
    viewUpdate: ViewUpdate,
) => {
    if (!viewUpdate.docChanged) return;

    // If this transaction has our "RemoteUpdate" annotation, we strictly ignore CRDT logic
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
            // console.log({
            //     operation: Operation.DELETE,
            //     index: fromA,
            //     count: deleteLen,
            //     userIdentity,
            // });
            const msgs = fugue.deleteMultiple(fromA, deleteLen);
        }

        // Handle insertion
        if (insertedLen > 0) {
            // console.log({
            //     operation: Operation.INSERT,
            //     index: fromA,
            //     text: insertedTxt,
            //     userIdentity,
            //     fugueIdentity: fugue.userIdentity,
            // });

            const msgs = fugue.insertMultiple(fromA, insertedTxt);
        }
    });

    previousTextRef.current = newText;
};
