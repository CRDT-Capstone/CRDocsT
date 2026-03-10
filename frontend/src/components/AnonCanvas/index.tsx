import { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { NavBarType } from "../../types";
import Canvas from "../Canvas";
import uiStore from "../../stores/uiStore";
import { useDocument } from "../../hooks/queries";

const AnonCanvas = () => {
    const { documentID } = useParams();
    const setNavBarType = uiStore((state) => state.setNavBarType);
    const setActiveDocumentId = uiStore((state) => state.setActiveDocumentId);
    const { queries } = useDocument(documentID!);
    const { documentQuery } = queries;

    useEffect(() => {
        // Set navbar
        setActiveDocumentId(documentID!);
        setNavBarType(NavBarType.CANVAS);
        return () => {
            setNavBarType(NavBarType.UNSPECIFIED);
            setActiveDocumentId(undefined);
        };
    }, []);

    const handlePresenceUpdate = useCallback(async () => {
        documentQuery.refetch();
    }, [documentQuery]);

    return (
        <div className="flex flex-col">
            <Canvas singleSession={true} documentId={documentID} onPresenceUpdate={handlePresenceUpdate} />
        </div>
    );
};

export default AnonCanvas;
