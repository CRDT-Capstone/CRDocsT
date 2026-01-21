import { useState, useRef, useEffect } from "react";
import {
    FugueList,
    FugueMessage,
    Operation,
    StringPosition,
    StringTotalOrder,
    FugueJoinMessage,
    FugueMessageType,
    FugueMessageSerialzier,
} from "@cr_docs_t/dts";
import { randomString } from "../../utils";
import CodeMirror, { ViewUpdate, Annotation, EditorView, EditorSelection } from "@uiw/react-codemirror";
import { useLocation, useParams } from "react-router-dom";
import { NavBar } from "../NavBar";
import { useDocumentApi } from "../../api/document";


// Ref to ignore next change (to prevent rebroadcasting remote changes)
const RemoteUpdate = Annotation.define<boolean>();

const CodeMirrorCanvas = () => {
    const { documentID } = useParams();
    const location = useLocation();

    const [documentName, setDocumentName] = useState(location.state?.documentName || null);
    const [fugue] = useState(() => new FugueList(new StringTotalOrder(randomString(3)), null, documentID!));

    const viewRef = useRef<EditorView | null>(null);
    const socketRef = useRef<WebSocket>(null);

    const previousTextRef = useRef(""); // Track changes with ref

    const webSocketUrl = import.meta.env.VITE_WSS_URL as string;

    const getDocumentMetadata = async () => {
        const data = await useDocumentApi().getDocumentById(documentID!);
        if (data) setDocumentName(data.name);
        //show some error or something if else
    };

    useEffect(() => {
        if (!documentName) {
            getDocumentMetadata();
        }
    }, []);

    // Garbage Collection of deleted elements every 30 seconds
    useEffect(() => {
        const gcInterval = setInterval(() => {
            console.log("Performing garbage collection");
            fugue.garbageCollect();
        }, 30000);

        return () => clearInterval(gcInterval);
    }, [fugue]);

    // WebSocket setup
    useEffect(() => {
        socketRef.current = new WebSocket(webSocketUrl);
        if (!socketRef.current) return;

        socketRef.current.onopen = () => {
            console.log("WebSocket connected");
            const joinMsg: FugueJoinMessage<string> = {
                operation: Operation.JOIN,
                documentID: documentID!,
                state: null,
            };

            const serializedJoinMessage = FugueMessageSerialzier.serialize<string>([joinMsg]);

            socketRef.current!.send(serializedJoinMessage);
            console.log('Sent serialized Join message!');
        };

        fugue.ws = socketRef.current;

        socketRef.current.onmessage = async (ev: MessageEvent) => {
            console.log("Received message:", ev.data);

            try {
                const blob = ev.data as Blob;
                const buffer = await blob.arrayBuffer(); //convert blob to buffer 
                const bytes = new Uint8Array(buffer);//convert to Unit8Array

                const raw = FugueMessageSerialzier.deserialize(bytes);
                console.log("Parsed message -> ", raw);

                // Normalize to array
                const msgs: FugueMessageType<StringPosition>[] = Array.isArray(raw) ? raw as FugueMessageType<string>[] : [raw] as FugueMessageType<string>[];
                const myId = fugue.replicaId();
                const remoteMsgs = msgs.filter((m) => {
                    // Ignore Join messages or messages with my ID
                    if ("state" in m) return true; // Handle state separately
                    return m.replicaId !== myId;
                });

                if (remoteMsgs.length === 0) return;

                // Handle Join message (state sync)
                if (remoteMsgs[0].operation === Operation.JOIN && remoteMsgs[0].state) {
                    const msg = remoteMsgs[0] as FugueJoinMessage<StringPosition>;
                    fugue.state = msg.state!;
                    const newText = fugue.state.length > 0 ? fugue.observe() : "";

                    // Update CodeMirror programmatically
                    if (viewRef.current) {
                        const view = viewRef.current;

                        // Create a transaction using the state's tr builder
                        const tr = view.state.update({
                            changes: {
                                from: 0,
                                to: view.state.doc.length,
                                insert: newText,
                            },
                            selection: EditorSelection.cursor(Math.min(view.state.selection.main.from, newText.length)),
                            annotations: [RemoteUpdate.of(true)],
                        });
                        view.dispatch(tr);
                        previousTextRef.current = newText;
                    }
                }
                // Handle updates
                else {
                    const firstMsg = remoteMsgs[0];
                    let fromIdx: number | undefined = undefined;
                    const msgs = remoteMsgs as FugueMessage<StringPosition>[];

                    // Delta update operatest in this order
                    // DELETE- Find Index -> Apply CRDT -> Dispatch View
                    // INSERT - Apply CRDT -> Find Index -> Dispatch View

                    if (firstMsg.operation == Operation.DELETE) {
                        // Find index before applying effect
                        fromIdx = fugue.findVisibleIndex(firstMsg.position);
                        console.log("Remote DELETE at index:", fromIdx);
                        fugue.effect(msgs);

                        if (fromIdx !== undefined) {
                            viewRef.current?.dispatch({
                                changes: {
                                    from: fromIdx,
                                    to: fromIdx + remoteMsgs.length,
                                    insert: "",
                                },
                                annotations: [RemoteUpdate.of(true)],
                            });
                        }
                    } else if (firstMsg.operation == Operation.INSERT) {
                        // Apply effect before finding index, so that we account for concurrent inserts
                        fugue.effect(msgs);

                        // Find index after applying effect
                        fromIdx = fugue.findVisibleIndex(firstMsg.position);
                        console.log("Remote INSERT at index:", fromIdx);

                        if (fromIdx !== undefined) {
                            const text = msgs.map((m) => m.data || "").join("");
                            viewRef.current?.dispatch({
                                changes: {
                                    from: fromIdx,
                                    to: fromIdx,
                                    insert: text,
                                },
                                annotations: [RemoteUpdate.of(true)],
                            });
                        }
                    }

                    // Sync local ref so we don't rebroadcast the change
                    previousTextRef.current = viewRef.current?.state.doc.toString()
                        ? viewRef.current.state.doc.toString()
                        : previousTextRef.current;
                }
            } catch (error) {
                console.error("Error processing remote message:", error);
            }
        };

        return () => {
            fugue.ws = null;
            socketRef.current?.close();
        };
    }, [fugue]);

    /**
     * Handle changes from CodeMirror
     */
    const handleChange = (value: string, viewUpdate: ViewUpdate) => {
        if (!viewUpdate.docChanged) return;

        // If this transaction has our "RemoteUpdate" stamp, we strictly ignore CRDT logic
        const isRemote = viewUpdate.transactions.some((tr) => tr.annotation(RemoteUpdate));

        if (isRemote) {
            // Just sync the ref so we don't diff against stale text later
            previousTextRef.current = value;
            return;
        }

        // Get the actual changes from viewUpdate
        const oldText = previousTextRef.current;
        const newText = value;

        console.log({
            oldText,
            newText,
            docChanged: viewUpdate.docChanged,
        });

        // TODO: This might be sending duplicate operations per multi operation
        viewUpdate.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            const deleteLen = toA - fromA;
            const insertedLen = toB - fromB;
            const insertedTxt = inserted.toString();

            // Handle deletion
            if (deleteLen > 0) {
                console.log({
                    operation: Operation.DELETE,
                    index: fromA,
                    count: deleteLen,
                });
                fugue.deleteMultiple(fromA, deleteLen);
            }

            // Handle insertion
            if (insertedLen > 0) {
                console.log({
                    operation: Operation.INSERT,
                    index: fromA,
                    text: insertedTxt,
                });

                fugue.insertMultiple(fromA, insertedTxt);
            }
        });
        previousTextRef.current = newText;
    };

    return (
        <div className="w-screen">
            <NavBar documentID={documentID!} documentName={documentName} />
            <div className="flex flex-col items-center p-4 w-full h-full">
                <div className="w-full h-screen max-w-[100vw]">
                    <CodeMirror
                        onCreateEditor={(view) => {
                            viewRef.current = view;
                        }}
                        onChange={handleChange}
                        className="text-black rounded-lg border-2 shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
};

export default CodeMirrorCanvas;
