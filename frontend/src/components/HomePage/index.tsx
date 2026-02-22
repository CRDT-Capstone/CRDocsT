import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useClerk, useSession } from "@clerk/clerk-react";
import Loading from "../Loading";
import { useDocuments } from "../../hooks/queries";
import mainStore from "../../stores";
import React from "react";
import { LuTrash2 } from "react-icons/lu";
import { NavBarType } from "../../types";

export const HomePage = () => {
    const navigate = useNavigate();
    const { isSignedIn, isLoaded } = useSession();
    const setNavBarType = mainStore((state) => state.setNavBarType);

    useEffect(() => {
        if (isLoaded && !isSignedIn) navigate("/sign-in");
    }, [navigate, isSignedIn, isLoaded]);

    const { queries, mutations } = useDocuments();
    const { userDocumentsQuery } = queries;
    const { createDocumentMutation, deleteDocumentMutation } = mutations;

    useEffect(() => {
        setNavBarType(NavBarType.HOME);
        return () => {
            setNavBarType(NavBarType.UNSPECIFIED);
        };
    }, []);

    return (
        //this is just for a proof of concept
        //Will make this better in a bit
        <div className="flex flex-col justify-start items-center w-full h-screen">
            {userDocumentsQuery.isLoading ? (
                <Loading fullPage={true} />
            ) : (
                <>
                    <div className="flex flex-col items-center pb-10 w-full">
                        {userDocumentsQuery.data?.pages[0].data.length === 0 ? (
                            <h1>You have no Documents</h1>
                        ) : (
                            <table className="table w-[70%] mb-4">
                                <thead>
                                    <tr>
                                        <th>Document Name</th>
                                        <th>Created at</th>
                                        <th>Updated at</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {userDocumentsQuery.data!.pages.map((group, pageIndex) => (
                                        <React.Fragment key={pageIndex}>
                                            {group.data.map((doc) => (
                                                <tr
                                                    key={doc._id} // Use unique ID instead of index
                                                    className="hover:text-black hover:bg-white hover:cursor-pointer"
                                                    onClick={() =>
                                                        navigate(`/docs/${doc._id}`, {
                                                            state: {
                                                                documentName: doc.name,
                                                            },
                                                        })
                                                    }
                                                >
                                                    <td>{doc.name}</td>
                                                    <td>{new Date(doc.createdAt || "").toLocaleString()}</td>
                                                    <td>{new Date(doc.updatedAt || "").toLocaleString()}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-square btn-md btn-error"
                                                            disabled={
                                                                deleteDocumentMutation.isPending ||
                                                                createDocumentMutation.isPending ||
                                                                userDocumentsQuery.isFetchingNextPage
                                                            }
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                await deleteDocumentMutation.mutateAsync(doc._id!);
                                                            }}
                                                        >
                                                            <LuTrash2 />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div className="flex justify-center mt-4 w-full">
                            <button
                                // Disable if fetching or if NO next page exists
                                disabled={!userDocumentsQuery.hasNextPage || userDocumentsQuery.isFetchingNextPage}
                                onClick={() => userDocumentsQuery.fetchNextPage()}
                                className="btn btn-neutral btn-l"
                            >
                                {userDocumentsQuery.isFetchingNextPage
                                    ? "Loading more..."
                                    : userDocumentsQuery.hasNextPage
                                      ? "Load More"
                                      : "Nothing more to load"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
