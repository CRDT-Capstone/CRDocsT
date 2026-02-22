import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LuTerminal, LuSettings2, LuEye, LuEyeOff, LuBug, LuGripVertical } from "react-icons/lu";
import mainStore from "../../stores";

const STORAGE_KEY = "dev-bar-position";

const DevBar = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isEffecting = mainStore((state) => state.isEffecting);
    const toggleIsEffecting = mainStore((state) => state.toggleIsEffecting);
    const devBarPos = mainStore((state) => state.devBarPos);
    const setDevBarPos = mainStore((state) => state.setDevBarPos);

    const handleDragEnd = (_: any, info: any) => {
        const newPos = { x: info.point.x, y: info.point.y };
        setDevBarPos(newPos);
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            initial={{ x: devBarPos.x, y: devBarPos.y }}
            onDragEnd={handleDragEnd}
            className="flex fixed bottom-10 left-10 flex-col gap-2 items-center z-9999"
        >
            <div className="flex flex-col gap-2 items-center p-2 rounded-2xl border border-white/10 bg-base-200 backdrop-blur-md">
                <div className="flex gap-2 items-center">
                    <div className="opacity-30 transition-opacity hover:opacity-100 cursor-grab active:cursor-grabbing">
                        <LuGripVertical size={20} />
                    </div>

                    <div className="flex gap-2 items-center py-1 px-3 font-mono text-xs font-bold rounded-xl border select-none border-primary/20 bg-primary/20 text-primary">
                        <LuBug size={14} />
                        <span>DEV</span>
                    </div>

                    <div className="m-0 w-1 divider divider-horizontal"></div>

                    {isExpanded && (
                        <div className="flex gap-2 items-center animate-in fade-in zoom-in-95">
                            <button
                                className="gap-2 normal-case btn btn-sm btn-ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleIsEffecting();
                                }}
                            >
                                <LuTerminal size={16} />
                                Toggle Effecting
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

                {isExpanded && (
                    <div className="pb-1 select-none">
                        <span className="font-mono opacity-70 text-[10px]">
                            Effecting:{" "}
                            <span className={isEffecting ? "font-bold text-success" : "text-error"}>
                                {isEffecting ? "ON" : "OFF"}
                            </span>
                        </span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default DevBar;
