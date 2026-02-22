import React, { useState } from "react";
import { LuFileText, LuTrash2 } from "react-icons/lu";

export interface Tab {
    id: string;
    docId: string;
    title: string;
}

export type TabMap = Map<string, Tab>;

export const useTabbedEditor = () => {
    const [activeTabs, setActiveTabs] = useState<TabMap>(new Map());
    const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

    const addTab = (tab: Tab) => {
        if (activeTabs.has(tab.id)) {
            setSelectedTabId(tab.id);
            return;
        }

        setActiveTabs((prev) => {
            const next = new Map(prev);
            next.set(tab.id, tab);
            return next;
        });

        setSelectedTabId(tab.id);
    };

    const removeTab = (tabId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();

        setActiveTabs((prev) => {
            const newTabs = new Map(prev);
            newTabs.delete(tabId);

            if (selectedTabId === tabId) {
                const remainingKeys = Array.from(newTabs.keys());
                if (remainingKeys.length > 0) {
                    setSelectedTabId(remainingKeys[remainingKeys.length - 1]);
                } else {
                    setSelectedTabId(null);
                }
            }
            return newTabs;
        });
    };

    const setActiveTab = (tabId: string) => {
        if (activeTabs.has(tabId)) {
            setSelectedTabId(tabId);
        }
    };

    interface TabbedEditorProps {}

    const TabbedEditor = ({}: TabbedEditorProps) => {
        return (
            <main className="flex overflow-hidden flex-col flex-1 bg-base-300/30">
                <div className="flex flex-col flex-1 p-6 h-full">
                    {/* Zero-State: Placeholder UI when Map is empty */}
                    {activeTabs.size === 0 ? (
                        <div className="flex justify-center items-center w-full h-full border shadow-sm card bg-base-100 border-base-300">
                            <div className="space-y-4 text-center">
                                <div className="inline-block p-6 rounded-full bg-base-200">
                                    <LuFileText size={48} className="opacity-20" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold">Select a document</h3>
                                    <p className="mt-2 text-base-content/60">
                                        Choose a file from the sidebar to start editing.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Active-State: DaisyUI 6 Container Context with ARIA Roles */
                        <div
                            role="tablist"
                            aria-label="Open Documents"
                            className="flex flex-col flex-1 tabs tabs-border"
                        >
                            {/* Tab Headers Container */}
                            <div className="flex overflow-x-auto w-full border-b border-base-300 no-scrollbar">
                                {[...activeTabs.values()].map((tab) => {
                                    const isActive = selectedTabId === tab.id;

                                    return (
                                        <div
                                            key={tab.id}
                                            role="tab"
                                            aria-selected={isActive}
                                            aria-controls={`panel-${tab.id}`}
                                            id={`tab-${tab.id}`}
                                            tabIndex={isActive ? 0 : -1}
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`
                                            tab h-12 transition-colors flex items-center gap-2 group cursor-pointer
                                            ${
                                                isActive
                                                    ? // DaisyUI 6 Explicit Active Modifiers
                                                      "tab-active text-primary font-medium"
                                                    : // Inactive state fading
                                                      "text-base-content/70 hover:text-base-content"
                                            }
                                        `}
                                        >
                                            <span className="select-none truncate max-w-37.5">{tab.title}</span>

                                            {/* Actionable Close Button safely nested in standard div */}
                                            <button
                                                aria-label={`Close ${tab.title}`}
                                                className={`
                                                p-1 rounded-md transition-all duration-200 
                                                hover:bg-base-200 hover:text-error focus:outline-none focus:ring-2 focus:ring-error/50
                                                ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                                            `}
                                                onClick={(e) => removeTab(tab.id, e)}
                                            >
                                                <LuTrash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tab Content Panel Rendering Topologies */}
                            <div className="overflow-auto relative flex-1 bg-base-100">
                                {[...activeTabs.values()].map((tab) => {
                                    const isActive = selectedTabId === tab.id;

                                    return (
                                        <div
                                            key={`panel-${tab.id}`}
                                            role="tabpanel"
                                            id={`panel-${tab.id}`}
                                            aria-labelledby={`tab-${tab.id}`}
                                            className={`
                                            tab-content block w-full h-full p-6 
                                            border-x border-b border-base-300 rounded-b-box shadow-sm
                                            ${isActive ? "block" : "hidden"}
                                        `}
                                        >
                                            {/* Component Injection Point */}
                                            {/* <Canvas documentId={tab.docId} /> */}

                                            <div className="w-full max-w-none prose">
                                                <h2>Viewing Document: {tab.title}</h2>
                                                <p>System Reference ID: {tab.docId}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        );
    };

    return { TabbedEditor, activeTabs, selectedTabId, addTab, removeTab, setActiveTab };
};

export default useTabbedEditor;
