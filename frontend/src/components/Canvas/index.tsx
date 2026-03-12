import { useState, useEffect, useMemo, memo, useCallback, useRef } from "react";
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
import { CSTType, latexSupport, YggdrasilType } from "../../treesitter/codemirror";
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
import { remoteCursorSupport } from "../../codemirror/decorations";
import { usePreview } from "../../hooks/preview";
import { Preview } from "../Preview";
import { LuEye } from "react-icons/lu";
import AddCommentButton from "../AddCommentButton";

interface CanvasProps {
    documentId: string | undefined;
    singleSession?: boolean;
    onPresenceUpdate?: () => void;
}

const Canvas = ({ documentId: documentID, singleSession, onPresenceUpdate }: CanvasProps) => {
    const nav = useNavigate();

    const [parser, setParser] = useState<Parser | null>(null);
    const [query, setQuery] = useState<Query | null>(null);

    const setDocument = mainStore((state) => state.setDocument);

    const { getToken } = useAuth();
    const api = createDocumentApi(getToken);

    const isParsing = mainStore((state) => state.isParsing);

    const [editorView, setEditorView] = useState<EditorView | undefined>(undefined);
    const [showPreview, setShowPreview] = useState(false);

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
        wsClient,
    } = useCollab(documentID!, editorView, onPresenceUpdate);

    const { pdfUrl, isRendering, error, recompile } = usePreview();

    const [commentIconPosition, setCommentIconPosition] = useState<{ top: number }>();
    const highlightExtension = useMemo(() => {
        return EditorView.updateListener.of((update) => {
            const { from, to } = update.state.selection.main;

            if (from === to){
                setCommentIconPosition(undefined);
                return;
            }

            const newCommentIconPosition = update.view.coordsAtPos(from);
            if (newCommentIconPosition)
                setCommentIconPosition({ top: newCommentIconPosition.top });
        });
    }, []);

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
    const treeSitterCompartment = useMemo(() => new Compartment(), []);

    useEffect(() => {
        if (editorView && parser && query) {
            const { extensions } = latexSupport(parser, query);
            editorView.dispatch({
                effects: [treeSitterCompartment.reconfigure(extensions)],
            });
        }
    }, [parser, query, editorView]);

    const { exts } = useMemo(() => {
        const base = [
            highlightSpecialChars(),
            basicSetup(),
            highlightSelectionMatches(),
            bracketMatching(),
            indentOnInput(),
            autocompletion({ activateOnTyping: true }),

            EditorView.lineWrapping,
            tabSize.of(EditorState.tabSize.of(4)),
            treeSitterCompartment.of([]),

            remoteCursorSupport(),

            keymap.of([...searchKeymap, ...completionKeymap]),
            highlightExtension
        ];

        return { exts: base };
    }, []);

    useEffect(() => {
        if (connectionState !== ConnectionState.CONNECTED) {
            // Disable preview when not connected
            setShowPreview(false);
        }
    }, [connectionState]);

    const handleOnCreateEditor = useCallback(
        (view: EditorView) => {

            viewRef.current = view;
            setEditorView(view);
        },
        [fugue, RemoteUpdate],
    );

    const handleOnChange = useCallback(
        () => HandleChange.bind(null, fugue, wsClient, previousTextRef, RemoteUpdate),
        [fugue, RemoteUpdate, wsClient],
    );

    const handleConnectionIndicatorClick = useCallback(() => {
        if (connectionState === ConnectionState.CONNECTED) {
            toast.info("Disconnecting from collaborative session");
            disconnect();
        } else if (connectionState === ConnectionState.DISCONNECTED) {
            toast.info("Connecting to collaborative session");
            connect();
        }
    }, [connectionState]);

    const handleTogglePreview = useCallback(() => {
        setShowPreview((v) => !v);
    }, [recompile, showPreview, fugue]);

    if (documentQuery.isLoading) {
        return <Loading fullPage={singleSession} />;
    }

    return (
        <div className="flex overflow-hidden relative flex-col flex-1 items-center w-full h-full">
            <div className="flex overflow-hidden relative w-full h-[80vh]">
                <div
                    className={`relative px-12 overflow-hidden h-full transition-all duration-300 ${showPreview ? "w-[55%]" : "w-full"}`}
                >
                    {connectionState !== ConnectionState.CONNECTED && (
                        <div className="flex absolute inset-0 z-50 flex-col gap-4 justify-center items-center w-full h-full bg-base-100 backdrop-blur-[2px]">
                            <div className="flex flex-col gap-2 justify-center items-center p-4 w-1/2 h-1/2 rounded-lg border bg-base-200/80 border-base-300">
                                <span className="w-full text-xl text-center">
                                    You are currently offline. Connect to enable collaboration.
                                </span>
                            </div>
                        </div>
                    )}

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
                        editable={connectionState === ConnectionState.CONNECTED} // Disable editing when disconnected while offline sync is not implemented
                        onCreateEditor={(view) => handleOnCreateEditor(view)}
                        onChange={handleOnChange()}
                    />
                </div>
                {commentIconPosition && (
                    <AddCommentButton position={commentIconPosition} />
                )}

                {/* Preview pane */}
                {showPreview && (
                    <Preview
                        pdfUrl={pdfUrl}
                        isRendering={isRendering}
                        error={error}
                        onClose={() => setShowPreview(false)}
                        onRecompile={() => recompile(fugue.observe())}
                    />
                )}
            </div>

            <StatusBar
                onConnectionIndicatorClick={handleConnectionIndicatorClick}
                onTogglePreview={handleTogglePreview}
                showPreview={showPreview}
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
    showPreview: boolean;
    onTogglePreview: () => void;
}

const StatusBar = memo(
    ({
        userIdentity,
        connectionState,
        delay,
        onConnectionIndicatorClick,
        showPreview,
        onTogglePreview,
    }: StatusBarProps) => {
        return (
            <footer className="flex flex-row p-5 w-full bg-base">
                <div className="flex flex-1 self-start">
                    <ActiveCollaborators userIdentity={userIdentity} />
                </div>
                <div className="flex flex-1 justify-center self-center">
                    <ConnectionIndicator
                        onClick={onConnectionIndicatorClick}
                        delay={delay}
                        connectionState={connectionState}
                    />
                </div>
                <div className="flex flex-1 justify-end self-end">
                    <button
                        onClick={onTogglePreview}
                        className={`btn btn-sm btn-ghost gap-1 font-mono text-xs ${showPreview ? "btn-active" : ""}`}
                        title="Toggle LaTeX Preview"
                    >
                        <span className="flex gap-2 justify-center items-center">
                            <LuEye />
                            <span className="text-xs">{showPreview ? "Hide Preview" : "Preview"}</span>
                        </span>
                    </button>
                </div>
            </footer>
        );
    },
);

export default memo(Canvas);
