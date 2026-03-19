import { Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SignInPage } from "../Auth/SignIn";
import { SignUpPage } from "../Auth/SignUp";
import { Toaster } from "sonner";
import DevBar from "../DevBar";
import NavBar from "../NavBar";
import AnonCanvas from "../AnonCanvas";
import UserCanvas from "../UserCanvas";
import ProjectCanvas from "../ProjectCanvas";
import { GlobalError } from "../ErrorBoundaries";
import { ErrorBoundary } from "react-error-boundary";
import Home from "../Home";
import ClerkWithRouter from "../ClerkWithRouter";
import { Parser, Query } from "web-tree-sitter";

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

    useEffect(() => {
        return () => {
            const parserAndQuery = queryClient.getQueryData<{ parser: Parser; query: Query }>(["parser", "latex"]);
            if (parserAndQuery) {
                parserAndQuery.query?.delete();
                parserAndQuery.parser?.delete();
            }
        };
    }, [queryClient]);

    return (
        <BrowserRouter>
            <ErrorBoundary FallbackComponent={GlobalError}>
                <div className="flex flex-col flex-1 min-h-screen">
                    <QueryClientProvider client={queryClient}>
                        <ClerkWithRouter>
                            <NavBar />
                            <Routes>
                                <Route path="/sign-in" element={<SignInPage />} />
                                <Route path="/sign-up" element={<SignUpPage />} />
                                <Route path="/docs/:documentID" element={<AnonCanvas />} />
                                <Route path="/" element={<Home />} />
                                <Route path="/projects/:projectId" element={<ProjectCanvas />} />
                                <Route path="/:userId/docs/:documentID" element={<UserCanvas />} />
                            </Routes>
                        </ClerkWithRouter>
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
                                    loader: "loading loading-spinner loading-sm",
                                },
                            }}
                        />
                        <ReactQueryDevtools initialIsOpen={false} />
                        {import.meta.env.MODE !== "production" && <DevBar />}
                    </QueryClientProvider>
                </div>
            </ErrorBoundary>
        </BrowserRouter>
    );
};

export default Main;
