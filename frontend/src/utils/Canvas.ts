import { AnnotationType } from "@codemirror/state";
import { ViewUpdate } from "@codemirror/view";
import { chunkArray, FugueMessage, FugueTree } from "@cr_docs_t/dts";
import { RefObject } from "react";
import { WSClient } from "./WSClient";
import { YggdrasilType } from "../treesitter/codemirror";
import {
    GumTreeBottomUp,
    GumTreeTopDown,
    Ratatoskr,
    Registry,
    SimplifiedChawatheScriptGen,
    TreeMetricComputer,
    CompositeMatcher,
} from "@cr_docs_t/dts/treesitter";

/**
 * Handle changes from CodeMirror
 */
export const HandleChange = async (
    fugue: FugueTree,
    wsClient: WSClient | undefined,
    previousTextRef: RefObject<string>,
    RemoteUpdate: AnnotationType<boolean>,
    JoinUpdate: AnnotationType<boolean>,
    Yggdrasil: YggdrasilType | null,
    Ratatoskr: Ratatoskr | undefined,
    matcher: CompositeMatcher,
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
    // If this transaction has the JoinUpdate annotation, we should treat it differently for cursor updates
    const isJoin = viewUpdate.transactions.some((tr) => tr.annotation(JoinUpdate));
    console.log({ isRemote, isJoin });

    if (isRemote) {
        // Just sync the ref so we don't diff against stale text later
        previousTextRef.current = value;
        return;
    }

    const oldAst = Yggdrasil ? viewUpdate.startState.field(Yggdrasil, false) : undefined;
    const newAst = Yggdrasil ? viewUpdate.state.field(Yggdrasil, false) : undefined;

    if (isJoin) {
        if (!newAst) {
            console.error("No AST found on join update!");
            return;
        }
        fugue.stampAll(newAst);
        previousTextRef.current = value;
        return;
    }

    // Collect all change regions first
    const changes: Array<{ fromA: number; toA: number; fromB: number; inserted: string }> = [];
    viewUpdate.changes.iterChanges((fromA, toA, fromB, _toB, inserted) => {
        changes.push({ fromA, toA, fromB, inserted: inserted.toString() });
    });

    console.log({
        Ratatoskr: !!Ratatoskr,
        oldAst: !!oldAst,
        newAst: !!newAst,
    });
    if (Ratatoskr && oldAst && newAst) {
        // fugue.stampAll(oldAst);
        console.log({ astIdx: fugue.astIdx });
        console.log("Processing changes with GumTree...");
        Ratatoskr.newAst = newAst;
        const editScript = matcher.match(oldAst, newAst);

        const msgs = Ratatoskr.translate(editScript);
        console.log({ msgs });
        fugue.stampAll(newAst);
        fugue.propagate(msgs);
    } else if (newAst && fugue.length() > 0) {
        fugue.stampAll(newAst);
    }
    // } else {
    //     console.log("Processing changes with basic diff...");
    //     for (const { fromA, toA, fromB, inserted } of changes) {
    //         const deleteLen = toA - fromA;
    //         const insertedLen = inserted.length;
    //
    //         if (deleteLen > 0) {
    //             const msgs = fugue.deleteMultiple(fromA, deleteLen);
    //             fugue.propagate(msgs);
    //         }
    //
    //         if (insertedLen > 0) {
    //             const msgs = fugue.insertMultiple(fromB, inserted);
    //             fugue.propagate(msgs);
    //         }
    //     }
    // }

    previousTextRef.current = value;
};
