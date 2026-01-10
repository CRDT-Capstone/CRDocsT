import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Canvas from "./components/Canvas/";
import LexicalCanvas from "./components/LexicalCanvas";
import UseEditableCanvas from "./components/UseEditableCanvas";
import CodeMirrorCanvas from "./components/CodeMirrorCanvas";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        {/* <Canvas /> */}
        {/* <LexicalCanvas /> */}
        {/* <UseEditableCanvas /> */}
        <App/>
    </StrictMode>,
);
