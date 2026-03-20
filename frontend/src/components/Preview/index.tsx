import { memo } from "react";
import { LuFileWarning, LuRedo, LuX } from "react-icons/lu";

interface PreviewProps {
    pdfUrl: string | null;
    isRendering: boolean;
    error: string | null;
    onClose: () => void;
    onRecompile: () => void;
}

const Preview = memo(({ pdfUrl, isRendering, error, onClose, onRecompile }: PreviewProps) => {
    return (
        <div className="flex flex-col w-[45%] min-w-100 h-full border-l border-base-300 bg-base-100">
            <div className="flex justify-between items-center py-2 px-4 border-b border-base-300 bg-base-200">
                <div className="flex gap-2 items-center">
                    <span className="text-sm font-semibold">Preview</span>
                    {isRendering && (
                        <span className="flex gap-1 items-center text-xs opacity-60">
                            <span className="loading loading-spinner loading-xs" />
                            Rendering...
                        </span>
                    )}
                </div>
                <div className="flex gap-1 items-center">
                    <button
                        onClick={onRecompile}
                        disabled={isRendering}
                        className="gap-1 text-xs disabled:opacity-40 btn btn-ghost btn-xs"
                    >
                        <span className={isRendering ? "animate-spin" : ""}>
                            <LuRedo />
                        </span>
                        Recompile
                    </button>
                    <button onClick={onClose} className="btn btn-ghost btn-xs btn-square" aria-label="Close preview">
                        <LuX />
                    </button>
                </div>
            </div>

            <div className="flex overflow-hidden flex-1">
                {error ? (
                    <div className="flex flex-col gap-2 justify-center items-center p-6 w-full text-center">
                        <span className="flex flex-col items-center text-error">
                            <LuFileWarning />
                            <span>Render Error</span>
                        </span>
                        <span className="overflow-y-auto max-h-48 font-mono text-xs text-left whitespace-pre-wrap opacity-60">
                            {error}
                        </span>
                    </div>
                ) : pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full h-full border-none" title="LaTeX Preview" />
                ) : (
                    <div className="flex justify-center items-center w-full opacity-40">
                        <span className="text-sm">Press recompile to preview</span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default Preview;
