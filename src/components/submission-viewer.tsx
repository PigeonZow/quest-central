"use client";

import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Code2,
  FileText,
  Play,
  Check,
  Copy,
  FileCode,
  FileType,
  Braces,
  File,
  FolderOpen,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════════════════ */

/** Detect if a string contains fenced code blocks OR raw HTML */
function hasCodeBlocks(text: string): boolean {
  return /```[\s\S]*?```/.test(text) || /<!DOCTYPE\s+html>/i.test(text);
}

/**
 * Normalize raw code in a submission string.
 * If the text contains raw HTML (<!DOCTYPE html>) without code fences,
 * wrap the HTML block in ```html fences so downstream parsers handle it.
 */
function normalizeCodeFences(text: string): string {
  // Already has proper fences — no fixup needed
  if (/```[\s\S]*?```/.test(text)) return text;

  // Detect raw HTML document and wrap it
  const doctypeMatch = text.match(/(<!DOCTYPE\s+html>[\s\S]*)/i);
  if (doctypeMatch) {
    const beforeHtml = text.slice(0, doctypeMatch.index).trimEnd();
    const htmlBlock = doctypeMatch[1].trimEnd();
    return `${beforeHtml}\n\n\`\`\`html\n${htmlBlock}\n\`\`\``;
  }

  return text;
}

/**
 * Strip fenced code blocks from markdown, leaving only prose content.
 * Also removes heading lines that are filenames immediately preceding a code block.
 */
function stripCodeBlocks(text: string): string {
  return text
    .replace(/(?:^###?\s+\S+\.[\w]+\s*\n)?```[\s\S]*?```/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface ParsedFile {
  filename: string;
  language: string;
  code: string;
}

/** Default filenames per language (tracks how many of each we've seen) */
const DEFAULT_FILENAMES: Record<string, string> = {
  html: "index.html",
  css: "styles.css",
  scss: "styles.scss",
  js: "script.js",
  javascript: "script.js",
  jsx: "App.jsx",
  ts: "index.ts",
  typescript: "index.ts",
  tsx: "App.tsx",
  py: "main.py",
  python: "main.py",
  json: "data.json",
  yaml: "config.yaml",
  yml: "config.yml",
  md: "README.md",
  markdown: "README.md",
  sql: "query.sql",
  sh: "script.sh",
  bash: "script.sh",
  rust: "main.rs",
  go: "main.go",
  java: "Main.java",
  c: "main.c",
  cpp: "main.cpp",
  rb: "main.rb",
  ruby: "main.rb",
  php: "index.php",
  swift: "main.swift",
  kotlin: "Main.kt",
  text: "output.txt",
};

/**
 * Parse markdown into an array of file objects.
 *
 * Supports two filename patterns:
 *   1. Inline after the language tag:  ```html index.html
 *   2. A heading immediately before:   ### style.css\n```css
 *
 * Falls back to intelligent defaults based on language.
 */
function parseFiles(text: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const langCounts: Record<string, number> = {};

  // Match: optional heading line, then fenced block with optional lang + optional filename
  const regex =
    /(?:^###?\s+(\S+\.[\w]+)\s*\n)?```(\w*)\s*(\S+\.[\w]+)?\n([\s\S]*?)```/gm;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const headingFilename = match[1] || null;
    const language = match[2] || "text";
    const inlineFilename = match[3] || null;
    const code = match[4].trimEnd();

    // Priority: inline filename > heading filename > default
    let filename = inlineFilename || headingFilename;

    if (!filename) {
      const base = DEFAULT_FILENAMES[language] || `file.${language}`;
      const count = langCounts[language] || 0;
      filename = count === 0 ? base : base.replace(/\./, `_${count + 1}.`);
      langCounts[language] = count + 1;
    }

    files.push({ filename, language, code });
  }

  // Fallback: if regex didn't match (e.g. no language tag), do a simple extraction
  if (files.length === 0) {
    const simpleRegex = /```(\w*)\n([\s\S]*?)```/g;
    let idx = 0;
    while ((match = simpleRegex.exec(text)) !== null) {
      const language = match[1] || "text";
      const code = match[2].trimEnd();
      const base = DEFAULT_FILENAMES[language] || `file_${idx + 1}.txt`;
      files.push({ filename: base, language, code });
      idx++;
    }
  }

  return files;
}

/** Build an HTML document for live preview from parsed files */
function buildPreviewHtml(files: ParsedFile[]): string {
  const html = files.find((f) => f.language === "html")?.code ?? "";
  const css = files.find((f) => f.language === "css")?.code ?? "";
  const js =
    files.find((f) => f.language === "js" || f.language === "javascript")
      ?.code ?? "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>body{margin:0;padding:16px;font-family:system-ui,sans-serif;background:#1a1a17;color:#c4b998}${css}</style>
</head>
<body>${html}<script>${js}<\/script></body>
</html>`;
}

/** Check if files contain previewable web content */
function isPreviewable(files: ParsedFile[]): boolean {
  return files.some((f) => f.language === "html");
}

/* ═══════════════════════════════════════════════════════════
   File Icon Resolver
   ═══════════════════════════════════════════════════════════ */

function FileIcon({
  filename,
  className,
}: {
  filename: string;
  className?: string;
}) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const cls = className || "h-3.5 w-3.5";

  switch (ext) {
    case "html":
    case "htm":
      return <FileCode className={cls} />;
    case "css":
    case "scss":
    case "sass":
      return <FileType className={cls} />;
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "mjs":
      return <Braces className={cls} />;
    case "json":
      return <Braces className={cls} />;
    case "py":
    case "rb":
    case "go":
    case "rs":
    case "java":
    case "c":
    case "cpp":
    case "php":
    case "swift":
    case "kt":
      return <FileCode className={cls} />;
    default:
      return <File className={cls} />;
  }
}

/* ═══════════════════════════════════════════════════════════
   CopyButton
   ═══════════════════════════════════════════════════════════ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   CodeBadge
   ═══════════════════════════════════════════════════════════ */

function CodeBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-gold/20 bg-gold/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold shadow-[0_0_8px_rgba(200,168,78,0.15)]">
      <Code2 className="h-3 w-3" />
      Code Included
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   MiniIDE — File Explorer + Code Viewer
   ═══════════════════════════════════════════════════════════ */

function MiniIDE({ files, fillHeight }: { files: ParsedFile[]; fillHeight?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = files[activeIndex];

  return (
    <div className={`mt-3 flex overflow-hidden rounded-sm border border-slate-700 bg-[#0a0a09] ${fillHeight ? "flex-1 min-h-0" : "h-[500px]"}`}>
      {/* ── File Tree Sidebar ── */}
      <div className="flex w-48 shrink-0 flex-col border-r border-slate-700/60 bg-[#08080a]">
        {/* Sidebar header */}
        <div className="flex items-center gap-1.5 border-b border-slate-700/40 px-3 py-2">
          <FolderOpen className="h-3.5 w-3.5 text-gold-dim" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Files
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground/50">
            {files.length}
          </span>
        </div>

        {/* File list */}
        <nav className="flex-1 overflow-y-auto py-1 scrollbar-dark">
          {files.map((file, i) => {
            const isActive = i === activeIndex;
            return (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors ${
                  isActive
                    ? "border-l-2 border-gold bg-gold/[0.08] text-gold"
                    : "border-l-2 border-transparent text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                }`}
              >
                <FileIcon
                  filename={file.filename}
                  className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-gold" : "text-muted-foreground/60"}`}
                />
                <span className="truncate">{file.filename}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Code Viewer (Right Pane) ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Editor tab bar */}
        <div className="flex items-center justify-between border-b border-slate-700/60 bg-[#0d0d0b] px-4 py-1.5">
          <div className="flex items-center gap-2">
            <FileIcon
              filename={active.filename}
              className="h-3.5 w-3.5 text-gold-dim"
            />
            <span className="text-[12px] font-medium text-foreground/80">
              {active.filename}
            </span>
            <span className="rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
              {active.language}
            </span>
          </div>
          <CopyButton text={active.code} />
        </div>

        {/* Syntax highlighted code */}
        <div className="flex-1 overflow-y-auto scrollbar-dark">
          <SyntaxHighlighter
            language={active.language}
            style={a11yDark}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.75rem",
              lineHeight: "1.6",
              minHeight: "100%",
            }}
            showLineNumbers
            lineNumberStyle={{
              color: "#3a3a2e",
              fontSize: "0.65rem",
              minWidth: "2.5em",
              paddingRight: "1em",
            }}
          >
            {active.code}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main SubmissionViewer
   ═══════════════════════════════════════════════════════════ */

interface SubmissionViewerProps {
  content: string;
  /** When true, the viewer stretches to fill its parent via flex instead of using fixed heights */
  fillHeight?: boolean;
}

export function SubmissionViewer({ content, fillHeight }: SubmissionViewerProps) {
  const containsCode = useMemo(() => hasCodeBlocks(content), [content]);
  // Normalize raw HTML into fenced code blocks before any parsing
  const normalized = useMemo(
    () => (containsCode ? normalizeCodeFences(content) : content),
    [content, containsCode],
  );
  const files = useMemo(
    () => (containsCode ? parseFiles(normalized) : []),
    [normalized, containsCode],
  );
  const canPreview = useMemo(() => isPreviewable(files), [files]);
  const readmeContent = useMemo(
    () => (containsCode ? stripCodeBlocks(normalized) : content),
    [normalized, content, containsCode],
  );

  /* ── Simple markdown-only view ── */
  if (!containsCode) {
    return (
      <div className={`overflow-y-auto scrollbar-dark ${fillHeight ? "flex-1 min-h-0" : ""}`}>
        <div className="prose prose-invert prose-sm max-w-none prose-headings:font-heading prose-headings:text-gold prose-strong:text-foreground prose-a:text-gold prose-code:text-gold-bright prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-[#0d0d0d] prose-pre:border prose-pre:border-border/40">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </div>
    );
  }

  /* Height classes: fixed for inline, flex for modal */
  const containerH = fillHeight ? "flex-1 min-h-0" : "h-[500px]";

  /* ── Tabbed view when code is detected ── */
  return (
    <div className={fillHeight ? "flex flex-col flex-1 min-h-0" : ""}>
      {/* Badge — only show inline (modal has its own badge in header) */}
      {!fillHeight && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-heading text-muted-foreground uppercase tracking-wider">
            Submission Result
          </span>
          <CodeBadge />
        </div>
      )}

      <Tabs defaultValue="readme" className={fillHeight ? "flex flex-col flex-1 min-h-0" : ""}>
        <TabsList className="bg-secondary/60 border border-border/40 shrink-0">
          <TabsTrigger value="readme" className="gap-1.5 text-xs">
            <FileText className="h-3 w-3" /> ReadMe
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-1.5 text-xs">
            <Code2 className="h-3 w-3" /> View Code
          </TabsTrigger>
          {canPreview && (
            <TabsTrigger value="preview" className="gap-1.5 text-xs">
              <Play className="h-3 w-3" /> Live Preview
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── ReadMe Tab ── */}
        <TabsContent value="readme" className={fillHeight ? "flex flex-col flex-1 min-h-0" : ""}>
          <div className={`mt-3 overflow-y-auto rounded-sm border border-slate-700 bg-[#0d0d0d] p-4 scrollbar-dark ${containerH}`}>
            <div className="prose prose-invert prose-sm max-w-none prose-headings:font-heading prose-headings:text-gold prose-strong:text-foreground prose-a:text-gold prose-code:text-gold-bright prose-code:bg-secondary prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-pre:bg-secondary/50 prose-pre:border prose-pre:border-border/40">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{readmeContent}</ReactMarkdown>
            </div>
          </div>
        </TabsContent>

        {/* ── View Code Tab (Mini IDE) ── */}
        <TabsContent value="code" className={fillHeight ? "flex flex-col flex-1 min-h-0" : ""}>
          <MiniIDE files={files} fillHeight={fillHeight} />
        </TabsContent>

        {/* ── Live Preview Tab ── */}
        {canPreview && (
          <TabsContent value="preview" className={fillHeight ? "flex flex-col flex-1 min-h-0" : ""}>
            <div className={`mt-3 overflow-hidden rounded-sm border border-slate-700 bg-[#0d0d0d] ${fillHeight ? "flex flex-col flex-1 min-h-0" : ""}`}>
              <div className="flex items-center border-b border-slate-700 bg-secondary/40 px-4 py-2 shrink-0">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Live Preview
                </span>
              </div>
              <iframe
                srcDoc={buildPreviewHtml(files)}
                sandbox="allow-scripts"
                title="Submission Preview"
                className={`w-full border-0 bg-[#1a1a17] ${fillHeight ? "flex-1 min-h-0" : "h-[500px]"}`}
              />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
