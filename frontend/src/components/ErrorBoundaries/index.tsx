import { FallbackProps } from "react-error-boundary";
import { LuRefreshCw, LuTriangleAlert } from "react-icons/lu";
import { useNavigate } from "react-router-dom";

export const GlobalError = ({ error, resetErrorBoundary }: FallbackProps) => {
    const nav = useNavigate();
    const e = error as Error;
    return (
        <div className="flex flex-col justify-center items-center p-6 min-h-screen text-center bg-base-100">
            <h1 className="mb-4 text-4xl font-bold text-error">Something went wrong</h1>
            <p className="mb-6 max-w-md text-base-content/70">
                We encountered a critical error. Please try refreshing the page.
            </p>
            <div className="overflow-auto p-4 mb-6 max-w-full text-left rounded-lg bg-base-200">
                <code className="text-xs text-error">{e.message}</code>
            </div>
            <button
                className="btn btn-primary"
                onClick={() => {
                    resetErrorBoundary();
                    nav("/");
                }}
            >
                Return to Home
            </button>
        </div>
    );
};

export const CanvasError = ({ error, resetErrorBoundary }: FallbackProps) => (
    <div className="flex flex-col justify-center items-center p-8 w-full h-full rounded-xl border-2 border-dashed bg-base-200/50 border-error/30">
        <LuTriangleAlert className="mb-4 text-error" size={48} />
        <h3 className="mb-2 text-lg font-semibold">Editor Failed to Load</h3>
        <p className="mb-6 max-w-sm text-sm text-center text-base-content/60">
            There was an issue rendering this document. Please try refreshing the page.
        </p>
        <button onClick={resetErrorBoundary} className="gap-2 btn btn-sm btn-outline btn-error">
            <LuRefreshCw size={16} />
            Try Re-rendering
        </button>
    </div>
);

export const PreviewError = ({ error }: FallbackProps) => {
    const e = error as Error;
    return (
        <div className="w-[45%] h-full bg-base-300 flex flex-col items-center justify-center p-4 text-center">
            <span className="mb-2 badge badge-error">Preview Engine Error</span>
            <p className="text-xs opacity-70">The LaTeX renderer crashed. Please try refreshing the page.</p>
            <pre className="overflow-auto p-2 mt-4 w-full max-h-40 text-left rounded text-[10px] bg-black/20">
                {e.message}
            </pre>
        </div>
    );
};

export const SidebarError = ({ resetErrorBoundary }: FallbackProps) => (
    <div className="flex flex-col justify-center items-center p-4 w-80 h-full border-r bg-base-200 border-base-300">
        <p className="mb-4 text-xs font-medium text-center text-error">Failed to load workspace items.</p>
        <button onClick={resetErrorBoundary} className="underline btn btn-xs btn-ghost">
            Retry Load
        </button>
    </div>
);
