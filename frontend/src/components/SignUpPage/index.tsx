import { SignUp } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { createAndNavigateToDocument } from "../../utils";

export const SignUpPage = ()=>{
    const navigate = useNavigate();
    return (
        <div className="flex flex-col justify-center items-center w-full h-screen">
        <SignUp/>
        <h1> OR....</h1>
        <button 
            onClick={()=>createAndNavigateToDocument(navigate)}
            className="btn btn-l btn-neutral m-4">
                Work Anonymously
        </button>
        </div>
    );
}