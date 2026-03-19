import React from "react";

interface LoadingProps {
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    variant?: "dots" | "spinner" | "ring" | "ball";
    color?: string;
    fullPage?: boolean;
    label?: string;
}

const Loading = ({
    size = "lg",
    variant = "dots",
    color = "text-white",
    fullPage = false,
    label = "Loading...",
}: LoadingProps) => {
    const sizeClasses = {
        xs: "loading-xs",
        sm: "loading-sm",
        md: "loading-md",
        lg: "loading-lg",
        xl: "loading-xl",
    };

    const containerClasses = fullPage ? "fixed inset-0 z-50 bg-base-100/50 backdrop-blur-sm" : "flex-1 min-h-0 w-full";

    return (
        <div
            className={`flex flex-col justify-center items-center gap-4 ${containerClasses}`}
            role="status"
            aria-live="polite"
        >
            <span className={`loading loading-${variant} ${sizeClasses[size]} ${color}`}></span>
            <span className="sr-only">{label}</span>
        </div>
    );
};

export default Loading;
