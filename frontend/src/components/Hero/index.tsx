import React, { useCallback, useEffect, useState } from "react";
import {
    LuFileText,
    LuUsers,
    LuZap,
    LuGlobe,
    LuArrowRight,
    LuCode,
    LuWifi,
    LuGitMerge,
    LuBraces,
} from "react-icons/lu";
import { Link, useNavigate } from "react-router-dom";
import uiStore from "../../stores/uiStore";
import { NavBarType } from "../../types";
import mainStore from "../../stores";
import { makeAnonUserIdentity } from "../../utils";
import { useDocuments } from "../../hooks/queries";
import { Styles } from "../fonts";

/* ─── Animated typing cursor ─────────────────────────────────────────── */
const ALICE_LINES = [
    { content: "\\documentclass", type: "cmd" },
    { content: "[12pt]{article}", type: "plain" },
    { content: "\n\\usepackage", type: "cmd" },
    { content: "{amsmath, amssymb}", type: "plain" },
    { content: "\n\\title{", type: "cmd" },
    { content: "Collaborative Editing", type: "accent" },
    { content: "}", type: "plain" },
    { content: "\n\\author{", type: "cmd" },
    { content: "Alice, Bob", type: "accent" },
    { content: "}", type: "plain" },
];

const BOB_LINES = [
    { content: "\n\n\\begin", type: "cmd" },
    { content: "{document}", type: "plain" },
    { content: "\n  \\maketitle", type: "cmd" },
    { content: "\n\n  The Gaussian integral ", type: "plain" },
    { content: "$\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}$", type: "math" },
    { content: ".", type: "plain" },
    { content: "\n\\end", type: "cmd" },
    { content: "{document}", type: "plain" },
];

const COLOR = {
    cmd: "text-primary",
    accent: "text-accent",
    math: "text-secondary",
    plain: "text-base-content/60",
};

const COLLABORATORS = {
    alice: { color: "bg-blue-400", cursorColor: "bg-blue-400", label: "Alice" },
    bob: { color: "bg-pink-400", cursorColor: "bg-pink-400", label: "Bob" },
};

type Segment = { content: string; type: string; author: "alice" | "bob" };

// Interleave lines: Alice types a chunk, then Bob types a chunk, alternating
function buildInterleaved(): { segments: Segment[]; aliceEndIdx: number } {
    const segments: Segment[] = [];
    // Alice types first 5 chunks, then Bob starts
    for (const l of ALICE_LINES) segments.push({ ...l, author: "alice" });
    for (const l of BOB_LINES) segments.push({ ...l, author: "bob" });
    return { segments, aliceEndIdx: ALICE_LINES.length };
}

const { segments } = buildInterleaved();
const TOTAL_CHARS = segments.reduce((s, l) => s + l.content.length, 0);

// Alice finishes typing her sections before Bob starts — track per-author progress
const ALICE_TOTAL = ALICE_LINES.reduce((s, l) => s + l.content.length, 0);
// Bob starts typing at a delay
const BOB_START_DELAY = ALICE_TOTAL * 0.4; // Bob starts when Alice is 40% done

const MockEditor = () => {
    const [tick, setTick] = useState(0); // global char counter

    useEffect(() => {
        if (tick >= TOTAL_CHARS + BOB_START_DELAY) return;
        const t = setTimeout(() => setTick((v) => v + 1), 30);
        return () => clearTimeout(t);
    }, [tick]);

    // Alice progresses at full speed; Bob starts after delay
    const aliceProgress = Math.min(tick, ALICE_TOTAL);
    const bobProgress = Math.max(
        0,
        Math.min(
            tick - BOB_START_DELAY,
            BOB_LINES.reduce((s, l) => s + l.content.length, 0),
        ),
    );

    const renderSegments = (lines: typeof ALICE_LINES, progress: number, author: "alice" | "bob") => {
        let rendered = 0;
        const spans: React.ReactNode[] = [];
        for (const { content, type } of lines) {
            const visible = Math.max(0, Math.min(content.length, progress - rendered));
            const slice = content.slice(0, visible);
            rendered += content.length;
            if (!slice) break;
            spans.push(
                <span key={`${author}-${rendered}`} className={COLOR[type as keyof typeof COLOR]}>
                    {slice}
                </span>,
            );
            if (visible < content.length) break;
        }
        return spans;
    };

    const aliceSpans = renderSegments(ALICE_LINES, aliceProgress, "alice");
    const bobSpans = renderSegments(BOB_LINES, bobProgress, "bob");

    const aliceDone = aliceProgress >= ALICE_TOTAL;
    const bobDone = bobProgress >= BOB_LINES.reduce((s, l) => s + l.content.length, 0);

    return (
        <pre className="overflow-hidden p-6 font-mono text-sm leading-7 whitespace-pre-wrap select-none text-base-content/70">
            {/* Alice's text + cursor */}
            {aliceSpans}
            {!aliceDone && (
                <span className="inline-flex relative items-center">
                    <span className="inline-block h-4 align-middle bg-blue-400 animate-pulse w-[2px]" />
                    <span className="absolute left-0 -top-5 py-0.5 px-1 font-sans font-medium text-white whitespace-nowrap bg-blue-400 rounded text-[9px]">
                        Alice
                    </span>
                </span>
            )}

            {/* Bob's text + cursor */}
            {bobSpans}
            {!bobDone && bobProgress > 0 && (
                <span className="inline-flex relative items-center">
                    <span className="inline-block h-4 align-middle bg-pink-400 animate-pulse w-[2px]" />
                    <span className="absolute left-0 -top-5 py-0.5 px-1 font-sans font-medium text-white whitespace-nowrap bg-pink-400 rounded text-[9px]">
                        Bob
                    </span>
                </span>
            )}
        </pre>
    );
};

const Mockup = () => {
    return (
        <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-4 rounded-2xl pointer-events-none bg-primary/5 blur-2xl" />

            <div className="overflow-hidden relative rounded-xl border shadow-2xl border-base-300 bg-base-200">
                {/* Window chrome */}
                <div className="flex gap-2 items-center py-3 px-4 border-b bg-base-300 border-base-300/60">
                    <div className="w-3 h-3 rounded-full bg-error/60" />
                    <div className="w-3 h-3 rounded-full bg-warning/60" />
                    <div className="w-3 h-3 rounded-full bg-success/60" />
                    <span className="ml-3 font-mono text-xs text-base-content/40">main.tex</span>
                    <div className="flex gap-3 items-center ml-auto">
                        {/* Simulated remote cursors */}
                        <div className="flex -space-x-1">
                            {["bg-blue-400", "bg-pink-400"].map((c, i) => (
                                <div
                                    key={i}
                                    className={`w-5 h-5 rounded-full border-2 border-base-300 ${c} opacity-80`}
                                />
                            ))}
                        </div>
                        <div className="gap-1 font-mono badge badge-success badge-xs">
                            <span className="w-1 h-1 rounded-full animate-pulse bg-success-content" />2 online
                        </div>
                    </div>
                </div>

                {/* Animated code */}
                <MockEditor />

                {/* Status bar */}
                <div className="flex justify-between items-center py-1.5 px-4 font-mono border-t bg-primary/10 border-base-300/40 text-[10px] text-base-content/40">
                    <span>Fugue CRDT · synced</span>
                    <span>LaTeX · UTF-8</span>
                </div>
            </div>
        </div>
    );
};

/* ─── Hero ────────────────────────────────────────────────────────────── */
const Hero = () => {
    const nav = useNavigate();
    const { mutations } = useDocuments();
    const { createDocumentMutation } = mutations;
    const setNavBarType = uiStore((state) => state.setNavBarType);
    const setAnonUserIdentity = mainStore((state) => state.setAnonUserIdentity);
    const anonUserIdentity = mainStore((state) => state.anonUserIdentity);

    const handleTryAnon = useCallback(async () => {
        if (!anonUserIdentity) setAnonUserIdentity(makeAnonUserIdentity());
        const res = await createDocumentMutation.mutateAsync(undefined);
        nav(`/docs/${res.data._id}`);
    }, [anonUserIdentity, createDocumentMutation, nav, setAnonUserIdentity]);

    useEffect(() => {
        setNavBarType(NavBarType.HERO);
        return () => setNavBarType(NavBarType.UNSPECIFIED);
    }, [setNavBarType]);

    return (
        <div className="overflow-x-hidden min-h-screen bg-base-100">
            {/* Noise */}
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    backgroundSize: "200px 200px",
                }}
            />

            {/* ── Hero section ── */}
            <section className="grid relative z-10 grid-cols-1 gap-12 items-center py-24 px-6 mx-auto max-w-7xl min-h-screen lg:grid-cols-2">
                {/* Left: copy */}
                <div className="flex flex-col items-start">
                    <h1
                        className="mb-6 text-6xl font-bold tracking-tight lg:text-7xl text-base-content leading-[0.92]"
                        style={Styles.headings}
                    >
                        Bragi
                        <span className="block mt-3 text-3xl font-normal tracking-normal leading-snug lg:text-4xl text-base-content/50">
                            Collaborative LaTeX editing,
                            <br />
                            <span className="font-semibold text-primary">conflict-free</span> by design.
                        </span>
                    </h1>

                    <p
                        className="mb-8 max-w-lg text-base leading-relaxed lg:text-lg text-base-content/60"
                        style={Styles.body}
                    >
                        Built on the <span className="font-medium text-base-content/80">Fugue CRDT</span> — a sequence
                        CRDT that minimises interleaving in concurrent edits. Multiple authors, one document, strong
                        eventual consistency.
                    </p>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Link to="/sign-up" className="gap-2 px-8 btn btn-primary btn-lg">
                            Get started
                            <LuArrowRight />
                        </Link>
                        <button onClick={handleTryAnon} className="gap-2 btn btn-ghost btn-lg">
                            <LuFileText />
                            Try anonymously
                        </button>
                    </div>

                    {/* Trust bar */}
                    <div className="flex flex-wrap gap-4 mt-10 font-mono text-xs tracking-widest uppercase text-base-content/40">
                        {["Fugue CRDT", "Tree-sitter AST", "WebSocket sync", "LaTeX-aware"].map((t) => (
                            <span key={t} className="flex gap-1.5 items-center">
                                <span className="w-1 h-1 rounded-full bg-primary/60" />
                                {t}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Right: editor mockup */}
                <Mockup />
            </section>

            {/* ── How it works ── */}
            <section className="relative z-10 py-24 px-6 bg-base-200/50 border-y border-base-300">
                <div className="mx-auto max-w-5xl">
                    <p className="mb-2 font-mono text-xs tracking-widest text-center uppercase text-base-content/30">
                        How it works
                    </p>
                    <h2 className="mb-12 text-3xl font-bold text-center text-base-content" style={Styles.headings}>
                        Strong Eventual Consistency, in practice
                    </h2>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {[
                            {
                                step: "01",
                                icon: <LuBraces className="w-5 h-5" />,
                                title: "Edit locally, instantly",
                                desc: "Every keystroke is applied to your local Fugue tree replica immediately — zero latency, even offline. Operations are queued for broadcast.",
                            },
                            {
                                step: "02",
                                icon: <LuGitMerge className="w-5 h-5" />,
                                title: "Converge automatically",
                                desc: "The Fugue CRDT guarantees that all replicas seeing the same set of operations arrive at identical document states, regardless of arrival order.",
                            },
                            {
                                step: "03",
                                icon: <LuZap className="w-5 h-5" />,
                                title: "Compile & preview",
                                desc: "Hit recompile to render your document to PDF via LaTeXLite — full texlive support, no local TeX installation required.",
                            },
                        ].map(({ step, icon, title, desc }) => (
                            <div
                                key={step}
                                className="transition-colors duration-300 card card-border bg-base-100 hover:border-primary/40"
                            >
                                <div className="gap-4 card-body">
                                    <div className="flex justify-between items-center">
                                        <div className="flex justify-center items-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
                                            {icon}
                                        </div>
                                        <span className="font-mono text-3xl font-bold text-base-content/10">
                                            {step}
                                        </span>
                                    </div>
                                    <h3 className="text-sm card-title" style={Styles.headings}>
                                        {title}
                                    </h3>
                                    <p style={Styles.body} className="text-sm leading-relaxed text-base-content/55">
                                        {desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="relative z-10 py-24 px-6">
                <div className="mx-auto max-w-5xl">
                    <p className="mb-2 font-mono text-xs tracking-widest text-center uppercase text-base-content/30">
                        Features
                    </p>
                    <h2 className="mb-12 text-3xl font-bold text-center text-base-content" style={Styles.headings}>
                        Built for LaTeX, not adapted for it
                    </h2>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                icon: <LuUsers className="w-5 h-5" />,
                                title: "Up to 10 simultaneous editors",
                                desc: "Designed for small teams — research groups, co-authors, student teams. Each user gets their own CRDT replica with real-time cursor visibility.",
                            },
                            {
                                icon: <LuCode className="w-5 h-5" />,
                                title: "Tree-sitter AST parsing",
                                desc: "Syntax-aware editing powered by a WebAssembly Tree-sitter LaTeX parser.",
                            },
                            {
                                icon: <LuZap className="w-5 h-5" />,
                                title: "On-demand PDF preview",
                                desc: "Compile your document to PDF via LaTeXLite with a single click. Full texlive-full support, including tikz, amsmath, and most CTAN packages.",
                            },
                            {
                                icon: <LuFileText className="w-5 h-5" />,
                                title: "Multi-file projects",
                                desc: "Organise your work into projects with independent per-file CRDT buffers.",
                            },
                            {
                                icon: <LuGitMerge className="w-5 h-5" />,
                                title: "No OT complexity",
                                desc: "Unlike Operational Transform, the Fugue CRDT requires no central arbitration. Concurrent edits commute — convergence is a mathematical guarantee.",
                            },
                            {
                                icon: <LuWifi className="w-5 h-5" />,
                                title: "Real-time propagation",
                                desc: "Changes are broadcast over WebSockets and applied to all connected replicas with a target end-to-end latency of under 200ms.",
                            },
                        ].map(({ icon, title, desc }) => (
                            <div
                                key={title}
                                className="transition-colors duration-300 card card-border bg-base-200 hover:border-primary/40"
                            >
                                <div className="gap-3 card-body">
                                    <div className="flex justify-center items-center w-9 h-9 rounded-lg bg-primary/10 text-primary">
                                        {icon}
                                    </div>
                                    <h3 className="text-sm card-title" style={Styles.headings}>
                                        {title}
                                    </h3>
                                    <p style={Styles.body} className="text-sm leading-relaxed text-base-content/55">
                                        {desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Academic context ── */}
            <section className="relative z-10 py-16 px-6 bg-base-200/40 border-y border-base-300">
                <div className="mx-auto max-w-3xl text-center">
                    <div className="text-xl italic leading-relaxed text-base-content/50" style={Styles.academic}>
                        "CRDTs provide an efficient, scalable foundation for collaborative development tools — allowing
                        concurrent edits to converge correctly without coordination, rollback, or explicit conflict
                        resolution."
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="relative z-10 py-24 px-6">
                <div className="mx-auto max-w-2xl text-center">
                    <div className="shadow-2xl card bg-primary text-primary-content">
                        <div className="items-center py-12 px-10 text-center card-body">
                            <h2 className="mb-3 text-4xl font-bold leading-tight" style={Styles.headings}>
                                Ready to write together?
                            </h2>
                            <p className="mb-8 max-w-sm text-base leading-relaxed text-primary-content/70">
                                No TeX installation. No merge conflicts. Open a document and start collaborating in
                                seconds.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link
                                    to="/sign-up"
                                    className="gap-2 border-none btn bg-primary-content text-primary btn-lg hover:bg-primary-content/90"
                                >
                                    Create an account
                                    <LuArrowRight />
                                </Link>
                                <button
                                    onClick={handleTryAnon}
                                    className="gap-2 btn btn-outline border-primary-content/40 text-primary-content btn-lg hover:bg-primary-content/10 hover:border-primary-content"
                                >
                                    <LuGlobe />
                                    Try without signing in
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="flex relative z-10 flex-col gap-2 justify-between items-center py-8 px-6 font-mono text-xs border-t sm:flex-row border-base-300 text-base-content/30">
                <span>{new Date().getFullYear()} Bragi — Collaborative LaTeX editing</span>
                <span className="tracking-widest uppercase">Madiba Hudson-Quansah · Tanitoluwa Olamiji Adebayo</span>
            </footer>
        </div>
    );
};

export default Hero;
