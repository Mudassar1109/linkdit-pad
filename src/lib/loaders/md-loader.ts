import MarkdownIt from "markdown-it";
import type { LoadResult } from "./index";

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false,
});

export function loadMd(raw: string): LoadResult {
  const html = md.render(raw);
  return { content: html, mode: "rich" };
}
