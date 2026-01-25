import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Document } from "../../types";
import { useClerk, useSession } from "@clerk/clerk-react";
import { useDocumentApi } from "../../api/document";

export const HomePage = () => {
    const navigate = useNavigate();
    const clerk = useClerk();
    const { isSignedIn } = useSession();
    const { getDocumentsByUserId, createAndNavigateToDocument } = useDocumentApi();

    useEffect(() => {
        if (clerk.loaded && !isSignedIn) navigate("/sign-in");
    }, [navigate, isSignedIn, clerk.loaded]);

    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState<Boolean>(true);

    const loadDocuments = async () => {
        const loadedDocuments = await getDocumentsByUserId();
        if (loadedDocuments) {
            setDocuments([...loadedDocuments]);
        }
        setIsLoading(false);
        //display some error or something
    };

    useEffect(() => {
        loadDocuments();
    }, []);
    return (
        //this is just for a proof of concept
        //Will make this better in a bit
        <div className="flex flex-col justify-start items-center w-full h-screen">
            {isLoading ? (
                <>
                    <span className="text-white loading loading-dots loading-xl"></span>
                </>
            ) : (
                <>
                    <div className="flex justify-end w-full">
                        <button className="m-4 btn btn-l btn-neutral" onClick={() => createAndNavigateToDocument()}>
                            {" "}
                            Create a document!
                        </button>
                        <button className="m-4 btn btn-l btn-neutral" onClick={() => clerk.signOut()}>
                            {" "}
                            Sign Out
                        </button>
                    </div>
                    <div className="flex justify-center w-full">
                        {documents.length === 0 ? (
                            <h1>You have no Documents</h1>
                        ) : (
                            <table className="table w-[70%]">
                                <thead>
                                    <tr>
                                        <th>Document Name</th>
                                        <th>Created at</th>
                                        <th>Updated at</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((document, index) => (
                                        <tr
                                            key={index}
                                            className="hover:text-black hover:bg-white hover:cursor-pointer"
                                            onClick={() =>
                                                navigate(`docs/${document._id}`, {
                                                    state: {
                                                        documentName: document.name,
                                                    },
                                                })
                                            }
                                        >
                                            <td>{document.name}</td>
                                            <td>{new Date(document.created_at).toLocaleString()}</td>
                                            <td>{new Date(document.updated_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

