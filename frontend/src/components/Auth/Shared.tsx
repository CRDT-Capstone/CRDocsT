import { ReactNode } from "react";

export const clerkAppearance = {
    elements: {
        card: "bg-base-200! border! border-base-300! shadow-2xl! rounded-xl!",
        cardBox: "bg-base-200!",
        headerTitle: "text-base-content! font-bold! tracking-tight!",
        headerSubtitle: "text-base-content/60! text-xs! ",
        formFieldInput:
            "bg-base-100! border! border-base-300! text-base-content! rounded-lg! focus:outline-none! focus:border-primary!",
        formFieldLabel: "text-base-content/70! text-sm!",
        formButtonPrimary:
            "bg-primary! text-primary-content! hover:opacity-90! border-none! rounded-lg! font-semibold! normal-case! shadow-none!",
        socialButtonsBlockButton:
            "bg-base-100! border! border-base-300! text-base-content! hover:border-primary/40! rounded-lg! normal-case!",
        socialButtonsBlockButtonText: "text-base-content/80!  text-xs!",
        dividerLine: "bg-base-300!",
        dividerText: "text-base-content/40!  text-xs!",
        footerActionLink: "text-primary! hover:text-primary/80!",
        footerActionText: "text-base-content/50! font-mono text-xs!",
        footer: "bg-none! bg-base-300!",
    },
};

interface AuthContainerProps {
    children: ReactNode;
}

export const AuthContainer = ({ children }: AuthContainerProps) => (
    <div className="flex flex-col justify-center items-center mt-10 w-full min-h-full">{children}</div>
);
