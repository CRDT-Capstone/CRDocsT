import { useState, useRef, useEffect } from "react";
import { EditorView } from "@uiw/react-codemirror";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import mainStore from "../stores";
import { ConnectionState } from "../types";
import { makeAnonUserIdentity } from "../utils";
import { PresenceUpdateWSClient } from "../utils/PresenceUpdateWSClient";



export const usePresence = (onPresenceUpdate?: () => void, projectID?: string, documentID?: string) => {
    const { user, isLoaded, isSignedIn } = useUser();
    const nav = useNavigate();
    const anonUserIdentity = mainStore((state) => state.anonUserIdentity);
    // User should always have some sort of identity
    const email = user?.primaryEmailAddress?.emailAddress;
    const userIdentity = email || anonUserIdentity || "Guest";

    const socketRef = useRef<WebSocket>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [wsClient, setWsClient] = useState<PresenceUpdateWSClient | undefined>(undefined);
    const [connectionState, setIsConnected] = useState(ConnectionState.DISCONNECTED);
    const [delay, setDelay] = useState<number | undefined>(undefined);

    const retriesRef = useRef(0);

    const webSocketUrl = import.meta.env.VITE_WSS_URL as string;

    const isAnon = !email;
    const isAuthError = isLoaded && !userIdentity && isSignedIn;

    const project = mainStore((state)=> state.project);
    const document = mainStore((state)=> state.document);
    let activeProjectID = (projectID) ? projectID : project?._id!
    let activeDocumentID = (documentID) ? documentID : document?._id!


    useEffect(() => {
        if (!socketRef.current) setIsConnected(ConnectionState.DISCONNECTED);
        else if (socketRef.current.readyState === WebSocket.OPEN) setIsConnected(ConnectionState.CONNECTED);
    }, [wsClient]);

    const connect = () => {
        const sock = new WebSocket(webSocketUrl);
        sock.binaryType = "arraybuffer";
        socketRef.current = sock;

        sock.onopen = () => {
            console.log("Socket opened");
            setIsConnected(ConnectionState.DISCONNECTED);
            setDelay(undefined);

            console.log("Creating new WSClient");
            const newWsClient = new PresenceUpdateWSClient(
                sock,
                activeDocumentID,
                userIdentity,
                onPresenceUpdate,
                activeProjectID
            );
            setWsClient(newWsClient);
            retriesRef.current = 0;
            console.log({ ready: !newWsClient.isOffline() });
        };

        sock.onclose = () => {
            setIsConnected(ConnectionState.DISCONNECTED);
            socketRef.current = null;
            setWsClient(undefined);
            const nextDelay = 1000 * Math.min(2 ** retriesRef.current, 30); // Exponential backoff with cap at 30s
            setDelay(nextDelay);
            console.log(
                `Socket closed. Attempting to reconnect #${retriesRef.current} in ${Math.round(nextDelay / 1000)}s ...`,
            );
            const reconnectTimeout = setTimeout(() => {
                setIsConnected(ConnectionState.RECONNECTING);
                retriesRef.current += 1;
                connect();
            }, nextDelay);
            reconnectTimeoutRef.current = reconnectTimeout;
        };

        sock.onerror = (err) => {
            console.error("WebSocket error ->", err);
            sock.close();
        };
    };

    const disconnect = () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (retriesRef.current == 0) retriesRef.current = 1; // If we disconnect manually, set retries to 1 to avoid initial sync message on reconnect
        setDelay(undefined);

        if (socketRef.current) {
            socketRef.current.onclose = null;
            socketRef.current.onerror = null;
            socketRef.current.onmessage = null;

            socketRef.current.close();
            socketRef.current = null;
        }

        setWsClient(undefined);
        setIsConnected(ConnectionState.DISCONNECTED);
    };

    // WebSocket setup
    useEffect(() => {
        if (isAuthError) {
            console.log("User is not authenticated. Please sign in.");
            nav("/sign-in");
        }

        if (!isLoaded || (isSignedIn && !userIdentity) || userIdentity === "Guest" || socketRef.current)
            return;
        console.log("Setting up WebSocket connection...");

        connect();
        return () => {
            disconnect();
        };
    }, [activeDocumentID, isLoaded, userIdentity, isSignedIn]);

    const sendPresenceUpdateMsg = async()=>{
        await wsClient?.sendPresenceUpdateMsg();
    }


    return {
        wsClient: wsClient,
        isAuthError,
        socketRef,
        userIdentity,
        isAnon,
        disconnect,
        connectionState,
        connect,
        delay,
        sendPresenceUpdateMsg
    };
};
