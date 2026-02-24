import { useState, useEffect, useMemo, memo, useCallback } from "react";
import CodeMirror, {
    Compartment,
    EditorState,
    EditorView,
    basicSetup,
    keymap,
    highlightSpecialChars,
} from "@uiw/react-codemirror";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { useNavigate } from "react-router-dom";
import Loading from "../Loading";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { latexSupport } from "../../treesitter/codemirror";
import { Parser, Query, Tree } from "web-tree-sitter";
import { newParser } from "@cr_docs_t/dts/treesitter";
import { useCollab } from "../../hooks/collab";
import { createDocumentApi } from "../../api/document";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import ActiveCollaborators from "../ActiveCollaborators";
import { HandleChange } from "../../utils/Canvas";
import ConnectionIndicator from "../ConnectionIndicator";
import { ConnectionState } from "../../types";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { tokyoNight, tokyoNightInit } from "@uiw/codemirror-theme-tokyo-night";

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

    const {
        fugue,
        isAnon,
        isAuthError,
        previousTextRef,
        RemoteUpdate,
        connectionState,
        viewRef,
        userIdentity,
        connect,
        disconnect,
        delay,
    } = useCollab(documentID!, editorView);

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
                const { parser, query } = await newParser("/tree-sitter-latex.wasm", "/highlights.scm");
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

    const theme = useMemo(
        () =>
            tokyoNightInit({
                settings: {},
            }),
        [tokyoNightInit, tokyoNight],
    );

    const tabSize = new Compartment();

    const { exts, Yggdrasil, CST } = useMemo(() => {
        const base = [
            highlightSpecialChars(),
            basicSetup(),
            highlightSelectionMatches(),
            bracketMatching(),
            indentOnInput(),
            autocompletion({ activateOnTyping: true }),

            EditorView.lineWrapping,
            tabSize.of(EditorState.tabSize.of(4)),

            keymap.of([...searchKeymap, ...completionKeymap]),
        ];

        if (parser && query) {
            const { extensions, CST, Yggdrasil } = latexSupport(parser, query);
            return {
                exts: [...base, ...extensions],
                Yggdrasil,
                CST,
            };
        }

        return { exts: base, Yggdrasil: null, CST: null };
    }, [parser, query]);

    const handleOnCreateEditor = useCallback(
        (view: EditorView) => {
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
        },
        [fugue, RemoteUpdate],
    );

    const handleOnChange = useCallback(
        () => HandleChange.bind(null, fugue, previousTextRef, RemoteUpdate),
        [fugue, RemoteUpdate],
    );

    const handleConnectionIndicatorClick = useCallback(() => {
        if (connectionState === ConnectionState.CONNECTED) {
            toast.info("Disconnecting from collaborative session...");
            disconnect();
        } else if (connectionState === ConnectionState.DISCONNECTED) {
            toast.info("Connecting to collaborative session...");
            connect();
        }
    }, [connectionState]);

    if (documentQuery.isLoading) {
        return <Loading fullPage={singleSession} />;
    }

    return (
        <div className="flex overflow-hidden relative flex-col flex-1 items-center w-full h-full">
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
                    height="80vh"
                    width="100%"
                    theme={theme}
                    // editable={wsClient ? !wsClient.isOffline() : false}
                    onCreateEditor={(view) => handleOnCreateEditor(view)}
                    onChange={handleOnChange()}
                />
            </div>
            <StatusBar
                onConnectionIndicatorClick={handleConnectionIndicatorClick}
                delay={delay}
                connectionState={connectionState}
                userIdentity={userIdentity}
            />
        </div>
    );
};

interface StatusBarProps {
    userIdentity: string;
    connectionState: ConnectionState;
    delay?: number;
    onConnectionIndicatorClick?: () => void;
}

const StatusBar = memo(({ userIdentity, connectionState, delay, onConnectionIndicatorClick }: StatusBarProps) => {
    return (
        <footer className="flex flex-row p-5 w-full bg-base">
            {/* Left  */}
            <div className="flex flex-1 self-start">
                <ActiveCollaborators userIdentity={userIdentity} />
            </div>
            {/* Middle */}
            <div className="flex flex-1 justify-center self-center">
                <ConnectionIndicator
                    onClick={onConnectionIndicatorClick}
                    delay={delay}
                    connectionState={connectionState}
                />
            </div>
            {/* Right */}
            <div className="flex flex-1 self-end"></div>
        </footer>
    );
});

export default memo(Canvas);
