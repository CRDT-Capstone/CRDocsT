import {
    FugueTree,
    PresenceMessageType,
    BaseFugueMessage,
    BasePresenceMessage,
    makePresenceMsg,
    Serializer,
    PresenceUpdateMessage,
} from "@cr_docs_t/dts";
import { AnnotationType, EditorView } from "@uiw/react-codemirror";
import { RefObject } from "react";
import { BaseMessage, MessageType } from "@cr_docs_t/dts";

export class PresenceUpdateWSClient {
    private ws: WebSocket;
    private documentID: string;
    private userIdentity: string;
    private Q: Promise<void> = Promise.resolve();
    private onPresenceUpdate?: () => void;
    private projectId: string | undefined;


    constructor(
        ws: WebSocket,
        documentID: string,
        userIdentity: string,
        onPresenceUpdate?: () => void,
        projectId?: string
    ) {
        this.ws = ws;
        this.documentID = documentID;
        this.userIdentity = userIdentity;
        this.onPresenceUpdate = onPresenceUpdate;
        if (userIdentity) this.userIdentity = userIdentity;
        if(projectId) this.projectId = projectId;

        this.handleOpen = this.handleOpen.bind(this);
        this.handleMessage = this.handleMessage.bind(this);

        this.initListeners();
    }

    private initListeners() {
        // this.ws.onopen = this.handleOpen;
        this.ws.onmessage = this.handleMessage;
    }

    private send(msgs: BaseMessage | BaseMessage[]) {
        const msgsArray = Array.isArray(msgs) ? msgs : [msgs];
        const bytes = this.serialize(msgsArray);
        this.ws.send(bytes);
    }

    private serialize(msgs: BaseMessage | BaseMessage[]): Uint8Array {
        return Serializer.serialize(msgs);
    }

    private deserialize(bytes: Uint8Array): BaseFugueMessage[] | BasePresenceMessage[] {
        return Serializer.deserialize(bytes);
    }


    private async handleOpen() {
        console.log("WebSocket connected");
    }



    async handleMessage(ev: MessageEvent) {
        try {
            const buffer = ev.data as ArrayBuffer;
            const bytes = new Uint8Array(buffer); //convert to Unit8Array

            const raw = this.deserialize(bytes);

            // Determine if it's a FugueMessage or PresenceMessage based on the first message's type
            if (raw.length === 0) {
                console.warn("Received empty message");
                return;
            }

            this.Q = this.Q.then(async () => {
                const firstMsg = raw[0];
                switch (firstMsg.msgType) {
                    case MessageType.PRESENCE:
                        await this.handlePresenceMessages(raw as BasePresenceMessage[]);
                        break;
                }
            });
        } catch (error) {
            console.error("Error processing remote message:", error);
        }
    }


    private async handlePresenceMessages(msgs: BasePresenceMessage[]) {

        const handleMsgType = (msg: BasePresenceMessage) => {
            switch (msg.type) {
                case PresenceMessageType.UPDATE:
                    // For the Update presence message type we just referesh all the active queries, like
                    // project files list, name, etc. This removes the need for continuously refetching with tanstack
                    this.onPresenceUpdate?.();
                    break;
            }
        };

        if (msgs.length === 0) return;

        for (const msg of msgs) {
            handleMsgType(msg);
        }
    }


    async sendPresenceUpdateMsg(){
        const msg = makePresenceMsg<PresenceUpdateMessage>({
            type: PresenceMessageType.UPDATE,
            documentID: this.documentID, 
            userIdentity: this.userIdentity,
            projectID: this.projectId
        });
        this.send(msg);
    }

    setUserIdentity(email?: string) {
        if (email) this.userIdentity = email;
    }

    getUserIdenity(): string | undefined {
        return this.userIdentity;
    }

    isOffline() {
        return this.ws.readyState === WebSocket.CLOSED;
    }
}
