import type { LoadResult } from "./index";

export function loadTxt(raw: string): LoadResult {
  return {
    content: raw,
    mode: "plain",
  };
}
