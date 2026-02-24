import { SignUp } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useDocuments } from "../../hooks/queries";
import { toast } from "sonner";

export const SignUpPage = () => {
    const nav = useNavigate();
    const { mutations } = useDocuments();
    const { createDocumentMutation } = mutations;
    return (
        <div className="flex flex-col justify-center items-center w-full">
            <SignUp />
            <h1> OR....</h1>
            <button
                onClick={async () => {
                    const res = await createDocumentMutation.mutateAsync(undefined);
                    toast.success("Document created anonymously");
                    nav(`/docs/${res.data}`);
                }}
                className="m-4 btn btn-l btn-neutral"
            >
                Work Anonymously
            </button>
        </div>
    );
};
