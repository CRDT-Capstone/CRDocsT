import { SignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "../../hooks/queries";
import mainStore from "../../stores";
import { randomString } from "@cr_docs_t/dts";

export const SignInPage = () => {
    const nav = useNavigate();
    const { mutations } = useDocuments();
    const { createDocumentMutation } = mutations;
    const setAnonUserIdentity = mainStore((state) => state.setAnonUserIdentity);
    const anonUserIdentity = mainStore((state) => state.anonUserIdentity);
    return (
        <div className="flex flex-col justify-center items-center w-full">
            <SignIn />
            <h1> OR....</h1>
            <button
                onClick={async () => {
                    if (!anonUserIdentity) setAnonUserIdentity(randomString(10));
                    const res = await createDocumentMutation.mutateAsync(undefined);
                    nav(`/docs/${res.data._id}`);
                }}
                className="m-4 btn btn-l btn-neutral"
            >
                Work Anonymously
            </button>
        </div>
    );
};
