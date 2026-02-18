import { useState, useRef, useEffect, useMemo } from "react";
import { FugueTree, Operation } from "@cr_docs_t/dts";
import { randomString } from "../../utils";
import CodeMirror, { ViewUpdate, Annotation, EditorView } from "@uiw/react-codemirror";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { useParams } from "react-router-dom";
import { NavBar } from "../NavBar";
import { useClerk } from "@clerk/clerk-react";
import Loading from "../Loading";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { WSClient } from "../../utils/WSClient";
import { latexSupportInline, latexSupportWorker } from "../../treesitter/codemirror";
import TreeSitterWorker from "../../treesitter/worker.ts?worker";
import { Parser, Query } from "web-tree-sitter";
import { newParser } from "../../treesitter";
import { toast } from "sonner";
import { DocumentsIndexedDB } from "../../stores/dexie/documents";

// Ref to ignore next change (to prevent rebroadcasting remote changes)
const RemoteUpdate = Annotation.define<boolean>();

const Canvas = () => {
    const { documentID } = useParams();
    const wsClient = useRef<WSClient | undefined>(undefined);

    const [fugue] = useState(() => new FugueTree(null, documentID!));
    const [parser, setParser] = useState<Parser | null>(null);
    const [query, setQuery] = useState<Query | null>(null);
    const email = mainStore((state) => state.email);
    const setDocument = mainStore((state) => state.setDocument);
    const tree = mainStore((state) => state.tree);
    const isParsing = mainStore((state) => state.isParsing);
    const activeCollaborators = mainStore((state) => state.activeCollaborators);
    const [worker, setWorker] = useState<Worker | null>(null);
    const [editorView, setEditorView] = useState<EditorView | undefined>(undefined);

    const viewRef = useRef<EditorView | undefined>(undefined);
    const socketRef = useRef<WebSocket>(null);

    const previousTextRef = useRef(""); // Track changes with ref

    const webSocketUrl = import.meta.env.VITE_WSS_URL as string;
    const clerk = useClerk();

    const { queries } = useDocument(documentID!);
    const { documentQuery } = queries;

    useEffect(() => {
        documentQuery.refetch();
        const w = new TreeSitterWorker({ name: "TreeSitterWorker" });
        setWorker(w);
        return () => {
            w.terminate();
        };
    }, []);

    // useEffect(() => {
    //     if (tree && tree.rootNode) console.log({ tree: tree.rootNode });
    // }, [tree]);

    // useEffect(() => {
    //     if (worker) {
    //         setExts((prev) => [
    //             ...prev,
    //             ...latexSupportWorker(worker),
    //         ]);
    //     }
    // }, [worker]);

    const exts = useMemo(() => {
        const base = [bracketMatching(), indentOnInput(), EditorView.lineWrapping];
        if (parser && query) {
            return [...base, ...latexSupportInline(parser, query)];
        }
        return base;
    }, [parser, query]);

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
    // useEffect(() => {
    //     const gcInterval = setInterval(() => {
    //         console.log("Performing garbage collection");
    //         fugue.garbageCollect();
    //     }, 30000);
    //
    //     return () => clearInterval(gcInterval);
    // }, [fugue]);

    
    const setUpWSClient = ()=>{
        if (!socketRef.current || !documentID || !editorView) return;
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
    };

    // WebSocket setup
    useEffect(() => {
        if (!clerk.loaded) return;
        socketRef.current = new WebSocket(webSocketUrl);
        socketRef.current.onclose = handleClose;
        setUpWSClient();
        (async () => {
            if (!parser || !query) {
                const { parser, query } = await newParser();
                setParser(parser);
                setQuery(query);
            }
        })();

        return () => {
            fugue.ws = null;
            socketRef.current?.close();
        };
    }, [fugue, clerk.loaded, editorView, email, webSocketUrl]);

    const handleClose = () => {
        console.log("WebSocket connection closed");

        wsClient.current = undefined;

        //try to reconect every 5 seconds 
        setTimeout(() => {
            socketRef.current = new WebSocket(webSocketUrl);
            fugue.ws = socketRef.current;
            socketRef.current.onclose = handleClose;
            setUpWSClient();
        }, 5000);
    }


    /**
     * Handle changes from CodeMirror
     */
    const handleChange = async (value: string, viewUpdate: ViewUpdate) => {
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
        viewUpdate.changes.iterChanges(async (fromA, toA, fromB, toB, inserted) => {
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
                const msgs = fugue.deleteMultiple(fromA, deleteLen);
                if(wsClient.current?.isOffline()){
                    await DocumentsIndexedDB.saveBufferedChanges(documentID!, msgs);
                }
            }

            // Handle insertion
            if (insertedLen > 0) {
                console.log({
                    operation: Operation.INSERT,
                    index: fromA,
                    text: insertedTxt,
                });

                const msgs = fugue.insertMultiple(fromA, insertedTxt);
                if(socketRef.current?.readyState !== WebSocket.OPEN){
                    await DocumentsIndexedDB.saveBufferedChanges(documentID!, msgs);
                }
            }
        });

        previousTextRef.current = newText;
    };

    if (documentQuery.isLoading) {
        return <Loading fullPage={true} />;
    }

    return (
        <div className="flex flex-col w-screen h-screen bg-base-100">
            <NavBar documentID={documentID!} />

            <main className="flex overflow-hidden relative flex-col flex-1 items-center p-4 w-full h-full">
                <div className="relative w-full h-full">
                    {isParsing && (
                        <div className="flex absolute top-4 right-4 z-10 gap-2 items-center py-1 px-3 rounded-full border shadow-md animate-pulse bg-base-200 border-base-300">
                            <span className="loading loading-spinner loading-xs text-primary"></span>
                            <span className="font-mono text-xs font-medium opacity-70">AST SYNCING...</span>
                        </div>
                    )}

                    <CodeMirror
                        value={previousTextRef.current}
                        extensions={exts}
                        height="100%"
                        width="100%"
                        className="w-full h-full text-black rounded-lg border-2 shadow-sm"
                        onCreateEditor={(view) => {
                            viewRef.current = view;
                            setEditorView(view);

                            // Sync initial content if fugue already has data
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
                    />
                </div>
            </main>

            <footer className="flex justify-end p-2 border-t bg-base-200">
                <div className="dropdown dropdown-top dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
                        Collaborators ({activeCollaborators.length})
                    </div>
                    <ul
                        tabIndex={0}
                        className="p-2 w-52 border shadow-xl dropdown-content menu bg-base-100 rounded-box z-[100] border-base-300"
                    >
                        {activeCollaborators.length > 0 ? (
                            activeCollaborators.map((ac, index) => (
                                <li key={index} className="py-1 px-2 text-sm italic">
                                    {ac}
                                </li>
                            ))
                        ) : (
                            <li className="p-2 text-xs opacity-50">No other users active</li>
                        )}
                    </ul>
                </div>
            </footer>
        </div>
    );
};

export default Canvas;
