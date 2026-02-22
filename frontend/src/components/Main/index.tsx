import { useState } from "react";
import { ClerkProvider, SignedIn } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "../HomePage";
import { SignInPage } from "../SignInPage";
import { SignUpPage } from "../SignUpPage";
import { Toaster } from "sonner";
import Canvas from "../Canvas";
import DevBar from "../DevBar";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
    throw new Error("Add the clerk publishable key to the .env file");
}

const Main = () => {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 5 * 60 * 1000, // 5 minutes
                        retry: (failureCount, error) => {
                            const errWithStatus = error as { status?: number };
                            // Don't retry on 4xx errors
                            if (errWithStatus.status! >= 400 && errWithStatus.status! < 500) {
                                return false;
                            }
                            // Retry up to 3 times for other errors
                            return failureCount < 3;
                        },
                        refetchOnWindowFocus: false,
                        refetchOnReconnect: "always",
                    },
                    mutations: {
                        retry: 1,
                    },
                },
            }),
    );

    return (
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
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
                <Toaster
                    position="bottom-right"
                    toastOptions={{
                        unstyled: true,
                        classNames: {
                            toast: "alert shadow-lg border-2",
                            success: "alert-success",
                            error: "alert-error",
                            info: "alert-info",
                            warning: "alert-warning",
                        },
                    }}
                />
                <ReactQueryDevtools initialIsOpen={false} />
                {/* {import.meta.env.MODE !== "production" && <DevBar />} */}
                <DevBar />
            </QueryClientProvider>
        </BrowserRouter>
    );
};

export default Main;
