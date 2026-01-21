import { SignIn } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useDocumentApi } from "../../api/document";

export const SignInPage = () => {
    const { createAndNavigateToDocument } = useDocumentApi();
    return (
        <div className="flex flex-col justify-center items-center w-full h-screen">
            <SignIn />
            <h1> OR....</h1>
            <button
                onClick={() => createAndNavigateToDocument()}
                className="btn btn-l btn-neutral m-4">
                Work Anonymously
            </button>
        </div>
    );
}