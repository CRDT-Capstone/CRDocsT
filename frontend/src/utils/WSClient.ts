import {
    FugueJoinMessage,
    FugueLeaveMessage,
    FugueList,
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

export class WSClient {
    private ws: WebSocket;
    private viewRef: RefObject<EditorView | undefined>;
    private previousTextRef: RefObject<string>;
    private documentID: string;
    private userIdentity?: string = undefined;
    private fugue: FugueList<string>;
    private remoteUpdate: AnnotationType<boolean>;

    constructor(
        ws: WebSocket,
        fugue: FugueList<string>,
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

        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);

        this.initListeners();
    }

    initListeners() {
        this.ws.onopen = this.handleOpen;
        this.ws.onmessage = this.handleMessage;
        this.ws.onclose = this.handleClose;
    }

    async handleClose(){
        console.log("WebSocket connection closed");
        toast.info("You are disconnected");
    }

    async handleOpen() {
        console.log("WebSocket connected");
        toast('You are connected');
        const joinMsg: FugueJoinMessage<string> = {
            operation: Operation.JOIN,
            documentID: this.documentID,
            state: null,
            userIdentity: this.userIdentity,
        };
        console.log("joinMsg -> ", joinMsg);

        const serializedJoinMessage = FugueMessageSerialzier.serialize<string>([joinMsg]);

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
            type FugueMsgType = FugueMutationMessageTypes<StringPosition> | FugueLeaveMessage;
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
            const remoteMsgs = (msgs as FugueMutationMessageTypes<StringPosition>[]).filter((m) => {
                // Ignore Join messages or messages with my ID
                if ("state" in m) return true; // Handle state separately
                return m.replicaId !== myId;
            });

            if (remoteMsgs.length === 0) return;
            const firstMsg = remoteMsgs[0];

            // Handle Join message (state sync)
            if (firstMsg.operation === Operation.JOIN && firstMsg.state) {
                const msg = remoteMsgs[0] as FugueJoinMessage<StringPosition>;
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
                this.fugue.state = msg.state!;
                const newText = this.fugue.state.length > 0 ? this.fugue.observe() : "";
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
                let fromIdx: number | undefined = undefined;
                const msgs = remoteMsgs as FugueMessage<StringPosition>[];

                // Delta update operatest in this order
                // DELETE- Find Index -> Apply CRDT -> Dispatch View
                // INSERT - Apply CRDT -> Find Index -> Dispatch View

                if (firstMsg.operation == Operation.DELETE) {
                    // Find index before applying effect
                    fromIdx = this.fugue.findVisibleIndex(firstMsg.position);
                    console.log("Remote DELETE at index:", fromIdx);
                    this.fugue.effect(msgs);

                    if (fromIdx !== undefined && this.viewRef.current) {
                        this.viewRef.current.dispatch({
                            changes: {
                                from: fromIdx,
                                to: fromIdx + remoteMsgs.length,
                                insert: "",
                            },
                            annotations: [this.remoteUpdate.of(true)],
                        });
                    }
                } else if (firstMsg.operation == Operation.INSERT) {
                    // Apply effect before finding index, so that we account for concurrent inserts
                    this.fugue.effect(msgs);

                    // Find index after applying effect
                    fromIdx = this.fugue.findVisibleIndex(firstMsg.position);
                    console.log("Remote INSERT at index:", fromIdx);

                    if (fromIdx !== undefined && this.viewRef.current) {
                        const text = msgs.map((m) => m.data || "").join("");
                        this.viewRef.current?.dispatch({
                            changes: {
                                from: fromIdx,
                                to: fromIdx,
                                insert: text,
                            },
                            annotations: [this.remoteUpdate.of(true)],
                        });
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
}
