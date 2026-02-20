import { FugueMessage, FugueMessageSerialzier } from "@cr_docs_t/dts";

export function randomString(length: number = 10): string {
    let res = new Array<string>(length);
    for (let i = 0; i < length; i++) res[i] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    return res.join("");
}

export function loadBufferedOperations(bufferedOps: Buffer<ArrayBuffer>[]) {
    const parsedOps = bufferedOps.map((op) => FugueMessageSerialzier.deserializeSingleMessage(op));
    return parsedOps as FugueMessage[];
}

export function saveLatestOnlineCounter(msgs: FugueMessage[]) {
    let counter = msgs[msgs.length - 1].id.counter;
    let storedCounter = Number(sessionStorage.getItem("lastOnlineCounter"));
    if (counter > storedCounter) sessionStorage.setItem("lastOnlineCounter", counter.toString());

}