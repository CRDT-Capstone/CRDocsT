import { useState, useRef, useEffect } from "react";
import { FugueList, Operation, StringTotalOrder } from "@cr_docs_t/dts";
import { randomString } from "../../utils";
import CodeMirror, { ViewUpdate, Annotation, EditorView } from "@uiw/react-codemirror";
import { useLocation, useParams } from "react-router-dom";
import { NavBar } from "../NavBar";
import { useClerk, useUser } from "@clerk/clerk-react";
import Loading from "../Loading";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { WSClient } from "../../utils/WSClient";

// Ref to ignore next change (to prevent rebroadcasting remote changes)
const RemoteUpdate = Annotation.define<boolean>();

const Canvas = () => {
    const { documentID } = useParams();
    const location = useLocation();
    const wsClient = useRef<WSClient | undefined>(undefined);

    const [fugue] = useState(() => new FugueList(new StringTotalOrder(randomString(3)), null, documentID!));
    const email = mainStore((state) => state.email);
    const setDocument = mainStore((state) => state.setDocument);

    const viewRef = useRef<EditorView | undefined>(undefined);
    const socketRef = useRef<WebSocket>(null);

    const previousTextRef = useRef(""); // Track changes with ref

    const webSocketUrl = import.meta.env.VITE_WSS_URL as string;
    const { user } = useUser();
    const clerk = useClerk();

    const { queries } = useDocument(documentID!);
    const { documentQuery } = queries;

    useEffect(() => {
        documentQuery.refetch();
    }, []);

    useEffect(() => {
        if (documentQuery.data) {
            setDocument(documentQuery.data);
        }
    }, [documentQuery.data]);

    useEffect(() => {
        if (email && wsClient.current) {
            console.log({ email: email });
            fugue.email = email;
            wsClient.current.setEmail(email);
        }
    }, [email, wsClient.current]);

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
        if (!clerk.loaded) return;
        socketRef.current = new WebSocket(webSocketUrl);
        if (!socketRef.current || !documentID) return;
        fugue.ws = socketRef.current;

        if (!wsClient.current || (wsClient.current && wsClient.current.getEmail() !== email))
            wsClient.current = new WSClient(
                socketRef.current,
                fugue,
                documentID,
                RemoteUpdate,
                viewRef,
                previousTextRef,
                email,
            );

        return () => {
            fugue.ws = null;
            socketRef.current?.close();
        };
    }, [fugue, clerk.loaded]);

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

    if (documentQuery.isLoading) {
        return <Loading fullPage={true} />;
    }

    return (
        <div className="w-screen">
            <NavBar documentID={documentID!} />
            <div className="flex flex-col items-center p-4 w-full h-full">
                <div className="w-full h-screen max-w-[100vw]">
                    <CodeMirror
                        onCreateEditor={(view) => {
                            viewRef.current = view;

                            // Check if we already have data in fugue from a message
                            // that arrived while we were waiting
                            const currentContent = fugue.observe();
                            if (currentContent.length > 0) {
                                view.dispatch({
                                    changes: { from: 0, insert: currentContent },
                                    annotations: [RemoteUpdate.of(true)],
                                });
                                previousTextRef.current = currentContent;
                            }
                        }}
                        onChange={handleChange}
                        className="text-black rounded-lg border-2 shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
};

export default Canvas;
