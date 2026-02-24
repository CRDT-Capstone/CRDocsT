import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { NavBarType } from "../../types";
import Canvas from "../Canvas";
import uiStore from "../../stores/uiStore";

const AnonCanvas = () => {
    const { documentID } = useParams();
    const setNavBarType = uiStore((state) => state.setNavBarType);
    const setActiveDocumentId = uiStore((state) => state.setActiveDocumentId);

    useEffect(() => {
        // Set navbar
        setActiveDocumentId(documentID!);
        setNavBarType(NavBarType.CANVAS);
        return () => {
            setNavBarType(NavBarType.UNSPECIFIED);
            setActiveDocumentId(undefined);
        };
    }, []);

    return (
        <div className="flex flex-col">
            <Canvas singleSession={true} documentId={documentID} />
        </div>
    );
};

export default AnonCanvas;
