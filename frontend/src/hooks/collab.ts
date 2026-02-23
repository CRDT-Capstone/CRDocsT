import { useState, useRef, useEffect } from "react";
import { FugueTree, randomString } from "@cr_docs_t/dts";
import { Annotation, EditorView } from "@uiw/react-codemirror";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import mainStore from "../stores";
import { WSClient } from "../utils/WSClient";
import { toast } from "sonner";
import { ConnectionState } from "../types";

// Ref to ignore next change (to prevent rebroadcasting remote changes)
const RemoteUpdate = Annotation.define<boolean>();

export const useCollab = (documentID: string, editorView: EditorView | undefined) => {
    const { user, isLoaded, isSignedIn } = useUser();
    const nav = useNavigate();
    const anonUserIdentity = mainStore((state) => state.anonUserIdentity);
    const setAnonUserIdentity = mainStore((state) => state.setAnonUserIdentity);
    // User should always have some sort of identity
    const email = user?.primaryEmailAddress?.emailAddress;
    const userIdentity = email || anonUserIdentity || "Guest";

    const viewRef = useRef<EditorView | undefined>(undefined);
    const socketRef = useRef<WebSocket>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [wsClient, setWsClient] = useState<WSClient | undefined>(undefined);
    const previousTextRef = useRef(""); // Track changes with ref
    const [fugue] = useState(() => new FugueTree(socketRef.current, documentID!, userIdentity));
    const setIsConnected = mainStore((state) => state.setConnectionState);
    const isEffecting = mainStore((state) => state.isEffecting);
    const unEffectedMsgs = mainStore((state) => state.unEffectedMsgs);
    const setUnEffectedMsgs = mainStore((state) => state.setUnEffectedMsgs);

    const retriesRef = useRef(0);

    const webSocketUrl = import.meta.env.VITE_WSS_URL as string;

    const isAnon = !email;
    const isAuthError = isLoaded && !userIdentity && isSignedIn;

    useEffect(() => {
        if (!isLoaded) return;

        if (isSignedIn) {
            // If user logged in, clear the anon ID to favor the email
            if (anonUserIdentity) setAnonUserIdentity(undefined);
        } else if (!anonUserIdentity) {
            // If guest and no ID exists, create one
            const newId = `anon-${crypto.randomUUID()}`;
            setAnonUserIdentity(newId);
        }
    }, [isLoaded, isSignedIn, anonUserIdentity]);

    useEffect(() => {
        viewRef.current = editorView;
    }, [editorView]);

    useEffect(() => {
        if (!socketRef.current) setIsConnected(ConnectionState.DISCONNECTED);
        else if (socketRef.current.readyState === WebSocket.OPEN) setIsConnected(ConnectionState.CONNECTED);
    }, [wsClient, fugue]);

    const connect = () => {
        const sock = new WebSocket(webSocketUrl);
        socketRef.current = sock;

        sock.onopen = () => {
            console.log("Socket opened");
            setIsConnected(ConnectionState.DISCONNECTED);
            const wasReconncting = retriesRef.current > 0;
            fugue.ws = sock;
            fugue.userIdentity = userIdentity;

            console.log("Creating new WSClient");
            const newWsClient = new WSClient(
                sock,
                fugue,
                documentID,
                RemoteUpdate,
                viewRef,
                previousTextRef,
                userIdentity,
                wasReconncting,
            );
            setWsClient(newWsClient);
            retriesRef.current = 0;
            console.log({ ready: !newWsClient.isOffline() });
        };

        sock.onclose = () => {
            setIsConnected(ConnectionState.DISCONNECTED);
            socketRef.current = null;
            setWsClient(undefined);
            const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
            console.log(
                `Socket closed. Attempting to reconnect #${retriesRef.current} in ${Math.round(delay / 1000)}s ...`,
            );
            const reconnectTimeout = setTimeout(() => {
                setIsConnected(ConnectionState.RECONNECTING);
                retriesRef.current += 1;
                connect();
            }, delay);
            reconnectTimeoutRef.current = reconnectTimeout;
        };

        sock.onerror = (err) => {
            console.error("WebSocket error ->", err);
            sock.close();
        };
    };

    const disconnect = () => {
        if (socketRef.current) {
            setIsConnected(ConnectionState.DISCONNECTED);
            // Disconnect
            socketRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            // End reconnect attempts
            socketRef.current.onclose = null;
            socketRef.current = null;
            setWsClient(undefined);
        }
    };

    // WebSocket setup
    useEffect(() => {
        if (isAuthError) {
            console.log("User is not authenticated. Please sign in.");
            nav("/sign-in");
        }

        if (!isLoaded || (isSignedIn && !userIdentity) || !editorView || userIdentity === "Guest" || socketRef.current)
            return;
        console.log("Setting up WebSocket connection...");

        connect();
        return () => {
            socketRef.current?.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
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
        isAnon,
        disconnect,
    };
};
