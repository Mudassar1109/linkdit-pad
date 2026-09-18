import type { EditorMode } from "@/types/editor";
import { loadTxt } from "./txt-loader";
import { loadMd } from "./md-loader";
import { loadRtf } from "./rtf-loader";
import { loadLdp } from "./ldp-loader";

export interface LoadResult {
  content: string;
  mode: EditorMode;
  title?: string;
}

export type DocumentLoader = (raw: string) => LoadResult | null;

const loaders: Record<string, DocumentLoader> = {
  txt: loadTxt,
  md: loadMd,
  rtf: loadRtf,
  ldp: loadLdp,
};

export function getLoader(format: string): DocumentLoader | null {
  return loaders[format] ?? null;
}

export { loadTxt, loadMd, loadRtf, loadLdp };
