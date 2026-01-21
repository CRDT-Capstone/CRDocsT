import { SignIn } from "@clerk/clerk-react";
import { createAndNavigateToDocument } from "../../utils";
import { useNavigate } from "react-router-dom";

export const SignInPage = ()=>{
    const navigate = useNavigate();
    return (
        <div className="flex flex-col justify-center items-center w-full h-screen">
        <SignIn/>
        <h1> OR....</h1>
        <button 
                    onClick={()=>createAndNavigateToDocument(navigate)}
                    className="btn btn-l btn-neutral m-4">
                        Work Anonymously
                </button>
        </div>
    );
}