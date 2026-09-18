export interface SearchOptions {
  isRegex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface TextMatch {
  /** 1-based line number where the match lives. */
  line: number;
  /** Column where the match starts within its line. */
  matchStart: number;
  /** Column just past the match end within its line. */
  matchEnd: number;
  /** Full text of the matched line. */
  content: string;
  /** Absolute character offset of the match within the searched text. */
  offset: number;
  /** 0-based index of the match within the searched text. */
  ordinal: number;
}

function buildPattern(query: string, opts: SearchOptions): RegExp | null {
  let flags = "g";
  if (!opts.caseSensitive) flags += "i";
  try {
    const pattern = opts.isRegex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

function isWholeWord(line: string, index: number, length: number): boolean {
  const before = index > 0 ? line[index - 1] : " ";
  const after = index + length < line.length ? line[index + length] : " ";
  return !(/\w/.test(before) || /\w/.test(after));
}

/**
 * Searches `text` line by line and returns every non-overlapping match with
 * its line number, column range, absolute offset and per-text ordinal.
 * At most `maxMatches` matches are returned to keep the UI fast.
 */
export function searchText(
  text: string,
  query: string,
  opts: SearchOptions,
  maxMatches = 200
): TextMatch[] {
  if (!query.trim()) return [];
  const matcher = buildPattern(query, opts);
  if (!matcher) return [];

  const results: TextMatch[] = [];
  let ordinal = 0;
  let absolute = 0;
  const lines = text.split("\n");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    matcher.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = matcher.exec(line)) !== null) {
      if (m[0].length === 0) {
        matcher.lastIndex++;
        continue;
      }
      if (opts.wholeWord && !isWholeWord(line, m.index, m[0].length)) {
        continue;
      }
      results.push({
        line: lineIdx + 1,
        matchStart: m.index,
        matchEnd: m.index + m[0].length,
        content: line,
        offset: absolute + m.index,
        ordinal,
      });
      ordinal++;
      if (results.length >= maxMatches) return results;
    }
    absolute += line.length + 1;
  }
  return results;
}

/** Returns the match at a given ordinal, or null when the query changed. */
export function findMatchByOrdinal(
  text: string,
  query: string,
  opts: SearchOptions,
  ordinal: number
): TextMatch | null {
  const all = searchText(text, query, opts, ordinal + 1);
  return all[ordinal] ?? null;
}

function replaceRange(text: string, start: number, end: number, replacement: string): string {
  return text.slice(0, start) + replacement + text.slice(end);
}

/**
 * Replaces every occurrence (following the same options) and returns the
 * count of replacements plus the new text.
 */
export function replaceAllMatches(
  text: string,
  query: string,
  opts: SearchOptions,
  replacement: string
): { text: string; count: number } {
  if (!query.trim()) return { text, count: 0 };
  const matcher = buildPattern(query, opts);
  if (!matcher) return { text, count: 0 };
  matcher.lastIndex = 0;

  let next = text;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = matcher.exec(next)) !== null) {
    if (m[0].length === 0) {
      matcher.lastIndex++;
      continue;
    }
    if (opts.wholeWord && !isWholeWord(next, m.index, m[0].length)) {
      continue;
    }
    next = replaceRange(next, m.index, m.index + m[0].length, replacement);
    count++;
    matcher.lastIndex = m.index + replacement.length;
  }
  return { text: next, count };
}