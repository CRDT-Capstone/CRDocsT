import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Main from "./components/Main";
import { scan } from "react-scan";
import { setConsole } from "@cr_docs_t/dts";
import { devConsole } from "./utils";

scan({
    enabled: !import.meta.env.PROD,
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
    throw new Error("Add the clerk publishable key to the .env file");
}

// if (import.meta.env.DEV) {
//     setConsole(devConsole);
//     globalThis.console = devConsole;
// }

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Main />
    </StrictMode>,
);
