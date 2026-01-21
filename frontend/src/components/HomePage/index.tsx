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
        if (clerk.loaded && !isSignedIn) navigate('/sign-in');
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
    }

    useEffect(() => {
        loadDocuments();
    }, []);
    return (
        //this is just for a proof of concept
        //Will make this better in a bit
        <div className="h-screen w-full flex flex-col justify-start items-center">

            {isLoading ? (
                <>
                    <span className="loading loading-dots loading-xl text-white"></span>
                </>
            ) : (
                <>
                    <div className="flex w-full justify-end ">
                        <button
                            className="btn btn-l btn-neutral m-4"
                            onClick={() => createAndNavigateToDocument()}
                        > Create a document!</button>
                        <button
                            className="btn btn-l btn-neutral m-4"
                            onClick={() => clerk.signOut()}
                        > Sign Out</button>
                    </div>
                    <div className='w-full flex justify-center'>

                        {documents.length === 0 ?
                            <h1>You have no Documents</h1>
                            : <table className="table w-[70%]">
                                <thead>
                                    <tr>
                                        <th>Document Name</th>
                                        <th>Created at</th>
                                        <th>Updated at</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((document, index) => (
                                        <tr key={index} className="hover:bg-white hover:text-black hover:cursor-pointer"
                                            onClick={() => navigate(`/${document._id}`, {
                                                state: {
                                                    documentName: document.name
                                                }
                                            })}
                                        >
                                            <td>{document.name}</td>
                                            <td>{new Date(document.created_at).toLocaleString()}</td>
                                            <td>{new Date(document.updated_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        }
                    </div>
                </>
            )}

        </div>
    );
}