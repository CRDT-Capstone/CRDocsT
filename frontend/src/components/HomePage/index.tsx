import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useClerk, useSession } from "@clerk/clerk-react";
import Loading from "../Loading";
import { useDocuments } from "../../hooks/queries";

export const HomePage = () => {
    const navigate = useNavigate();
    const clerk = useClerk();
    const { isSignedIn } = useSession();

    useEffect(() => {
        if (clerk.loaded && !isSignedIn) navigate("/sign-in");
    }, [navigate, isSignedIn, clerk.loaded]);

    const { queries, mutations } = useDocuments();
    const { userDocumentsQuery } = queries;
    const { createDocumentMutation } = mutations;

    return (
        //this is just for a proof of concept
        //Will make this better in a bit
        <div className="flex flex-col justify-start items-center w-full h-screen">
            {userDocumentsQuery.isLoading ? (
                <Loading fullPage={true} />
            ) : (
                <>
                    <div className="flex justify-end w-full">
                        <button
                            className="m-4 btn btn-l btn-neutral"
                            disabled={createDocumentMutation.isPending}
                            onClick={async () => {
                                const res = await createDocumentMutation.mutateAsync();
                                navigate(`/docs/${res.data._id}`);
                            }}
                        >
                            {" "}
                            Create a document!
                        </button>
                        <button className="m-4 btn btn-l btn-neutral" onClick={() => clerk.signOut()}>
                            {" "}
                            Sign Out
                        </button>
                    </div>
                    <div className="flex justify-center w-full">
                        {userDocumentsQuery.data!.length === 0 ? (
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
                                    {userDocumentsQuery.data!.map((document, index) => (
                                        <tr
                                            key={index}
                                            className="hover:text-black hover:bg-white hover:cursor-pointer"
                                            onClick={() =>
                                                navigate(`/docs/${document._id}`, {
                                                    state: {
                                                        documentName: document.name,
                                                    },
                                                })
                                            }
                                        >
                                            <td>{document.name}</td>
                                            <td>{new Date(document.createdAt || "").toLocaleString()}</td>
                                            <td>{new Date(document.updatedAt || "").toLocaleString()}</td>
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
