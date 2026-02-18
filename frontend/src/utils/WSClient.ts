import {
    FugueJoinMessage,
    FugueLeaveMessage,
    FugueTree,
    FugueMessage,
    FugueMessageSerialzier,
    FugueMutationMessageTypes,
    Operation,
    StringPosition,
} from "@cr_docs_t/dts";
import { AnnotationType, EditorSelection, EditorView } from "@uiw/react-codemirror";
import { RefObject } from "react";
import mainStore from "../stores";
import { toast } from "sonner";
import { DocumentsIndexedDB } from "../stores/dexie/documents";

const webSocketUrl = import.meta.env.VITE_WSS_URL as string;

export class WSClient {
    private ws: WebSocket;
    private viewRef: RefObject<EditorView | undefined>;
    private previousTextRef: RefObject<string>;
    private documentID: string;
    private userIdentity?: string = undefined;
    private fugue: FugueTree;
    private remoteUpdate: AnnotationType<boolean>;

    constructor(
        ws: WebSocket,
        fugue: FugueTree,
        documentID: string,
        remoteUpdate: AnnotationType<boolean>,
        viewRef: RefObject<EditorView | undefined>,
        previousTextRef: RefObject<string>,
        userIdentity: string | undefined = undefined,
    ) {
        this.ws = ws;
        this.viewRef = viewRef;
        this.documentID = documentID;
        this.fugue = fugue;
        this.remoteUpdate = remoteUpdate;
        this.previousTextRef = previousTextRef;
        if (userIdentity) this.userIdentity = userIdentity;
        mainStore.getState().setActiveCollaborators([]);

        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);

        this.initListeners();
    }

    initListeners() {
        this.ws.onopen = this.handleOpen;
        this.ws.onmessage = this.handleMessage;
    }



    async handleOpen() {
        console.log("WebSocket connected");
        toast.success("You are connected");

        let savedDocChanges;
        try {
            //get any local changes 
            console.log('Fugue Id -> ', this.fugue.documentID);
            savedDocChanges = await DocumentsIndexedDB.getBufferedChanges(this.fugue.documentID);
            console.log('Changes that we are about to send -> ', savedDocChanges);

            const FugueMessages: FugueMessage[] = savedDocChanges.map((changes)=> changes.fugueMsg);
            const serialisedLocalChangeMessage = FugueMessageSerialzier.serialize(FugueMessages);
            this.ws.send(serialisedLocalChangeMessage);
            //send buffered local changes messages 

            //await DocumentsIndexedDB.deleteBufferedChanges(this.fugue.documentID);
        } catch (err) {
            console.log("Error processing buffered changes -> ", err);
        }

        //send the join message with the local changes
        const joinMsg: FugueJoinMessage = {
            operation: Operation.JOIN,
            documentID: this.documentID,
            state: null,
            userIdentity: this.userIdentity,
            localState: null,
            replicaId: this.fugue.replicaId()
        };
        console.log("joinMsg -> ", joinMsg);

        const serializedJoinMessage = FugueMessageSerialzier.serialize([joinMsg]);

        this.ws.send(serializedJoinMessage);
        console.log("Sent serialized Join message!");
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
            type FugueMsgType = FugueMutationMessageTypes | FugueLeaveMessage;
            const msgs: FugueMsgType[] = Array.isArray(raw) ? (raw as FugueMsgType[]) : ([raw] as FugueMsgType[]);

            if (msgs.length > 0 && msgs[0].operation === Operation.LEAVE) {
                const leavingUser = (msgs[0] as FugueLeaveMessage).userIdentity;
                console.log("remove message -> ", msgs[0]);
                console.log("active collaborators -> ", activeCollaborators);
                const newActiveCollaborators = activeCollaborators().filter((c) => c !== leavingUser);
                console.log("new active collaborators -> ", newActiveCollaborators);
                setActiveCollaborators(newActiveCollaborators);
                //email isn't email for anonynous users
                return;
            }

            const myId = this.fugue.replicaId();
            const remoteMsgs = (msgs as FugueMutationMessageTypes[]).filter((m) => {
                // Ignore Join messages or messages with my ID
                if ("state" in m) return true; // Handle state separately
                return m.replicaId !== myId;
            });

            if (remoteMsgs.length === 0) return;
            const firstMsg = remoteMsgs[0];

            // Handle Join message (state sync)
            if (firstMsg.operation === Operation.JOIN && firstMsg.state) {
                const msg = remoteMsgs[0] as FugueJoinMessage;
                if (msg.collaborators) {
                    const newActiveCollaborators = [
                        ...new Set(
                            activeCollaborators()
                                .concat(msg.collaborators!)
                                .filter((c) => c !== this.userIdentity),
                        ),
                    ];
                    setActiveCollaborators(newActiveCollaborators);
                }

                console.log({ msg });
                const localChanges = await DocumentsIndexedDB.getBufferedChanges(this.documentID!);
                if(localChanges.length > 0){
                    //get the buffered changes from redis
                    //delete
                    await DocumentsIndexedDB.deleteBufferedChanges(this.documentID);
                }
                    this.fugue.load(msg.state!);
                
                
                const newText = this.fugue.length() > 0 ? this.fugue.observe() : "";
                console.log({ newText });

                // Update CodeMirror programmatically
                console.log({ curr: this.viewRef.current });
                if (this.viewRef.current) {
                    console.log("Syncing state from JOIN message");
                    const view = this.viewRef.current;

                    // Create a transaction using the state's tr builder
                    const tr = view.state.update({
                        changes: {
                            from: 0,
                            to: view.state.doc.length,
                            insert: newText,
                        },
                        selection: EditorSelection.cursor(Math.min(view.state.selection.main.from, newText.length)),
                        annotations: [this.remoteUpdate.of(true)],
                    });
                    view.dispatch(tr);
                    this.previousTextRef.current = newText;
                }
            }
            // Handle other users joining
            else if (firstMsg.operation === Operation.JOIN && firstMsg.state !== null) {
                const newActiveCollaborators = [...activeCollaborators(), firstMsg.userIdentity ?? "Anon"];
                setActiveCollaborators(newActiveCollaborators);
            }
            // Handle updates
            else {
                const msgs = remoteMsgs.filter((m) => !("state" in m)) as FugueMessage[];

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

    isOffline() {
        return this.ws.readyState === WebSocket.CLOSED;
    }
}
