import { APIError, f } from "@cr_docs_t/dts";
import { ApiBaseUrl } from ".";
const path = "preview";

export const createPreviewApi = () => {
    const renderContent = async (content: string) => {
        try {
            const res = await f.post<Blob>(
                `${ApiBaseUrl}/${path}/render`,
                {
                    content,
                },
                {
                    asBlob: true,
                },
            );
            console.log({ res });
            return res;
        } catch (err: any) {
            const e = err as APIError;
            console.error("There was an error rendering the content -> ", e);
            throw err;
        }
    };

    return {
        renderContent,
    };
};
