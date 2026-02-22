import { useState, useEffect, useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../Loading";
import { useDocument } from "../../hooks/queries";
import mainStore from "../../stores";
import { latexSupport } from "../../treesitter/codemirror";
import { Parser, Query, Tree } from "web-tree-sitter";
import { newParser } from "../../treesitter";
import { useCollab } from "../../hooks/collab";
import { createDocumentApi } from "../../api/document";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";
import ActiveCollaborators from "../ActiveCollaborators";
import { NavBarType } from "../../types";
import Canvas from "../Canvas";

const AnonCanvas = () => {
    const { documentID } = useParams();
    const setNavBarType = mainStore((state) => state.setNavBarType);
    const setActiveDocumentId = mainStore((state) => state.setActiveDocumentId);

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
        <div className="flex flex-col h-screen">
            <Canvas documentId={documentID} />
        </div>
    );
};

export default AnonCanvas;
