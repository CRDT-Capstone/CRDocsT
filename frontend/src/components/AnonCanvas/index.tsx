import { Suspense, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { NavBarType } from "../../types";
import Canvas from "../Canvas";
import uiStore from "../../stores/uiStore";
import { useDocument } from "../../hooks/queries";
import Loading from "../Loading";

const AnonCanvas = () => {
    const { documentID } = useParams();
    const setNavBarType = uiStore((state) => state.setNavBarType);
    const setActiveDocumentId = uiStore((state) => state.setActiveDocumentId);

    useEffect(() => {
        setActiveDocumentId(documentID!);
        setNavBarType(NavBarType.CANVAS);
        return () => {
            setNavBarType(NavBarType.UNSPECIFIED);
            setActiveDocumentId(undefined);
        };
    }, []);

    // const handlePresenceUpdate = useCallback(async () => {
    //     documentQuery.refetch();
    // }, [documentQuery]);

    return (
        <div className="flex flex-col">
            <Suspense fallback={<Loading fullPage={true} label="Loading Document..." />}>
                <Canvas singleSession={true} documentId={documentID} />
            </Suspense>
        </div>
    );
};

export default AnonCanvas;
