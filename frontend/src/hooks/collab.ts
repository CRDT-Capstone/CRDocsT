import { useState, useRef, useEffect, useMemo } from "react";
import { FugueTree, Operation } from "@cr_docs_t/dts";
import CodeMirror, { ViewUpdate, Annotation, EditorView } from "@uiw/react-codemirror";
import { bracketMatching, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { useNavigate, useParams } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { useDocument } from "./queries";
import mainStore from "../stores";
import { WSClient } from "../utils/WSClient";
import { toast } from "sonner";

// Ref to ignore next change (to prevent rebroadcasting remote changes)
const RemoteUpdate = Annotation.define<boolean>();

export const useCollab = (documentID: string, editorView: EditorView | undefined) => {
    const { user, isLoaded, isSignedIn } = useUser();
    const nav = useNavigate();
    const userIdentity = user?.primaryEmailAddress?.emailAddress;

    const viewRef = useRef<EditorView | undefined>(undefined);
    const socketRef = useRef<WebSocket>(null);
    const [wsClient, setWsClient] = useState<WSClient | undefined>(undefined);
    const previousTextRef = useRef(""); // Track changes with ref
    const [fugue] = useState(() => new FugueTree(null, documentID!));
    const isEffecting = mainStore((state) => state.isEffecting);
    const unEffectedMsgs = mainStore((state) => state.unEffectedMsgs);
    const setUnEffectedMsgs = mainStore((state) => state.setUnEffectedMsgs);

    const webSocketUrl = import.meta.env.VITE_WSS_URL as string;

    const isAuthError = isLoaded && !userIdentity && isSignedIn;

    useEffect(() => {
        viewRef.current = editorView;
    }, [editorView]);

    // WebSocket setup
    useEffect(() => {
        if (isAuthError) {
            console.log("User is not authenticated. Please sign in.");
            nav("/sign-in");
        }

        if (!isLoaded || (isSignedIn && !userIdentity) || !editorView || socketRef.current) return;
        console.log("Setting up WebSocket connection...");

        const connect = () => {
            const sock = new WebSocket(webSocketUrl);
            socketRef.current = sock;

            console.log("Socket opened");
            fugue.ws = sock;
            fugue.userIdentity = userIdentity;

            const wsClient = new WSClient(
                sock,
                fugue,
                documentID,
                RemoteUpdate,
                viewRef,
                previousTextRef,
                userIdentity,
            );
            setWsClient(wsClient);
            console.log({ ready: !wsClient.isOffline() });

            sock.onclose = () => {
                socketRef.current = null;
                // TODO: exponential backoff
                setTimeout(connect, 5000); // Reconnect after 5 seconds
            };
        };

        connect();
        return () => {
            if (socketRef.current) socketRef.current.close();
        };
    }, [documentID, isLoaded, userIdentity, !!editorView]);

    // Apply any buffered messages once the editor is ready and we're connected
    useEffect(() => {
        if (!isLoaded || !isEffecting || !editorView || !wsClient) return;

        if (isEffecting && unEffectedMsgs.length > 0) {
            console.log("Applying buffered messages ->", unEffectedMsgs);
            toast.info("Applying buffered messages");
            wsClient.effectMsgs(unEffectedMsgs);
            setUnEffectedMsgs([]);
        }
    }, [isEffecting, isLoaded, editorView, wsClient]);

    return {
        fugue,
        wsClient: wsClient,
        isAuthError,
        RemoteUpdate,
        previousTextRef,
        socketRef,
        viewRef,
        userIdentity,
    };
};
