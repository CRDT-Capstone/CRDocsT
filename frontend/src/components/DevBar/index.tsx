import { useState } from "react";
import { LuTerminal, LuSettings2, LuEye, LuEyeOff, LuBug } from "react-icons/lu";
import mainStore from "../../stores";
import { toast } from "sonner";

const DevBar = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isEffecting = mainStore((state) => state.isEffecting);
    const toggleIsEffecting = mainStore((state) => state.toggleIsEffecting);

    return (
        <div className="flex fixed left-0 bottom-4 flex-col gap-2 items-center z-9999">
            <div className="flex flex-col gap-2 items-center p-2 rounded-2xl border shadow-2xl bg-base-200 border-white/10">
                <div className="flex gap-2 items-center">
                    {/* Dev Badge */}
                    <div className="flex gap-2 items-center py-1 px-3 font-mono text-xs font-bold rounded-xl border bg-primary/20 text-primary border-primary/20">
                        <LuBug size={14} />
                        <span>DEV MODE</span>
                    </div>

                    <div className="m-0 w-1 divider divider-horizontal"></div>

                    {isExpanded && (
                        <div className="flex gap-2 items-center animate-in fade-in slide-in-from-bottom-2">
                            <button
                                className="gap-2 normal-case btn btn-sm btn-ghost"
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleIsEffecting();
                                }}
                            >
                                <LuTerminal size={16} />
                                Toggle Effecting
                            </button>

                            <button className="btn btn-sm btn-circle btn-ghost">
                                <LuSettings2 size={16} />
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`btn btn-sm btn-circle ${isExpanded ? "btn-ghost" : "btn-primary"}`}
                    >
                        {isExpanded ? <LuEyeOff size={16} /> : <LuEye size={16} />}
                    </button>
                </div>
                <div>
                    {isExpanded && (
                        <span className="font-mono text-xs opacity-70">
                            Effecting is currently <span className="font-bold">{isEffecting ? "ON" : "OFF"}</span>
                        </span>
                    )}
                </div>
            </div>

            {!isExpanded && (
                <span className="font-bold tracking-widest uppercase opacity-50 text-[10px]">Dev Tools</span>
            )}
        </div>
    );
};

export default DevBar;
