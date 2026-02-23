import {
    FugueJoinMessage,
    FugueLeaveMessage,
    FugueTree,
    FugueMessage,
    FugueMessageSerialzier,
    FugueMutationMessageTypes,
    Operation,
    FugueMessageType,
    BaseFugueMessage,
    FugueRejectMessage,
    FugueUserJoinMessage,
} from "@cr_docs_t/dts";
import { AnnotationType, ChangeSet, ChangeSpec, EditorSelection, EditorView } from "@uiw/react-codemirror";
import { RefObject } from "react";
import mainStore from "../stores";
import { toast } from "sonner";

export class WSClient {
    private ws: WebSocket;
    private viewRef: RefObject<EditorView | undefined>;
    private previousTextRef: RefObject<string>;
    private documentID: string;
    private userIdentity: string;
    private fugue: FugueTree;
    private remoteUpdate: AnnotationType<boolean>; // Annotation to mark remote updates and prevent rebroadcasting
    private isReconnection: boolean;

    constructor(
        ws: WebSocket,
        fugue: FugueTree,
        documentID: string,
        remoteUpdate: AnnotationType<boolean>,
        viewRef: RefObject<EditorView | undefined>,
        previousTextRef: RefObject<string>,
        userIdentity: string,
        isReconnection: boolean = false,
    ) {
        this.ws = ws;
        this.viewRef = viewRef;
        this.documentID = documentID;
        this.fugue = fugue;
        this.remoteUpdate = remoteUpdate;
        this.previousTextRef = previousTextRef;
        this.isReconnection = isReconnection;
        this.userIdentity = userIdentity;
        if (userIdentity) this.userIdentity = userIdentity;
        mainStore.getState().setActiveCollaborators([]);

        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);

        this.handleJoin();
        this.initListeners();
    }

    initListeners() {
        // this.ws.onopen = this.handleOpen;
        this.ws.onmessage = this.handleMessage;
    }

    private send(msgs: BaseFugueMessage | BaseFugueMessage[]) {
        const serialized = FugueMessageSerialzier.serialize(Array.isArray(msgs) ? msgs : [msgs]);
        this.ws.send(serialized);
    }

    async handleJoin() {
        console.log(`Is reconnect -> ${this.isReconnection}`);
        if (this.isReconnection) {
            const userJoinedMsg: FugueUserJoinMessage = {
                operation: Operation.USER_JOIN,
                documentID: this.documentID,
                replicaId: this.fugue.replicaId(),
                userIdentity: this.userIdentity,
                collaborators: []
            };
            this.send(userJoinedMsg);
            console.log("Sent user joined msg");
        } else {
            //send the initial sync message to request the persisted state
            const joinMsg: FugueJoinMessage = {
                operation: Operation.INITIAL_SYNC,
                documentID: this.documentID,
                state: null,
                userIdentity: this.userIdentity,
                bufferedOperations: undefined,
                replicaId: this.fugue.replicaId(),
            };
            console.log("joinMsg -> ", joinMsg);

            this.send(joinMsg);
            console.log("Sent initial sync  message!");
        }
    }

    async handleOpen() {
        console.log("WebSocket connected");
    }

    async handleMessage(ev: MessageEvent) {
        console.log("Received message:", ev.data);
        const activeCollaborators = () => mainStore.getState().activeCollaborators;
        const setActiveCollaborators = mainStore.getState().setActiveCollaborators;

        try {
            const blob = ev.data as Blob;
            const buffer = await blob.arrayBuffer(); //convert blob to buffer
            const bytes = new Uint8Array(buffer); //convert to Unit8Array

            const raw = FugueMessageSerialzier.deserialize(bytes);
            console.log("Parsed message -> ", raw);

            // Normalize to array
            const msgs: BaseFugueMessage[] = Array.isArray(raw) ? raw : [raw];

            if (msgs.length === 0) return;
            const firstMsg = msgs[0];

            // Handle user join msg
            if (firstMsg.operation === Operation.USER_JOIN) {
                const userJoinedMsg = firstMsg as FugueUserJoinMessage;
                console.log({ userJoinedMsg });
                setActiveCollaborators(userJoinedMsg.collaborators);
                return;
            }

            // Handle leave message
            if (firstMsg.operation === Operation.LEAVE) {
                const leaveMsg = firstMsg as FugueLeaveMessage;
                const leavingUser = leaveMsg.userIdentity;
                console.log("remove message -> ", leaveMsg);
                console.log("active collaborators -> ", activeCollaborators());
                const newActiveCollaborators = activeCollaborators().filter((c) => c !== leavingUser);
                console.log("new active collaborators -> ", newActiveCollaborators);
                setActiveCollaborators(newActiveCollaborators);
                return;
            }

            // Handle reject message
            if (firstMsg.operation === Operation.REJECT) {
                const rejectMsg = firstMsg as FugueRejectMessage;
                console.log("reject message");
                // Show toast and prevent canvas editing
                // possibly kick them back to home if signed in
                toast.error("User Rejected", {
                    description: rejectMsg.reason,
                });
                return;
            }

            const myId = this.fugue.replicaId();
            const remoteMsgs = (msgs as FugueMutationMessageTypes[]).filter((m) => {
                // Ignore Join messages or messages with my ID
                if ("state" in m) return true; // Handle state separately
                return m.replicaId !== myId;
            });

            const firstRemoteMsg = remoteMsgs[0];

            // Handle Join message (state sync)
            if (firstRemoteMsg.operation === Operation.INITIAL_SYNC && firstRemoteMsg.state) {
                const msg = remoteMsgs[0] as FugueJoinMessage;

                this.fugue.load(msg.state!);

                

                const newText = this.fugue.observe();
                console.log({ newText });
                this.previousTextRef.current = newText;

                // Update CodeMirror programmatically
                console.log({ curr: this.viewRef.current });
                if (this.viewRef.current) {
                    console.log("Syncing state from JOIN message");
                    const view = this.viewRef.current;

                    // Create a transaction using the state's tr builder
                    const tr = view.state.update({
                        changes: [
                            {
                                from: 0,
                                to: view.state.doc.length,
                                insert: newText,
                            },
                        ],
                        selection: EditorSelection.cursor(Math.min(view.state.selection.main.from, newText.length)),
                        annotations: [this.remoteUpdate.of(true)],
                    });
                    view.dispatch(tr);
                }
            }
            // Handle updates
            else {
                const msgs = remoteMsgs.filter((m) => {
                    return !("state" in m);
                }) as FugueMessage[];
                const isEffecting = mainStore.getState().isEffecting;
                const unEffectedMsgs = mainStore.getState().unEffectedMsgs;
                const setUnEffectedMsgs = mainStore.getState().setUnEffectedMsgs;

                if (isEffecting) {
                    this.effectMsgs(msgs);
                } else {
                    // If not effecting, store the messages to be effected later
                    console.log("Not effecting, storing messages for later -> ", msgs);
                    const newUnEffectedMsgs = unEffectedMsgs.concat(msgs);
                    setUnEffectedMsgs(newUnEffectedMsgs);
                }

                // Sync local ref so we don't rebroadcast the change
                this.previousTextRef.current = this.viewRef.current?.state.doc.toString()
                    ? this.viewRef.current.state.doc.toString()
                    : this.previousTextRef.current;
            }
        } catch (error) {
            console.error("Error processing remote message:", error);
        }
    }

    setUserIdentity(email?: string) {
        if (email) this.userIdentity = email;
    }

    getUserIdenity(): string | undefined {
        return this.userIdentity;
    }

    effectMsgs(msgs: FugueMessage[]) {
        const applied = this.fugue.effect(msgs);

        if (!this.viewRef.current) return;
        for (const m of applied) {
            try {
                const node = this.fugue.getById(m.id);
                const fromIdx = this.fugue.getVisibleIndex(node);
                const l = this.viewRef.current.state.doc.length;

                if (fromIdx <= l) {
                    if (m.operation === Operation.DELETE) {
                        this.viewRef.current.dispatch({
                            changes: {
                                from: fromIdx,
                                to: fromIdx + 1,
                                insert: "",
                            },
                            annotations: [this.remoteUpdate.of(true)],
                        });
                    } else if (m.operation === Operation.INSERT) {
                        this.viewRef.current.dispatch({
                            changes: {
                                from: fromIdx,
                                to: fromIdx,
                                insert: m.data!,
                            },
                            annotations: [this.remoteUpdate.of(true)],
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to sync UI state ->", e);
            }
        }
    }

    isOffline() {
        return this.ws.readyState === WebSocket.CLOSED;
    }
}
