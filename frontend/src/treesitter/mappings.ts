import { tags as t, Tag } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";

const TagMap: Record<string, Tag> = {
    // --- General Syntax ---
    function: t.function(t.variableName),
    "function.macro": t.macroName,
    variable: t.variableName,
    "variable.parameter": t.propertyName,
    constant: t.constant(t.variableName),
    operator: t.operator,
    module: t.namespace, // Used for \begin and \end environments
    label: t.labelName,

    // --- Punctuation ---
    "punctuation.delimiter": t.punctuation,
    "punctuation.bracket": t.bracket,
    "punctuation.special": t.special(t.punctuation), // specifically for \item

    // --- Markup & Formatting ---
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

    // --- Keywords & Directives ---
    keyword: t.keyword,
    "keyword.import": t.processingInstruction, // For \usepackage, \include, etc.
    "keyword.conditional": t.controlKeyword, // For \if, \else, \fi
    "keyword.directive": t.meta, // For %% !TeX magic comments

    // --- Strings & Paths ---
    string: t.string,
    "string.regexp": t.regexp,
    "string.special.path": t.special(t.string),

    // --- Comments & Meta ---
    comment: t.lineComment,
    spell: t.content, // Custom tag or standard content
    nospell: t.meta, // Marks nodes where spellcheck should be disabled
    none: t.null, // Explicitly no highlighting
};

export const latexHighlightStyle = HighlightStyle.define([
    // --- Core Keywords & Macros ---
    { tag: t.keyword, color: "#bb9af7", fontWeight: "bold" },
    { tag: t.controlKeyword, color: "#bb9af7", fontStyle: "italic" }, // \if, \else
    { tag: t.function(t.variableName), color: "#7aa2f7" }, // Standard macros
    { tag: t.macroName, color: "#7aa2f7", fontWeight: "bold" }, // \newcommand
    { tag: t.escape, color: "#ff9e64", fontWeight: "bold" }, // Escaped chars like \%, \&, \$ (Orange)

    // --- Environments & Namespaces ---
    // Grouped namespace, class, and tag to catch all variations of \begin{env}
    { tag: [t.namespace, t.className, t.tagName], color: "#e0af68" },

    // --- Variables, Arguments & Properties ---
    { tag: t.variableName, color: "#c0caf5" }, // Foreground Text
    { tag: t.propertyName, color: "#7dcfff", fontStyle: "italic" }, // Key-value params [key=value]
    { tag: t.labelName, color: "#7dcfff", textDecoration: "underline" }, // \label{} and \ref{}

    // --- Math Mode ---
    { tag: t.special(t.number), color: "#9ece6a" }, // Math mode delimiters $...$
    { tag: t.arithmeticOperator, color: "#89ddff" }, // +, -, =, etc.
    { tag: t.number, color: "#ff9e64" }, // Numbers (Orange)

    // --- Markup & Formatting ---
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strong, fontWeight: "bold", color: "#f7768e" }, // Tokyo Night Red
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: t.link, color: "#7dcfff", textDecoration: "underline" }, // Cyan
    { tag: t.url, color: "#7dcfff", fontStyle: "italic" },

    // --- Headings ---
    // Tokyo Night typically uses Blue or Purple for markdown headings. Using Purple here to stand out.
    { tag: t.heading1, color: "#bb9af7", fontWeight: "bold", fontSize: "1.6em" },
    { tag: t.heading2, color: "#bb9af7", fontWeight: "bold", fontSize: "1.4em" },
    { tag: t.heading3, color: "#bb9af7", fontWeight: "bold", fontSize: "1.25em" },
    { tag: t.heading4, color: "#bb9af7", fontWeight: "bold", fontSize: "1.15em" },
    { tag: t.heading5, color: "#bb9af7", fontWeight: "bold" },
    { tag: t.heading6, color: "#bb9af7", fontStyle: "italic" },
    { tag: t.heading, color: "#bb9af7", fontWeight: "bold" }, // Catch-all fallback

    // --- Punctuation & Operators ---
    { tag: [t.punctuation, t.bracket, t.separator], color: "#a9b1d6" }, // Dimmer Foreground
    { tag: t.special(t.punctuation), color: "#89ddff", fontWeight: "bold" }, // \item
    { tag: t.operator, color: "#89ddff" }, // Light Cyan

    // --- Strings & Paths ---
    { tag: t.string, color: "#9ece6a" }, // Tokyo Night Green
    { tag: t.regexp, color: "#9ece6a" },
    { tag: t.special(t.string), color: "#9ece6a", fontStyle: "italic" }, // Paths in \includegraphics

    // --- Meta, Comments & Errors ---
    { tag: t.lineComment, color: "#565f89", fontStyle: "italic" }, // Tokyo Night Comment Grey
    { tag: t.blockComment, color: "#565f89", fontStyle: "italic" },
    { tag: t.processingInstruction, color: "#bb9af7" }, // \usepackage
    { tag: t.meta, color: "#565f89" }, // Magic comments
    { tag: t.invalid, color: "#1a1b26", backgroundColor: "#f7768e" }, // Red bg, dark bg text for contrast
]);

export default TagMap;
