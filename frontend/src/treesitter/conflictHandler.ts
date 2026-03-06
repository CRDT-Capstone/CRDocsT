import { AutoRecoveryStrategy, Conflict, ConflictHandler, ConflictType } from "@cr_docs_t/dts/treesitter";
import { toast } from "sonner";

const CONFLICT_LABELS: Record<ConflictType, string> = {
    [ConflictType.DUPLICATE_ADD]: "Duplicate node added",
    [ConflictType.UPDATE_ON_STALE_LOCATION]: "Edit landed at old location",
    [ConflictType.CONCURRENT_MOVE_DUPLICATE]: "Node moved to two places",
    [ConflictType.MOVE_OF_DELETED_NODE]: "Moved node was already deleted",
    [ConflictType.UPDATE_OF_DELETED_NODE]: "Edited node was already deleted",
    [ConflictType.ADD_OF_EXISTING_NODE]: "Node re-added unexpectedly",
    [ConflictType.OPERATION_ON_MISSING_NODE]: "Operation on unknown node",
};

/**
 * A deterministic tiebreak already picked the winner inside ConflictClassifier.
 * Show a brief informational toast so the user knows one of the duplicate
 * additions was discarded — it will auto-dismiss after 4 s.
 */
function handleRemoveDuplicate(conflict: Conflict): void {
    const { nodeKey, recoverySuggestion } = conflict;
    if (recoverySuggestion?.strategy !== AutoRecoveryStrategy.REMOVE_DUPLICATE) return;

    const { keepTxId, discardTxId } = recoverySuggestion;

    toast.info("Duplicate edit auto-resolved", {
        description: `Node "${nodeKey}" was added by two collaborators at the same time. One copy was automatically removed.`,
        duration: 4_000,
    });

    console.info("[COAST] REMOVE_DUPLICATE resolved", { nodeKey, keepTxId, discardTxId });
}

/**
 * The node was moved by one collaborator while another was editing it.
 * The edit characters are now orphaned at the old location. Warn the user
 * that their edit may not appear in the expected place and prompt them to
 * review the node at its new location.
 */
function handleReApplyUpdateAtNewAnchor(conflict: Conflict): void {
    const { nodeKey, incoming, recoverySuggestion } = conflict;
    if (recoverySuggestion?.strategy !== AutoRecoveryStrategy.RE_APPLY_UPDATE_AT_NEW_ANCHOR) return;

    const { newAnchorNodeKey } = recoverySuggestion;

    toast.warning("Edit may be out of place", {
        description: `Node "${nodeKey}" was moved while you were editing it. Your changes may have landed at the old location — please review "${newAnchorNodeKey}".`,
        duration: 8_000,
        action: {
            label: "Dismiss",
            onClick: () => {},
        },
    });

    console.warn("[COAST] RE_APPLY_UPDATE_AT_NEW_ANCHOR conflict", {
        nodeKey,
        newAnchorNodeKey,
        incomingReplica: incoming.replicaId,
        incomingTxnId: incoming.txnId,
    });
}

/**
 * A node was deleted by one collaborator and then re-added by another
 * (resurrection). This may be intentional or a stale message — surface it as
 * a low-priority informational toast so the user can verify the content.
 */
function handleRestoreRegistryEntry(conflict: Conflict): void {
    const { nodeKey, prior, incoming, recoverySuggestion } = conflict;
    if (recoverySuggestion?.strategy !== AutoRecoveryStrategy.RESTORE_REGISTRY_ENTRY) return;

    const { fromTxId } = recoverySuggestion;

    toast.info("Deleted content was restored", {
        description: `Node "${nodeKey}" was previously removed and has been re-added by a collaborator. Please verify the restored content is correct.`,
        duration: 6_000,
        action: {
            label: "OK",
            onClick: () => {},
        },
    });

    console.info("[COAST] RESTORE_REGISTRY_ENTRY — resurrection", {
        nodeKey,
        deletedByReplica: prior.replicaId,
        restoredByReplica: incoming.replicaId,
        fromTxId,
    });
}

/**
 * No automatic resolution is possible. Show a persistent error toast with
 * the conflict description and call the optional `onUnresolvableConflict`
 * callback so the hosting component can e.g. highlight the affected node,
 * open a diff view, or disable editing.
 */
function handleNotifyUser(conflict: Conflict, onUnresolvableConflict?: (conflict: Conflict) => void): void {
    const { type, nodeKey, prior, incoming, desc } = conflict;

    const label = CONFLICT_LABELS[type] ?? "Collaboration conflict";

    toast.error(label, {
        description: desc,
        duration: Infinity,
        action: {
            label: "Dismiss",
            onClick: () => {},
        },
    });

    console.error("[COAST] NOTIFY_USER — unresolvable conflict", {
        conflictType: type,
        nodeKey,
        priorReplica: prior.replicaId,
        incomingReplica: incoming.replicaId,
        desc,
    });

    onUnresolvableConflict?.(conflict);
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface ConflictHandlerOptions {
    /**
     * Called for every NOTIFY_USER conflict (the ones that cannot be
     * auto-resolved). Use this to highlight the affected node in the editor,
     * open a diff panel.
     */
    onUnresolvableConflict?: (conflict: Conflict) => void;
}

export function createFrontendConflictHandler(options: ConflictHandlerOptions = {}): ConflictHandler {
    const { onUnresolvableConflict } = options;

    return (conflict: Conflict): void => {
        const strategy = conflict.recoverySuggestion?.strategy;

        switch (strategy) {
            case AutoRecoveryStrategy.REMOVE_DUPLICATE:
                handleRemoveDuplicate(conflict);
                break;

            case AutoRecoveryStrategy.RE_APPLY_UPDATE_AT_NEW_ANCHOR:
                handleReApplyUpdateAtNewAnchor(conflict);
                break;

            case AutoRecoveryStrategy.RESTORE_REGISTRY_ENTRY:
                handleRestoreRegistryEntry(conflict);
                break;

            case AutoRecoveryStrategy.NOTIFY_USER:
            default:
                handleNotifyUser(conflict, onUnresolvableConflict);
                break;
        }
    };
}
