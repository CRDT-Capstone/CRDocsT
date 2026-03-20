import { ClerkProvider } from "@clerk/clerk-react";
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
    throw new Error("Add the clerk publishable key to the .env file");
}

interface ClerkWithRouterProps {
    children: ReactNode;
}

const ClerkWithRouter = ({ children }: ClerkWithRouterProps) => {
    const nav = useNavigate();
    const push = (to: string) => nav(to);
    const replace = (to: string) => nav(to, { replace: true });
    return (
        <ClerkProvider
            appearance={{
                theme: "simple",
                cssLayerName: "clerk",
            }}
            publishableKey={PUBLISHABLE_KEY}
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
            routerPush={push}
            routerReplace={replace}
        >
            {children}
        </ClerkProvider>
    );
};

export default ClerkWithRouter;
