import { useState } from "react";
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignInPage } from "../SignInPage";
import { SignUpPage } from "../SignUpPage";
import { Toaster } from "sonner";
import DevBar from "../DevBar";
import NavBar from "../NavBar";
import AnonCanvas from "../AnonCanvas";
import UserCanvas from "../UserCanvas";
import ProjectCanvas from "../ProjectCanvas";

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
            <div className="w-full">
                <QueryClientProvider client={queryClient}>
                    <ClerkProvider
                        publishableKey={PUBLISHABLE_KEY}
                        signInUrl="/sign-in"
                        signUpUrl="/sign-up"
                        signInFallbackRedirectUrl="/"
                        signUpFallbackRedirectUrl="/"
                    >
                        <NavBar />
                        <Routes>
                            <Route path="/sign-in" element={<SignInPage />} />
                            <Route path="/sign-up" element={<SignUpPage />} />
                            <Route path="/docs/:documentID" element={<AnonCanvas />} />
                            <Route
                                path="/"
                                element={
                                    <>
                                        <SignedIn>
                                            <UserCanvas />
                                        </SignedIn>
                                        <SignedOut>
                                            <Navigate to="/sign-in" replace />
                                        </SignedOut>
                                    </>
                                }
                            />
                            <Route path="/projects/:projectId" element={<ProjectCanvas />} />
                            <Route path="/:userId/docs/:documentID" element={<UserCanvas />} />
                        </Routes>
                    </ClerkProvider>
                    <Toaster
                        position="bottom-right"
                        toastOptions={{
                            unstyled: true,
                            classNames: {
                                toast: "alert alert-soft shadow-lg border-2",
                                success: "alert-success",
                                error: "alert-error",
                                info: "alert-info",
                                warning: "alert-warning",
                                loader: "loading loading-spinner",
                            },
                        }}
                    />
                    <ReactQueryDevtools initialIsOpen={false} />
                    {/* {import.meta.env.MODE !== "production" && <DevBar />} */}
                    <DevBar />
                </QueryClientProvider>
            </div>
        </BrowserRouter>
    );
};

export default Main;
