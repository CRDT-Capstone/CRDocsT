import { AnnotationType } from "@codemirror/state";
import { ViewUpdate } from "@codemirror/view";
import { FugueTree } from "@cr_docs_t/dts";
import { RefObject } from "react";
import WSClient from "./WSClient";

const THRESHOLD = 1000;

const yieldToMain = () => {
    if ("scheduler" in globalThis && "yield" in (globalThis as any).scheduler) {
        return (globalThis as any).scheduler.yield();
    }
    return new Promise<void>((resolve) => setTimeout(resolve, 0));
};

export const HandleChange = async (
    fugue: FugueTree,
    wsClient: WSClient | undefined,
    previousTextRef: RefObject<string>,
    RemoteUpdate: AnnotationType<boolean>,
    value: string,
    viewUpdate: ViewUpdate,
) => {
    if (wsClient && viewUpdate.selectionSet) {
        const pos = viewUpdate.state.selection.main.head;
        wsClient.sendCursorUpdate(pos);
    }

    if (!viewUpdate.docChanged) return;

    const isRemote = viewUpdate.transactions.some((tr) => tr.annotation(RemoteUpdate));
    if (isRemote) {
        previousTextRef.current = value;
        return;
    }

    const changes: Array<{ fromA: number; toA: number; fromB: number; inserted: string }> = [];
    viewUpdate.changes.iterChanges((fromA, toA, fromB, _toB, inserted) => {
        changes.push({ fromA, toA, fromB, inserted: inserted.toString() });
    });

    for (const { fromA, toA, fromB, inserted } of changes) {
        const deleteLen = toA - fromA;
        const insertedLen = inserted.length;
        const isLarge = deleteLen > THRESHOLD || insertedLen > THRESHOLD;

        if (isLarge) await yieldToMain();

        if (deleteLen > 0) {
            const msgs = fugue.deleteMultiple(fromA, deleteLen);
            fugue.propagate(msgs);
            if (isLarge) await yieldToMain();
        }

        if (insertedLen > 0) {
            const msgs = fugue.insertMultiple(fromB, inserted);
            fugue.propagate(msgs);
            if (isLarge) await yieldToMain();
        }
    }

    previousTextRef.current = value;
};
