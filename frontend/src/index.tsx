import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider, SignedIn } from "@clerk/clerk-react";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./components/HomePage";
import { SignInPage } from "./components/SignInPage";
import { SignUpPage } from "./components/SignUpPage";
import Canvas from "./components/Canvas";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
    throw new Error("Add the clerk publishable key to the .env file");
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <ClerkProvider
                publishableKey={PUBLISHABLE_KEY}
                signInUrl="/sign-in"
                signUpUrl="/sign-up"
                signInFallbackRedirectUrl="/"
                signUpFallbackRedirectUrl="/"
            >
                <Routes>
                    <Route path="/sign-in" element={<SignInPage />} />
                    <Route path="/sign-up" element={<SignUpPage />} />
                    <Route path="/docs/:documentID" element={<Canvas />} />
                    <Route path="/" element={<HomePage />} />
                </Routes>
            </ClerkProvider>
        </BrowserRouter>
    </StrictMode>,
);
