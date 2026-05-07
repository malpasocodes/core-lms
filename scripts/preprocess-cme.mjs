#!/usr/bin/env node
/**
 * Preprocess Project Gutenberg ebook #33283 (Calculus Made Easy) for pandoc.
 *
 * Strips the original LaTeX preamble (full of MiKTeX-specific macros that
 * pandoc cannot evaluate) and rewrites the custom chapter/section macros to
 * standard `\chapter` / `\section` so pandoc can produce clean section-divs.
 *
 * Usage: node scripts/preprocess-cme.mjs <input.tex> <output.tex>
 */

import { readFileSync, writeFileSync } from "fs";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: preprocess-cme.mjs <input.tex> <output.tex>");
  process.exit(1);
}

const raw = readFileSync(inPath, "utf-8");

const beginIdx = raw.indexOf("\\begin{document}");
const endIdx = raw.indexOf("\\end{document}");
if (beginIdx < 0 || endIdx < 0) {
  console.error("Could not locate \\begin{document} or \\end{document}");
  process.exit(1);
}

let body = raw.slice(beginIdx + "\\begin{document}".length, endIdx);

// ── Drop everything before the first real chapter (front matter cruft) ──
// Keep from `\frontmatter` onward, but drop title page boxes etc.
const fm = body.indexOf("\\frontmatter");
if (fm >= 0) body = body.slice(fm);

// ── Strip publishing-note macros ─────────────────────────────────────────
//   \DPtypo{orig}{fixed}  → fixed
//   \DPchg{orig}{fixed}   → fixed
//   \DPnote{...}          → (drop)
//   \DPPageSep{...}{...}  → (drop)
body = body.replace(/\\DPtypo\{[^{}]*\}\{([^{}]*)\}/g, "$1");
body = body.replace(/\\DPchg\{[^{}]*\}\{([^{}]*)\}/g, "$1");
body = body.replace(/\\DPnote\{[^{}]*\}/g, "");
body = body.replace(/\\DPPageSep\{[^{}]*\}\{[^{}]*\}/g, "");

// ── Comment-only lines (not inside math/escaped) ────────────────────────
// Strip lines that are entirely comments. Be conservative.
body = body.replace(/^[ \t]*%[^\n]*\n/gm, "");

// ── Front-matter / page-style commands pandoc cannot use ───────────────
const dropTokens = [
  "\\listfiles",
  "\\flushpage",
  "\\frontmatter",
  "\\mainmatter",
  "\\backmatter",
  "\\thispagestyle",
  "\\pagestyle",
  "\\pagenumbering",
  "\\fancyhf",
  "\\cleardoublepage",
  "\\clearpage",
  "\\newpage",
  "\\phantomsection",
  "\\enlargethispage",
  "\\loosen",
  "\\bigskip",
  "\\medskip",
  "\\smallskip",
  "\\noindent",
  "\\centering",
  "\\raggedright",
  "\\raggedleft",
  "\\null",
  "\\hfil",
  "\\hfill",
  "\\vfil",
  "\\vfill",
  "\\displaystyle",
  "\\normalfont",
  "\\normalsize",
  "\\Huge",
  "\\Large",
  "\\large",
  "\\small",
  "\\scriptsize",
  "\\tiny",
  "\\footnotesize",
];
for (const tok of dropTokens) {
  // Use word-boundary-ish: \tok not followed by a letter
  const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped + "(?![A-Za-z])", "g");
  body = body.replace(re, "");
}

// ── Strip commands with one-or-more arg patterns we don't want ─────────
// \pdfbookmark[lvl]{anchor}{display}
body = body.replace(/\\pdfbookmark(?:\[[^\]]*\])?\{[^{}]*\}\{[^{}]*\}/g, "");
// \SetOddHead{...}, \SetBox{...}
body = body.replace(/\\SetOddHead\{[^{}]*\}/g, "");
body = body.replace(/\\SetBox\{[^{}]*\}/g, "");
body = body.replace(/\\SetBothHeads\{[^{}]*\}/g, "");
// \label{...}, \pageref{...} → drop
body = body.replace(/\\label\{[^{}]*\}/g, "");
body = body.replace(/\\pageref\{[^{}]*\}/g, "");
// \hyperref[anchor]{text} → text
body = body.replace(/\\hyperref\[[^\]]*\]\{([^{}]*)\}/g, "$1");
// \pdfbookmark[…]{…}{…} already handled
// \vspace{…}, \setlength{…}{…}, \settowidth{…}{…}
body = body.replace(/\\vspace\*?\{[^{}]*\}/g, "");
body = body.replace(/\\setlength\{[^{}]*\}\{[^{}]*\}/g, "");
body = body.replace(/\\settowidth\{[^{}]*\}\{[^{}]*\}/g, "");
body = body.replace(/\\addtocontents\{[^{}]*\}\{[^{}]*\}/g, "");

// ── Image macros: drop entirely ───────────────────────────────────────
body = body.replace(/\\Graphic(?:\[[^\]]*\])?\{[^{}]*\}/g, "");
body = body.replace(/\\includegraphics(?:\[[^\]]*\])?\{[^{}]*\}/g, "");
body = body.replace(
  /\\Figure(?:\[[^\]]*\])?\{[^{}]*\}\{[^{}]*\}/g,
  ""
);
body = body.replace(
  /\\Figures(?:\[[^\]]*\])?\{[^{}]*\}\{[^{}]*\}\{[^{}]*\}\{[^{}]*\}/g,
  ""
);
// figure environments — drop entirely (they contain only images / captions)
body = body.replace(
  /\\begin\{figure\}[\s\S]*?\\end\{figure\}/g,
  ""
);
body = body.replace(
  /\\begin\{wrapfigure\}[\s\S]*?\\end\{wrapfigure\}/g,
  ""
);

// ── Cross-references → plain text ─────────────────────────────────────
body = body.replace(/\\Fig\{([^{}]*)\}/g, "Fig. $1");
body = body.replace(/\\Figs\{([^{}]*)\}\{([^{}]*)\}\{([^{}]*)\}/g, "Figs. $1 $2 $3");
body = body.replace(/\\Pageref(?:\[[^\]]*\])?\{[^{}]*\}/g, "");
body = body.replace(/\\Pagerange\{[^{}]*\}\{[^{}]*\}/g, "");
body = body.replace(/\\Pagelabel\{[^{}]*\}/g, "");

// ── Custom text macros → plain expansion ──────────────────────────────
body = body.replace(/\\First\{([^{}]*)\}/g, "$1");
body = body.replace(/\\NB\b/g, "*N.B.*");
body = body.replace(/\\IE\b/g, "*i.e.*");
body = body.replace(/\\tb(?:\[[^\]]*\])?/g, "\n\n* * *\n\n");
body = body.replace(/\\TNote\{[^{}]*\}/g, "");
body = body.replace(/\\TransNoteText/g, "");
body = body.replace(/\\Z\b/g, " ");
body = body.replace(/\\(?:DStrut|Strut)\b/g, "");

// ── Sectioning macros → standard LaTeX ────────────────────────────────
// \Chapter[short]{NUM}{TITLE}  — handle multi-line
// strategy: collapse to a single line, then regex match
body = body.replace(
  /\\Chapter\s*(?:\[([^\]]*)\])?\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,
  (_m, _short, num, title) => `\\chapter{${title.trim()}}`
);
// \AltChapter[short]{TITLE}
body = body.replace(
  /\\AltChapter\s*(?:\[([^\]]*)\])?\s*\{([^{}]+)\}/g,
  (_m, _short, title) => `\\chapter*{${title.trim()}}`
);
// \ChapterStar[short]{TITLE}
body = body.replace(
  /\\ChapterStar\s*(?:\[([^\]]*)\])?\s*\{([^{}]+)\}/g,
  (_m, _short, title) => `\\chapter*{${title.trim()}}`
);
// \Section[short]{TITLE}
body = body.replace(
  /\\Section\s*(?:\[([^\]]*)\])?\s*\{([^{}]+(?:\{[^{}]*\}[^{}]*)*)\}/g,
  (_m, _short, title) => `\\section{${title.trim()}}`
);
// \Subsection{TITLE}
body = body.replace(/\\Subsection\{([^{}]+)\}/g, "\\subsection{$1}");
// \Paragraph{TITLE}
body = body.replace(/\\Paragraph\{([^{}]+)\}/g, "\\paragraph{$1}");
// \Note{TITLE} → bold heading
body = body.replace(/\\Note\{([^{}]+)\}/g, "\n\n\\textbf{$1}\n\n");
// \Case{X} → italic case label
body = body.replace(/\\Case\{([^{}]+)\}/g, "\n\n\\textit{Case $1.}\n\n");

// ── Math operator helpers — pandoc handles \frac etc; just keep \efrac → \frac, \dfrac → \frac, \tfrac → \frac
body = body.replace(/\\efrac\b/g, "\\frac");
// \dfrac and \tfrac are valid in pandoc/MathJax; leave them.
// \ds → \displaystyle (used inside math)
body = body.replace(/\\ds\b/g, "\\displaystyle");
// \BindMath{...} → just contents (binds math to text)
body = body.replace(/\\BindMath\{([^{}]+)\}/g, "$1");

// ── Front-matter typographic macros ───────────────────────────────────
body = body.replace(/\\Title\{([^{}]+)\}/g, "$1");
body = body.replace(/\\Author\{([^{}]+)\}/g, "$1");
body = body.replace(/\\Book\{([^{}]+)\}/g, "$1\n\n");
body = body.replace(/\\PadTo(?:\[[^\]]*\])?\{[^{}]*\}\{([^{}]*)\}/g, "$1");
body = body.replace(/\\License/g, "");

// ── Table of contents (pandoc generates its own from headings) ────────
body = body.replace(/\\tableofcontents/g, "");

// ── Final cleanup of stray empty groups ───────────────────────────────
body = body.replace(/\{\s*\}/g, "");

// ── Minimal preamble that pandoc can parse cleanly ────────────────────
const preamble = `\\documentclass{book}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\providecommand{\\Catalogue}[1]{}
\\providecommand{\\Corrections}{}
\\providecommand{\\Item}[2][]{\\item #2}
\\providecommand{\\Example}[1][Example]{\\paragraph{#1.}}
\\providecommand{\\Examples}[1][Examples]{\\paragraph{#1.}}
\\providecommand{\\Exercises}[1][Exercises]{\\paragraph{#1.}}
\\providecommand{\\ColumnHead}[1]{\\textbf{#1}}
\\providecommand{\\Td}[1]{#1}
\\providecommand{\\MySkip}{}
\\providecommand{\\CancelMathSkip}{}
\\providecommand{\\ResetCols}{}
\\providecommand{\\TmpColA}{}
\\providecommand{\\TmpColB}{}
\\providecommand{\\TmpLen}{}
\\providecommand{\\Z}{ }
\\providecommand{\\arccos}{\\operatorname{arccos}}
\\providecommand{\\arcsin}{\\operatorname{arcsin}}
\\providecommand{\\arctan}{\\operatorname{arctan}}
\\providecommand{\\arcsec}{\\operatorname{arcsec}}
\\providecommand{\\cosec}{\\operatorname{cosec}}
\\providecommand{\\cotan}{\\operatorname{cot}}
\\providecommand{\\sech}{\\operatorname{sech}}
\\providecommand{\\sinh}{\\operatorname{sinh}}
\\providecommand{\\cosh}{\\operatorname{cosh}}
\\providecommand{\\tanh}{\\operatorname{tanh}}
`;

const out = `${preamble}\n\\begin{document}\n${body}\n\\end{document}\n`;
writeFileSync(outPath, out);
console.log(`Wrote ${out.length.toLocaleString()} chars to ${outPath}`);
