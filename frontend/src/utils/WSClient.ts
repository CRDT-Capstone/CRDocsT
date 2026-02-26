import {
    FugueJoinMessage,
    FugueLeaveMessage,
    FugueTree,
    FugueMessage,
    FugueMessageSerialzier,
    FugueMutationMessageTypes,
    Operation,
    FugueMessageType,
    PresenceMessageType,
    BaseFugueMessage,
    FugueRejectMessage,
    FugueUserJoinMessage,
    BasePresenceMessage,
    PresenceMessageSerializer,
    makeFugueMessage,
    PresenceCursorMessage,
    makePresenceMsg,
    Seralizer,
} from "@cr_docs_t/dts";
import { AnnotationType, ChangeSet, ChangeSpec, EditorSelection, EditorView } from "@uiw/react-codemirror";
import { RefObject } from "react";
import mainStore from "../stores";
import { toast } from "sonner";
import { BaseMessage, MessageType } from "@cr_docs_t/dts";
import { createRemoteCursorEffect, RemoteCursor } from "../codemirror/decorations";
import uiStore from "../stores/uiStore";

export class WSClient {
    private ws: WebSocket;
    private viewRef: RefObject<EditorView | undefined>;
    private previousTextRef: RefObject<string>;
    private documentID: string;
    private userIdentity: string;
    private fugue: FugueTree;
    private remoteUpdate: AnnotationType<boolean>; // Annotation to mark remote updates and prevent rebroadcasting
    private isReconnection: boolean;
    private Q: Promise<void> = Promise.resolve();

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
        uiStore.getState().setActiveCollaborators(undefined);

        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);

        this.handleJoin();
        this.initListeners();
    }

    private initListeners() {
        // this.ws.onopen = this.handleOpen;
        this.ws.onmessage = this.handleMessage;
    }

    private send(msgs: BaseMessage | BaseMessage[]) {
        const msgsArray = Array.isArray(msgs) ? msgs : [msgs];
        const bytes = this.serialize(msgsArray);
        this.ws.send(bytes);
    }

    private serialize(msgs: BaseMessage | BaseMessage[]): Uint8Array {
        return Seralizer.serialize(msgs);
    }

    private deserialize(bytes: Uint8Array): BaseFugueMessage[] | BasePresenceMessage[] {
        return Seralizer.deserialize(bytes);
    }

    private async handleJoin() {
        console.log(`Is reconnect -> ${this.isReconnection}`);
        // Now that offline sync is out of scope when we reconnect we clear the
        // editor state, and send an initial sync message to receive the state of
        // all the other replicas that stayed online
        if (this.isReconnection) {
            // Clear fugue state
            this.fugue.clear();

            // Clear editor state
            if (!this.viewRef.current) return;
            const view = this.viewRef.current;
            view.dispatch({
                changes: {
                    from: 0,
                    to: view.state.doc.length,
                    insert: "",
                },
                annotations: [this.remoteUpdate.of(true)],
                selection: EditorSelection.cursor(0),
            });

            this.previousTextRef.current = "";

            // Send initial sync message to request the persisted state from other replicas that stayed online
            const joinMsg = makeFugueMessage<FugueJoinMessage>({
                operation: Operation.INITIAL_SYNC,
                documentID: this.documentID,
                state: null,
                userIdentity: this.userIdentity,
                replicaId: this.fugue.replicaId(),
            });

            this.send(joinMsg);
            console.log("Sent reconnect initial sync message");
        } else {
            //send the initial sync message to request the persisted state
            const joinMsg = makeFugueMessage<FugueJoinMessage>({
                operation: Operation.INITIAL_SYNC,
                documentID: this.documentID,
                state: null,
                userIdentity: this.userIdentity,
                replicaId: this.fugue.replicaId(),
            });

            this.send(joinMsg);
            console.log("Sent initial sync  message!");
        }
    }

    private async handleOpen() {
        console.log("WebSocket connected");
    }

    private updateCursors() {
        if (!this.viewRef.current) return;
        const view = this.viewRef.current;
        const activeCollaborators = uiStore.getState().activeCollaborators;

        const cursors: RemoteCursor[] = [...activeCollaborators.values()]
            .filter((col) => col.pos !== undefined)
            .map((col) => ({ userIdentity: col.collaborator, pos: col.pos!, color: col.color }));
        view.dispatch({
            effects: createRemoteCursorEffect.of(cursors),
        });
    }

    async handleMessage(ev: MessageEvent) {
        try {
            const blob = ev.data as Blob;
            const buffer = await blob.arrayBuffer(); //convert blob to buffer
            const bytes = new Uint8Array(buffer); //convert to Unit8Array

            const raw = this.deserialize(bytes);

            // Determine if it's a FugueMessage or PresenceMessage based on the first message's type
            if (raw.length === 0) {
                console.warn("Received empty message");
                return;
            }

            this.Q = this.Q.then(async () => {
                const firstMsg = raw[0];
                switch (firstMsg.msgType) {
                    case MessageType.FUGUE:
                        await this.handleFugueMessages(raw as BaseFugueMessage[]);
                        break;
                    case MessageType.PRESENCE:
                        await this.handlePresenceMessages(raw as BasePresenceMessage[]);
                        break;
                    default: {
                        // Exhastive check to make sure we handled all message types
                        const _exhaustiveCheck: never = firstMsg;
                        return _exhaustiveCheck;
                    }
                }
            });
        } catch (error) {
            console.error("Error processing remote message:", error);
        }
    }

    private async handleFugueMessages(msgs: BaseFugueMessage[]) {
        const activeCollaborators = () => uiStore.getState().activeCollaborators;
        const addActiveCollaborators = uiStore.getState().addActiveCollaborators;

        if (msgs.length === 0) return;
        const firstMsg = msgs[0];

        // Handle user join msg
        if (firstMsg.operation === Operation.USER_JOIN) {
            const userJoinedMsg = firstMsg as FugueUserJoinMessage;
            const withoutThisUser = userJoinedMsg.collaborators.filter((c) => c !== this.userIdentity);
            addActiveCollaborators(withoutThisUser);
            return;
        }

        // Handle leave message
        if (firstMsg.operation === Operation.LEAVE) {
            const leaveMsg = firstMsg as FugueLeaveMessage;
            addActiveCollaborators(leaveMsg.collaborators);
            this.updateCursors();
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

        if (remoteMsgs.length === 0) return;

        const firstRemoteMsg = remoteMsgs[0];

        // Handle Join message (state sync)
        if (firstRemoteMsg.operation === Operation.INITIAL_SYNC && firstRemoteMsg.state) {
            const msg = remoteMsgs[0] as FugueJoinMessage;

            this.fugue.clear();
            this.fugue.load(msg.state!);

            const newText = this.fugue.observe();
            this.previousTextRef.current = newText;

            // Update CodeMirror programmatically
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
        else if ([Operation.INSERT, Operation.DELETE].includes(firstMsg.operation)) {
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

            // Wait for the DOM to settle
            await new Promise((res) => requestAnimationFrame(res));
        }
    }

    private async handlePresenceMessages(msgs: BasePresenceMessage[]) {
        const assignCollaboratorPos = uiStore.getState().assignCollaboratorPos;

        const handleMsgType = (msg: BasePresenceMessage) => {
            if (!this.viewRef.current) return;
            switch (msg.type) {
                case PresenceMessageType.CURSOR:
                    // If its a cursor message update remove cursor positons for that user identity
                    // using the remote cursor codemirror support effect
                    const { userIdentity, pos } = msg as PresenceCursorMessage;
                    assignCollaboratorPos(userIdentity, pos);
                    this.updateCursors();

                    break;
                case PresenceMessageType.SELECTION:
                    break;
            }
        };

        if (msgs.length === 0) return;

        for (const msg of msgs) {
            handleMsgType(msg);
        }
    }

    async sendCursorUpdate(pos: number) {
        const msg = makePresenceMsg<PresenceCursorMessage>({
            documentID: this.documentID,
            userIdentity: this.userIdentity,
            type: PresenceMessageType.CURSOR,
            pos: pos,
        });
        this.send(msg);
    }

    setUserIdentity(email?: string) {
        if (email) this.userIdentity = email;
    }

    getUserIdenity(): string | undefined {
        return this.userIdentity;
    }

    private effectMsgs(msgs: FugueMessage[]) {
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
