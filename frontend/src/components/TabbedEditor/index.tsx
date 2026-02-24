import React, { useState, memo, useCallback } from "react";
import { LuFileText, LuTrash2 } from "react-icons/lu";
import Canvas from "../Canvas";
import { Tab, TabMap } from "../../types";
import uiStore from "../../stores/uiStore";

interface TabbedEditorProps {}

const TabbedEditor = ({}: TabbedEditorProps) => {
    const activeTabs = uiStore((state) => state.activeTabs);
    const removeTab = uiStore((state) => state.removeTab);
    const selectedTabId = uiStore((state) => state.selectedTabId);
    const setSelectedTab = uiStore((state) => state.setSelectedTab);

    const handleClick = useCallback(
        (tab: Tab) => {
            setSelectedTab(tab.id);
        },
        [setSelectedTab],
    );

    const handleRemoveTab = useCallback(
        (tabId: string, e: React.MouseEvent) => {
            e.stopPropagation();
            removeTab(tabId);
        },
        [removeTab],
    );

    const MemoizedTrash = memo(LuTrash2);

    return (
        <main className="flex overflow-hidden flex-col flex-1 bg-base-300/30">
            <div className="flex flex-col flex-1 h-full">
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
                    <div role="tablist" aria-label="Open Documents" className="flex flex-col flex-1 tabs tabs-border">
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
                                        onClick={(e) => handleClick(tab)}
                                        className={`
                                            tab h-12 transition-colors flex items-center gap-2 group cursor-pointer
                                            ${
                                                isActive
                                                    ? "tab-active text-primary font-medium"
                                                    : "text-base-content/70 hover:text-base-content"
                                            }
                                        `}
                                    >
                                        <span className="select-none truncate max-w-37.5">{tab.title}</span>

                                        <button
                                            aria-label={`Close ${tab.title}`}
                                            className={`
                                                p-1 rounded-md transition-all duration-200 
                                                hover:bg-base-200 hover:text-error focus:outline-none focus:ring-2 focus:ring-error/50
                                                ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                                            `}
                                            onClick={(e) => handleRemoveTab(tab.id, e)}
                                        >
                                            <MemoizedTrash size={16} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="overflow-auto relative flex-1 bg-base-100">
                            {selectedTabId && activeTabs.has(selectedTabId) && (
                                <div
                                    key={`panel-${selectedTabId}`}
                                    role="tabpanel"
                                    id={`panel-${selectedTabId}`}
                                    aria-labelledby={`tab-${selectedTabId}`}
                                    className="block w-full h-full border-b shadow-sm tab-content border-x border-base-300 rounded-b-box"
                                >
                                    <Canvas documentId={activeTabs.get(selectedTabId)!.docId} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default memo(TabbedEditor);
