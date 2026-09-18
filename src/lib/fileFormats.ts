import { htmlToMarkdown } from "@/lib/htmlToMd";
import { htmlToRtf } from "@/lib/htmlToRtf";

export type DocumentFormat = "ldp" | "html" | "txt" | "md" | "rtf";

export const LDP_FORMAT_VERSION = 1;

export interface LdpCreator {
  app: string;
  version: string;
}

export interface LdpMeta {
  title: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  creator?: LdpCreator;
  language?: string;
  direction?: "ltr" | "rtl";
  tabSize?: number;
  wordWrap?: boolean;
}

export interface LdpContent {
  type: string;
  encoding?: string;
  data: string;
}

export interface LdpDocument {
  ldp: "linkdit-pad";
  version: number;
  meta: LdpMeta;
  content: LdpContent;
  resources?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export function createLdpMeta(title: string, mode: string): LdpMeta {
  const now = new Date().toISOString();
  return {
    title,
    mode,
    createdAt: now,
    updatedAt: now,
    creator: {
      app: "LinkDit Pad",
      version: "0.1.1",
    },
    language: "en",
    direction: "ltr",
    tabSize: 4,
    wordWrap: true,
  };
}

export function getFormatFromPath(filePath: string): DocumentFormat {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "ldp") return "ldp";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "txt") return "txt";
  if (ext === "md") return "md";
  if (ext === "rtf") return "rtf";
  return "html";
}

export function getFormatMimeType(format: DocumentFormat): string {
  switch (format) {
    case "ldp": return "application/json";
    case "html": return "text/html";
    case "txt": return "text/plain";
    case "md": return "text/markdown";
    case "rtf": return "application/rtf";
  }
}

export function getFormatExtension(format: DocumentFormat): string {
  return format;
}

export function getSaveFilters() {
  return [
    { name: "LinkDit Pad Document (*.ldp)", extensions: ["ldp"] },
    { name: "HTML (*.html)", extensions: ["html"] },
    { name: "Markdown (*.md)", extensions: ["md"] },
    { name: "Plain Text (*.txt)", extensions: ["txt"] },
    { name: "Rich Text (*.rtf)", extensions: ["rtf"] },
  ];
}

export function getOpenFilters() {
  return [
    { name: "All Supported Formats", extensions: ["ldp", "html", "htm", "md", "txt", "rtf"] },
    { name: "LinkDit Pad Document (*.ldp)", extensions: ["ldp"] },
    { name: "HTML (*.html)", extensions: ["html", "htm"] },
    { name: "Markdown (*.md)", extensions: ["md"] },
    { name: "Plain Text (*.txt)", extensions: ["txt"] },
    { name: "Rich Text (*.rtf)", extensions: ["rtf"] },
  ];
}

export function getBrowserAccept(): string {
  return ".ldp,.html,.htm,.md,.txt,.rtf";
}

export function serializeLdp(content: string, mode: string, title: string): string {
  const meta = createLdpMeta(title, mode);
  meta.updatedAt = new Date().toISOString();

  const doc: LdpDocument = {
    ldp: "linkdit-pad",
    version: LDP_FORMAT_VERSION,
    meta,
    content: {
      type: "text/html",
      encoding: "utf-8",
      data: content,
    },
  };

  return JSON.stringify(doc, null, 2);
}

export interface LdpParseResult {
  content: string;
  mode: string;
  title: string;
  version: number;
}

export function deserializeLdp(data: string): LdpParseResult | null {
  try {
    const cleaned = data.replace(/^\uFEFF/, "").trim();
    if (!cleaned) return null;

    const parsed = JSON.parse(cleaned);

    if (!parsed || typeof parsed !== "object") return null;

    if (parsed.ldp !== "linkdit-pad") return null;
    if (typeof parsed.version !== "number") return null;
    if (!parsed.content || typeof parsed.content !== "object") return null;
    if (typeof parsed.content.data !== "string") return null;

    const content = parsed.content.data.trim();
    if (!content) return null;

    if (parsed.version > LDP_FORMAT_VERSION) {
      console.warn(
        `[LinkDit Pad] File uses format v${parsed.version}, but this app supports up to v${LDP_FORMAT_VERSION}. ` +
        "Some features may not be available."
      );
    }

    const meta = parsed.meta as Record<string, unknown> | undefined;
    const mode = typeof meta?.mode === "string" ? meta.mode : "rich";
    const title = typeof meta?.title === "string" ? meta.title : "Untitled";

    return { content, mode, title, version: parsed.version };
  } catch {
    return null;
  }
}

export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

export function prepareContentForSave(
  content: string,
  mode: string,
  title: string,
  format: DocumentFormat,
): string {
  switch (format) {
    case "ldp":
      return serializeLdp(content, mode, title);
    case "md":
      return htmlToMarkdown(content);
    case "rtf":
      return htmlToRtf(content);
    case "txt":
      return stripHtml(content);
    default:
      return content;
  }
}

export function detectContentMode(_content: string, format: DocumentFormat): string {
  if (format === "ldp") return "rich";
  if (format === "txt") return "plain";
  if (format === "md") return "markdown";
  return "rich";
}
