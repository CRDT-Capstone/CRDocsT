import { useState, useEffect, useMemo } from "react";
import { Operation } from "@cr_docs_t/dts";
import CodeMirror, { ViewUpdate, EditorView } from "@uiw/react-codemirror";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { useNavigate, useParams } from "react-router-dom";
import { NavBar } from "../NavBar";
import Loading from "../Loading";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { latexSupport } from "../../treesitter/codemirror";
import { Parser, Query } from "web-tree-sitter";
import { newParser } from "../../treesitter";
import { DocumentsIndexedDB } from "../../stores/dexie/documents";
import { useCollab } from "../../hooks/collab";
import { createDocumentApi } from "../../api/document";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";

const Canvas = () => {
    const { documentID } = useParams();
    const nav = useNavigate();

    const [parser, setParser] = useState<Parser | null>(null);
    const [query, setQuery] = useState<Query | null>(null);

    const setDocument = mainStore((state) => state.setDocument);
    const ygg = mainStore((state) => state.ygg);

    const { getToken } = useAuth();
    const api = createDocumentApi(getToken);

    const isParsing = mainStore((state) => state.isParsing);
    const activeCollaborators = mainStore((state) => state.activeCollaborators);

    const [editorView, setEditorView] = useState<EditorView | undefined>(undefined);

    const { fugue, wsClient, isAuthError, previousTextRef, RemoteUpdate, socketRef, viewRef, userIdentity } = useCollab(
        documentID!,
        editorView,
    );

    if (isAuthError) {
        nav("/sign-in");
    }

    useEffect(() => {
        (async () => {
            // Check if user has access and if not redirect to home
            const res = await api.getUserDocumentAccess(documentID!, userIdentity);
            if (!res.data.hasAccess) {
                toast.error("You do not have access to this document. Redirecting...");
                nav("/");
            }
        })();
    }, [userIdentity]);

    const { queries } = useDocument(documentID!);
    const { documentQuery } = queries;

    useEffect(() => {
        documentQuery.refetch();

        (async () => {
            if (!parser || !query) {
                const { parser, query } = await newParser();
                setParser(parser);
                setQuery(query);
            }
        })();
    }, []);

    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.clear();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

    useEffect(() => {
        if (documentQuery.data) {
            setDocument(documentQuery.data);
        }
    }, [documentQuery.data]);

    const exts = useMemo(() => {
        const base = [bracketMatching(), indentOnInput(), EditorView.lineWrapping];
        if (parser && query) {
            return [...base, ...latexSupport(parser, query)];
        }
        return base;
    }, [parser, query]);

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
                    userIdentity,
                });
                const msgs = fugue.deleteMultiple(fromA, deleteLen);
                if (wsClient?.isOffline()) {
                    await DocumentsIndexedDB.saveBufferedChanges(documentID!, msgs);
                }
            }

            // Handle insertion
            if (insertedLen > 0) {
                console.log({
                    operation: Operation.INSERT,
                    index: fromA,
                    text: insertedTxt,
                    userIdentity,
                    fugueIdentity: fugue.userIdentity,
                });

                const msgs = fugue.insertMultiple(fromA, insertedTxt);
                if (socketRef.current?.readyState !== WebSocket.OPEN) {
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

            <footer className="flex justify-start p-2 border-t bg-base-200">
                <div className="dropdown dropdown-top dropdown-start">
                    <div tabIndex={0} role="button" className="btn btn-sm btn-ghost">
                        Collaborators ({activeCollaborators.length})
                    </div>
                    <ul
                        tabIndex={0}
                        className="overflow-y-auto flex-nowrap p-2 border shadow-xl w-fit max-h-100 dropdown-content menu bg-base-100 rounded-box z-100 border-base-300"
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
