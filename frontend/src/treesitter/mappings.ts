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
    // --- General Syntax ---
    { tag: t.keyword, color: "#c678dd", fontWeight: "bold" },
    { tag: t.controlKeyword, color: "#c678dd", fontStyle: "italic" }, // \if, \else
    { tag: t.function(t.variableName), color: "#61afef" },
    { tag: t.macroName, color: "#d19a66" }, // \newcommand, etc.
    { tag: t.variableName, color: "#e06c75" },
    { tag: t.propertyName, color: "#d19a66" }, // key-value parameters
    { tag: t.namespace, color: "#61afef", fontWeight: "bold" }, // \begin{env}
    { tag: t.constant(t.variableName), color: "#d19a66" },
    { tag: t.labelName, color: "#e5c07b" },

    // --- Markup & Formatting ---
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strong, fontWeight: "bold" },
    { tag: t.link, color: "#61afef", textDecoration: "underline" },
    { tag: t.url, color: "#56b6c2" },
    { tag: t.special(t.number), color: "#d19a66" }, // Math mode ($...$)

    // --- Headings ---
    { tag: t.heading1, color: "#e06c75", fontWeight: "bold", fontSize: "1.6em" },
    { tag: t.heading2, color: "#e06c75", fontWeight: "bold", fontSize: "1.4em" },
    { tag: t.heading3, color: "#e06c75", fontWeight: "bold", fontSize: "1.25em" },
    { tag: t.heading4, color: "#e06c75", fontWeight: "bold", fontSize: "1.15em" },
    { tag: t.heading5, color: "#e06c75", fontWeight: "bold" },
    { tag: t.heading6, color: "#e06c75", fontStyle: "italic" },

    // --- Punctuation & Operators ---
    { tag: t.punctuation, color: "#abb2bf" },
    { tag: t.bracket, color: "#abb2bf" },
    { tag: t.special(t.punctuation), color: "#c678dd", fontWeight: "bold" }, // \item
    { tag: t.operator, color: "#56b6c2" },

    // --- Strings & Paths ---
    { tag: t.string, color: "#98c379" },
    { tag: t.regexp, color: "#98c379" },
    { tag: t.special(t.string), color: "#98c379", fontStyle: "italic" }, // Paths

    // --- Meta & Comments ---
    { tag: t.lineComment, color: "#7f848e", fontStyle: "italic" },
    { tag: t.processingInstruction, color: "#56b6c2" }, // \usepackage
    { tag: t.meta, color: "#7f848e" }, // Magic comments & nospell nodes
    { tag: t.null, color: "inherit" }, // none
]);

export default TagMap;
