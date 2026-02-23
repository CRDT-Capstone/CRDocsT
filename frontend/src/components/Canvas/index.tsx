import { useState, useEffect, useMemo, memo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../Loading";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { latexSupport } from "../../treesitter/codemirror";
import { Parser, Query, Tree } from "web-tree-sitter";
import { newParser } from "../../treesitter";
import { useCollab } from "../../hooks/collab";
import { createDocumentApi } from "../../api/document";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import ActiveCollaborators from "../ActiveCollaborators";
import { HandleChange } from "../../utils/Canvas";

interface CanvasProps {
    documentId: string | undefined;
    singleSession?: boolean;
}

const Canvas = ({ documentId: documentID, singleSession }: CanvasProps) => {
    const nav = useNavigate();

    const [parser, setParser] = useState<Parser | null>(null);
    const [query, setQuery] = useState<Query | null>(null);

    const setDocument = mainStore((state) => state.setDocument);

    const { getToken } = useAuth();
    const api = createDocumentApi(getToken);

    const isParsing = mainStore((state) => state.isParsing);

    const [editorView, setEditorView] = useState<EditorView | undefined>(undefined);

    const { fugue, isAnon, isAuthError, previousTextRef, RemoteUpdate, socketRef, viewRef, userIdentity, disconnect } =
        useCollab(documentID!, editorView);

    if (isAuthError) {
        nav("/sign-in");
    }

    useEffect(() => {
        (async () => {
            // Check if user has access if not anon user
            if (isAnon) return;
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

        return () => {
            // Clean up on unmount
            disconnect();
            setDocument(undefined);
        };
    }, []);

    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.clear();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            // Send leave message on unmount
        };
    }, []);

    useEffect(() => {
        if (documentQuery.data) {
            setDocument(documentQuery.data);
        }
    }, [documentQuery.data]);

    const theme = EditorView.theme({
        "&": { height: "80vh" },
        ".cm-scroller": { overflow: "auto" },
    });

    const { exts, Yggdrasil } = useMemo(() => {
        const base = [bracketMatching(), indentOnInput(), EditorView.lineWrapping];

        if (parser && query) {
            const { extensions, Yggdrasil } = latexSupport(parser, query);
            return {
                exts: [...base, ...extensions, theme],
                Yggdrasil,
            };
        }

        return { exts: base, Yggdrasil: null };
    }, [parser, query]);

    if (documentQuery.isLoading) {
        return <Loading fullPage={singleSession} />;
    }

    return (
        <>
            <main className="flex overflow-hidden relative flex-col flex-1 items-center w-full h-full">
                <div className="overflow-hidden relative w-full">
                    {isParsing && (
                        <div className="flex absolute top-4 right-4 z-10 gap-2 items-center py-1 px-3 rounded-full border shadow-md animate-pulse bg-base-200 border-base-300">
                            <span className="loading loading-spinner loading-xs text-primary"></span>
                            <span className="font-mono text-xs font-medium opacity-70">AST PARSING...</span>
                        </div>
                    )}

                    <CodeMirror
                        value={previousTextRef.current}
                        extensions={exts}
                        // height="100%"
                        // width="100%"
                        className="w-full h-full text-black rounded-lg border-2 shadow-sm"
                        // editable={wsClient ? !wsClient.isOffline() : false}
                        onCreateEditor={(view) => {
                            viewRef.current = view;
                            setEditorView(view);

                            // Sync initial content if fugue already has data
                            const currentContent = fugue.observe();
                            if (currentContent.length > 0) {
                                view.dispatch({
                                    changes: { from: 0, to: view.state.doc.length, insert: currentContent },
                                    annotations: [RemoteUpdate.of(true)],
                                });
                                previousTextRef.current = currentContent;
                            }
                        }}
                        onChange={HandleChange.bind(null, fugue, previousTextRef, RemoteUpdate)}
                    />
                </div>
                <StatusBar userIdentity={userIdentity} />
            </main>
        </>
    );
};

interface StatusBarProps {
    userIdentity: string;
}

const StatusBar = ({ userIdentity }: StatusBarProps) => {
    return (
        <footer className="flex flex-row justify-start p-2 m-2 h-10 bg-base">
            {/* Left  */}
            <div className="flex gap-4">
                <ActiveCollaborators userIdentity={userIdentity} />
            </div>
            {/* Middle */}
            <div className="flex flex-1 justify-center"></div>
            {/* Right */}
            <div className="flex gap-4 justify-end"></div>
        </footer>
    );
};

export default memo(Canvas);
