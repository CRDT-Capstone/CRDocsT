import { useState, useRef, useEffect } from "react";
import { FugueList, Operation, StringTotalOrder } from "@cr_docs_t/dts";
import { randomString } from "../../utils";
import CodeMirror, { ViewUpdate, Annotation, EditorView } from "@uiw/react-codemirror";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { useParams } from "react-router-dom";
import { NavBar } from "../NavBar";
import { useClerk, useUser } from "@clerk/clerk-react";
import Loading from "../Loading";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { WSClient } from "../../utils/WSClient";
import { Parser } from "web-tree-sitter";
import { newParser, treeSitterHighlightPlugin } from "../../treesitter";

// Ref to ignore next change (to prevent rebroadcasting remote changes)
const RemoteUpdate = Annotation.define<boolean>();

const Canvas = () => {
    const { documentID } = useParams();
    const wsClient = useRef<WSClient | undefined>(undefined);

    const [fugue] = useState(() => new FugueList(new StringTotalOrder(randomString(3)), null, documentID!));
    const [parser, setParser] = useState<Parser | null>(null);
    const email = mainStore((state) => state.email);
    const setDocument = mainStore((state) => state.setDocument);
    const tree = mainStore((state) => state.tree);
    const isParsing = mainStore((state) => state.isParsing);
    const activeCollaborators = mainStore((state) => state.activeCollaborators);

    const [exts, setExts] = useState([bracketMatching(), indentOnInput(), EditorView.lineWrapping]);

    const viewRef = useRef<EditorView | undefined>(undefined);
    const socketRef = useRef<WebSocket>(null);

    const previousTextRef = useRef(""); // Track changes with ref

    const webSocketUrl = import.meta.env.VITE_WSS_URL as string;
    const clerk = useClerk();

    const { queries } = useDocument(documentID!);
    const { documentQuery } = queries;

    useEffect(() => {
        documentQuery.refetch();
    }, []);

    useEffect(() => {
        if (tree && tree.rootNode) console.log({ tree: tree.rootNode });
    }, [tree]);

    useEffect(() => {
        if (parser) {
            setExts((prev) => [...prev, treeSitterHighlightPlugin(parser)]);
        }
    }, [parser]);

    useEffect(() => {
        if (documentQuery.data) {
            setDocument(documentQuery.data);
        }
    }, [documentQuery.data]);

    useEffect(() => {
        if (email && wsClient.current) {
            console.log({ email: email });
            fugue.userIdentity = email;
            wsClient.current.setUserIdentity(email);
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
        (async () => {
            if (!parser) {
                setParser(await newParser());
            }
        })();
        fugue.ws = socketRef.current;

        if (!wsClient.current || (wsClient.current && wsClient.current.getUserIdenity() !== email))
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
                    {isParsing && (
                        <div className="flex absolute top-4 right-4 z-10 gap-2 items-center py-1 px-3 rounded-full border shadow-md animate-pulse bg-base-200 border-base-300">
                            <span className="loading loading-spinner loading-xs text-primary"></span>
                            <span className="font-mono text-xs font-medium opacity-70">AST SYNCING...</span>
                        </div>
                    )}
                    <CodeMirror
                        extensions={exts}
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
                <div className="flex justify-end w-full">
                    <div className="dropdown dropdown-top dropdown-center">
                        <div tabIndex={0} role="button" className="m-4 btn">
                            Active Collaborators {`(${activeCollaborators.length})`}
                        </div>
                        <ul
                            tabIndex={-1}
                            className="p-2 w-52 shadow-sm dropdown-content menu bg-base-100 rounded-box z-1"
                        >
                            {activeCollaborators.map((ac, index) => (
                                <li key={index}>{ac}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Canvas;
