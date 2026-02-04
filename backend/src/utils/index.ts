import { APIError, ErrMsg } from "@cr_docs_t/dts";

export const handleErrorAsAPIError = (
    err: unknown,
    fallbackMsg: string = "Unknown error",
): { status: number; msg: ErrMsg } => {
    if (err instanceof APIError) {
        return {
            status: err.status,
            msg: {
                message: err.message,
                error: err.stack || "API Error",
            },
        };
    }
    return {
        status: 500,
        msg: {
            message: "Internal Server Error",
            error: err instanceof Error ? err.message : fallbackMsg,
        },
    };
};

