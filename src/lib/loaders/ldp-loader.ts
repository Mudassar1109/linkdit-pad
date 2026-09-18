import { deserializeLdp } from "@/lib/fileFormats";
import type { LoadResult } from "./index";

export function loadLdp(raw: string): LoadResult | null {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("\uFEFF{")) return null;

  const parsed = deserializeLdp(raw);
  if (!parsed) return null;

  return {
    content: parsed.content,
    mode: "rich",
    title: parsed.title,
  };
}
