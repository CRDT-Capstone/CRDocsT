import { FugueList, Operation, StringPosition } from "@cr_docs_t/dts";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { useDocumentApi } from "./api/document";

/**
 *
 * @param operation
 * @param index
 * @param fugue
 * @param ws if this is there, then we are broadcasting this event
 * @param data the data
 * @returns the new position of the cursor... we won't use it when we receive operations
 */
export const handleInputTypes = (
    operation: Operation,
    index: number,
    fugue: FugueList<string>,
    data?: string | null,
) => {
    let newCursorPos = index;

    console.log({ operation });
    switch (operation) {
        case Operation.INSERT:
            if (data) {
                fugue.insert(index, data);
                newCursorPos = index + data.length;
            }
            return newCursorPos;

        case Operation.DELETE:
            const idx = index - 1;
            if (idx >= 0) {
                fugue.delete(idx);
                newCursorPos = idx;
            }
            return newCursorPos;
        default:
            return newCursorPos;

        // case "deleteContentForward":
        //     fugue.delete(pos);
        //     newCursorPos = pos;
        //     if (ws) {
        //         ws.send(
        //             JSON.stringify({
        //                 inputType,
        //                 pos,
        //                 data,
        //             }),
        //         );
        //     } //this repetition is kinda ugly
        //     break;
    }
    console.log("Unhandled input type:", operation);
};

export function randomString(length: number = 10): string {
    let res = new Array<string>(length);
    for (let i = 0; i < length; i++) res[i] = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    return res.join("");
}

