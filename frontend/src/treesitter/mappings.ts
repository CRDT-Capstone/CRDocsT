import { tags as t, Tag } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";

// Tokyo Night colour palette
const TN = {
    blue: "#7aa2f7", // macros, functions
    purple: "#bb9af7", // keywords, headings
    cyan: "#7dcfff", // properties, labels, links, operators
    green: "#9ece6a", // strings, math, paths
    orange: "#ff9e64", // escape sequences
    red: "#f7768e", // bold / strong
    yellow: "#e0af68", // environments (\begin, \end)
    fg: "#c0caf5", // plain variables / foreground text
    fgDim: "#a9b1d6", // punctuation / brackets — intentionally muted
    comment: "#565f89", // comments / meta — very muted
    bg: "#1a1b26", // editor background
} as const;

const TagMap: Record<string, Tag> = {
    function: t.function(t.variableName),
    "function.macro": t.macroName,

    variable: t.variableName,
    "variable.parameter": t.propertyName,
    constant: t.constant(t.variableName),

    module: t.namespace,
    label: t.labelName,

    keyword: t.keyword,
    "keyword.import": t.processingInstruction,
    "keyword.conditional": t.controlKeyword,

    operator: t.operator,
    "punctuation.delimiter": t.punctuation,
    "punctuation.bracket": t.bracket,
    "punctuation.special": t.special(t.punctuation),

    "markup.italic": t.emphasis,
    "markup.strong": t.strong,
    "markup.link": t.link,
    "markup.link.url": t.url,
    "markup.math": t.special(t.number),
    "markup.heading": t.heading,
    "markup.heading.1": t.heading1,
    "markup.heading.2": t.heading2,
    "markup.heading.3": t.heading3,
    "markup.heading.4": t.heading4,
    "markup.heading.5": t.heading5,
    "markup.heading.6": t.heading6,

    string: t.string,
    "string.regexp": t.regexp,
    "string.special.path": t.special(t.string),

    comment: t.lineComment,

    spell: t.content,
    nospell: t.comment,
    none: t.null,
};

export const latexHighlightStyle = HighlightStyle.define([
    { tag: t.function(t.variableName), color: TN.blue }, // \anyCommand
    { tag: t.macroName, color: TN.blue, fontWeight: "bold" }, // \newcommand

    { tag: t.variableName, color: TN.fg }, // counter words, placeholders
    { tag: t.propertyName, color: TN.cyan, fontStyle: "italic" }, // key=value keys
    { tag: t.constant(t.variableName), color: TN.orange }, // value literals

    { tag: t.namespace, color: TN.yellow }, // \begin / \end
    { tag: t.labelName, color: TN.cyan, textDecoration: "underline" }, // \label{} \ref{}

    { tag: t.keyword, color: TN.purple, fontWeight: "bold" },
    { tag: t.controlKeyword, color: TN.purple, fontStyle: "italic" }, // \if \else \fi
    { tag: t.processingInstruction, color: TN.purple }, // \usepackage

    { tag: t.operator, color: TN.cyan },
    { tag: [t.punctuation, t.bracket], color: TN.fgDim }, // muted — structural noise
    { tag: t.special(t.punctuation), color: TN.cyan, fontWeight: "bold" }, // \item

    { tag: t.emphasis, fontStyle: "italic" }, // \emph, \textit
    { tag: t.strong, fontWeight: "bold", color: TN.red }, // \textbf
    { tag: t.link, color: TN.cyan, textDecoration: "underline" },
    { tag: t.url, color: TN.cyan, fontStyle: "italic" },
    { tag: t.special(t.number), color: TN.green }, // math $…$

    { tag: t.heading1, color: TN.purple, fontWeight: "bold" },
    { tag: t.heading2, color: TN.purple, fontWeight: "bold" },
    { tag: t.heading3, color: TN.purple, fontWeight: "bold" },
    { tag: t.heading4, color: TN.purple, fontWeight: "bold" },
    { tag: t.heading5, color: TN.purple },
    { tag: t.heading6, color: TN.purple, fontStyle: "italic" },
    { tag: t.heading, color: TN.purple, fontWeight: "bold" }, // Beamer \frametitle fallback

    { tag: t.string, color: TN.green }, // package / bib names
    { tag: t.regexp, color: TN.green }, // glob patterns
    { tag: t.special(t.string), color: TN.green, fontStyle: "italic" }, // file paths

    { tag: t.lineComment, color: TN.comment, fontStyle: "italic" },
]);

export default TagMap;
