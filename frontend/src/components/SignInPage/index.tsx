import { SignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "../../hooks/queries";

export const SignInPage = () => {
    const nav = useNavigate();
    const { mutations } = useDocuments();
    const { createDocumentMutation } = mutations;
    return (
        <div className="flex flex-col justify-center items-center w-full h-screen">
            <SignIn />
            <h1> OR....</h1>
            <button
                onClick={async () => {
                    const res = await createDocumentMutation.mutateAsync();
                    console.log({ res });
                    nav(`/docs/${res.data._id}`);
                }}
                className="m-4 btn btn-l btn-neutral"
            >
                Work Anonymously
            </button>
        </div>
    );
};
