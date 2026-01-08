import { useState, useRef, useEffect } from "react";
import { FugueList, FugueMessage, Operation, StringPosition, StringTotalOrder, FugueJoinMessage } from "@cr_docs_t/dts";
import { randomString } from "../../utils";
import CodeMirror, { ViewUpdate, Annotation, EditorView, EditorSelection } from "@uiw/react-codemirror";

// Ref to ignore next change (to prevent rebroadcasting remote changes)
const RemoteUpdate = Annotation.define<boolean>();

const CodeMirrorCanvas = () => {
    const [fugue] = useState(() => new FugueList(new StringTotalOrder(randomString(3)), null, "1"));

    const viewRef = useRef<EditorView | null>(null);
    const socketRef = useRef<WebSocket>(null);

    const previousTextRef = useRef(""); // Track changes with ref

    const webSocketUrl = import.meta.env.VITE_WSS_URL as string;

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
            const joinMsg: FugueMessage<string> = {
                documentID: "1",
                operation: Operation.JOIN,
                replicaId: fugue.replicaId(),
                position: "",
                data: null,
            };
            socketRef.current!.send(JSON.stringify(joinMsg));
        };

        fugue.ws = socketRef.current;

        socketRef.current.onmessage = (ev: MessageEvent) => {
            console.log("Received message:", ev.data);

            try {
                const raw = JSON.parse(ev.data);

                // Normalize to array
                const msgs: FugueMessage<StringPosition>[] = Array.isArray(raw) ? raw : [raw];
                const myId = fugue.replicaId();
                const remoteMsgs = msgs.filter((m) => {
                    // Ignore Join messages or messages with my ID
                    if ("state" in m) return true; // Handle state separately
                    return m.replicaId !== myId;
                });

                if (remoteMsgs.length === 0) return;

                // Handle Join message (state sync)
                if ("state" in remoteMsgs[0]) {
                    const msg = remoteMsgs[0] as FugueJoinMessage<StringPosition>;
                    fugue.state = msg.state;
                    const newText = fugue.observe();

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

                    // Delta update operatest in this order
                    // DELETE- Find Index -> Apply CRDT -> Dispatch View
                    // INSERT - Apply CRDT -> Find Index -> Dispatch View

                    if (firstMsg.operation == Operation.DELETE) {
                        // Find index before applying effect
                        fromIdx = fugue.findVisibleIndex(firstMsg.position);
                        console.log("Remote DELETE at index:", fromIdx);
                        fugue.effect(remoteMsgs);

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
                        fugue.effect(remoteMsgs);

                        // Find index after applying effect
                        fromIdx = fugue.findVisibleIndex(firstMsg.position);
                        console.log("Remote INSERT at index:", fromIdx);

                        if (fromIdx !== undefined) {
                            const text = remoteMsgs.map((m) => m.data || "").join("");
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
                    operation: Operation.DELETE,
                    index: fromA,
                    text: insertedTxt,
                });

                fugue.insertMultiple(fromA, insertedTxt);
            }
        });
        previousTextRef.current = newText;
    };

    return (
        <div className="flex flex-col items-center p-4 w-full h-full">
            <h1 className="m-4 text-5xl font-bold">CRDT Editor</h1>
            <div className="w-full max-w-4xl">
                <CodeMirror
                    onCreateEditor={(view) => {
                        viewRef.current = view;
                    }}
                    onChange={handleChange}
                    className="rounded-lg border-2 shadow-sm"
                />
            </div>
        </div>
    );
};

export default CodeMirrorCanvas;
