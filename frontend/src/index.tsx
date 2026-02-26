import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Main from "./components/Main";
import { scan } from "react-scan";

scan({
    enabled: !import.meta.env.PROD,
});

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
    throw new Error("Add the clerk publishable key to the .env file");
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Main />
    </StrictMode>,
);
