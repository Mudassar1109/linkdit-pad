import type { Node as PMNode } from "@tiptap/pm/model";

/**
 * Bookmarks are stored as absolute character offsets in the document text.
 * For the rich (ProseMirror/TipTap) editor we convert back and forth between
 * editor positions and character offsets. This module mirrors ProseMirror's own
 * `textBetween` semantics (paragraphs/blocks joined by "\n\n", leaf blocks by
 * "\n\n", hard breaks by "\n", other inline leaves by "\ufffc") so that offsets,
 * line numbers and columns always match what `doc.textContent` reports.
 */

export interface DocCharInfo {
  offset: number;
  line: number;
  col: number;
}

/**
 * Replicates the exact traversal of `Fragment.nodesBetween` (and therefore
 * `doc.textBetween(0, p, "\n\n")`) so the layout is correct by construction.
 *
 * Text layout model (mirrors prosemirror-model's `Fragment.textBetween`):
 * - Every text character, every block separator character and every leaf
 *   `leafText` character is one "unit" with a fragment position `q`.
 * - A block separator ("\n\n") is emitted for every textblock / leaf block
 *   with text, EXCEPT the very first eligible block in document order.
 * - `offsetAt[p]` = number of units with unit position < p, which equals
 *   `doc.textBetween(0, p, "\n\n").length` for every p in 0..content.size.
 * - `text` is the concatenation of all units (== `doc.textBetween(0, size)`).
 */
function buildDocTextLayout(doc: PMNode): { offsetAt: Int32Array; text: string } {
  const size = doc.content.size;
  const starts: number[] = [];
  const chars: string[] = [];
  let first = true;

  const addUnits = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      starts.push(at);
      chars.push(s[i]);
    }
  };

  const walk = (fragment: unknown, base: number) => {
    let pos = 0;
    const frag = fragment as { childCount: number; child(i: number): PMNode };
    for (let i = 0; i < frag.childCount; i++) {
      const child = frag.child(i);
      const childPos = base + pos;

      if (child.isText) {
        const t = child.text ?? "";
        for (let k = 0; k < t.length; k++) {
          starts.push(childPos + k);
          chars.push(t[k]);
        }
      } else {
        const spec = child.type.spec.leafText;
        const leafText = spec ? (typeof spec === "function" ? spec(child) : spec) : "";
        const eligibleBlock =
          child.isBlock && (child.isTextblock || (child.isLeaf && leafText.length > 0));
        if (eligibleBlock) {
          if (first) {
            first = false;
          } else {
            addUnits(childPos, "\n\n");
          }
        }
        if (child.isLeaf && leafText.length > 0) addUnits(childPos, leafText);
      }

      const content = child.content;
      if (content && content.size) walk(content as unknown, childPos + 1);
      pos += child.nodeSize;
    }
  };

  walk(doc.content, 0);

  const countAt = new Int32Array(size + 1);
  for (let i = 0; i < starts.length; i++) countAt[starts[i]]++;

  const offsetAt = new Int32Array(size + 1);
  for (let p = 1; p <= size; p++) offsetAt[p] = offsetAt[p - 1] + countAt[p - 1];

  return { offsetAt, text: chars.join("") };
}

interface DocLayout {
  offsetAt: Int32Array;
  text: string;
  newlines: number[];
}

function layoutFor(doc: PMNode): DocLayout {
  const { offsetAt, text } = buildDocTextLayout(doc);
  const newlines: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") newlines.push(i);
  return { offsetAt, text, newlines };
}

/** Line (1-based) and column (0-based) of a character offset in `text`. */
function lineColOf(offset: number, newlines: number[]): { line: number; col: number } {
  let lo = -1;
  let hi = newlines.length - 1;
  let last = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (newlines[mid] < offset) {
      last = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return { line: last + 2, col: offset - (last === -1 ? -1 : newlines[last]) - 1 };
}

/**
 * Given a doc and a list of ProseMirror positions, compute the character
 * offset / line / column of each position plus the char information of the
 * cursor position. All in a single pass over the document.
 */
export function computeDocCharInfo(
  doc: PMNode,
  targets: number[],
  cursor: number
): { infos: Map<number, DocCharInfo>; cursorInfo: DocCharInfo | null } {
  const layout = layoutFor(doc);
  const size = doc.content.size;
  const safe = (t: number) => (Number.isFinite(t) && t >= 0 ? Math.min(Math.floor(t), size) : null);

  const infoAt = (pos: number): DocCharInfo => {
    const offset = layout.offsetAt[pos];
    const { line, col } = lineColOf(Math.min(offset, layout.text.length), layout.newlines);
    return { offset, line, col };
  };

  const infos = new Map<number, DocCharInfo>();
  for (const t of targets) {
    const p = safe(t);
    if (p !== null && !infos.has(p)) infos.set(p, infoAt(p));
  }

  const cp = safe(cursor);
  return { infos, cursorInfo: cp === null ? null : infoAt(cp) };
}

/**
 * Inverse of `computeDocCharInfo`: given character offsets, find the closest
 * valid ProseMirror positions in the document.
 */
export function docPositionsForCharOffsets(doc: PMNode, offsets: number[]): number[] {
  const { offsetAt } = buildDocTextLayout(doc);
  const size = doc.content.size;

  const posFor = (offset: number): number => {
    if (offset <= 0) return 0;
    if (offset >= offsetAt[size]) return size;
    // smallest p with offsetAt[p] >= offset
    let lo = 0;
    let hi = size;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsetAt[mid] < offset) lo = mid + 1;
      else hi = mid;
    }
    if (offsetAt[lo] === offset) return lo;
    // offset fell into a gap (e.g. inside a "\n\n" unit) — snap to nearest
    if (lo > 0 && offset - offsetAt[lo - 1] < offsetAt[lo] - offset) return lo - 1;
    return lo;
  };

  return offsets.map((o) => posFor(Number.isFinite(o) ? Math.max(0, Math.round(o)) : 0));
}

/** Line / column of a character offset inside a plain string. */
export function plainLineCol(text: string, pos: number): { line: number; charPosition: number } {
  const p = Math.max(0, Math.min(pos, text.length));
  const before = text.slice(0, p);
  return {
    line: (before.match(/\n/g) ?? []).length + 1,
    charPosition: p - before.lastIndexOf("\n") - 1,
  };
}

/** Line/column table for multiple offsets in one pass over the text. */
export function plainLineCols(text: string, positions: number[]): Map<number, { line: number; charPosition: number }> {
  const sorted = [...positions].sort((a, b) => a - b);
  const out = new Map<number, { line: number; charPosition: number }>();
  let line = 1;
  let lastNL = -1;
  let ti = 0;
  for (let i = 0; i <= text.length && ti < sorted.length; i++) {
    if (sorted[ti] === i) {
      out.set(i, { line, charPosition: i - lastNL - 1 });
      ti++;
    }
    if (i < text.length && text.charCodeAt(i) === 10) {
      line++;
      lastNL = i;
    }
  }
  for (; ti < sorted.length; ti++) {
    const p = sorted[ti];
    const before = text.slice(0, p);
    out.set(p, { line: (before.match(/\n/g) ?? []).length + 1, charPosition: p - before.lastIndexOf("\n") - 1 });
  }
  return out;
}

/**
 * Recompute positions of bookmarks after text changed (plain editor).
 * Insertions/deletions are detected via longest common prefix/suffix, which is
 * O(n) and covers typing, deleting, pasting and undoing. Bookmarks inside the
 * changed region are relocated to the closest valid position (the start of the
 * change).
 */
export function adjustPlainBookmarks<T extends { id: string; position: number }>(
  bookmarks: T[],
  oldText: string,
  newText: string
): T[] {
  const prefix = commonPrefixLength(oldText, newText);
  const oldRest = oldText.slice(prefix);
  const newRest = newText.slice(prefix);
  const maxSuffix = Math.min(oldRest.length, newRest.length);
  let suffixOld = 0;
  while (
    suffixOld < maxSuffix &&
    oldRest[oldRest.length - 1 - suffixOld] === newRest[newRest.length - 1 - suffixOld]
  ) {
    suffixOld++;
  }
  const deleted = oldRest.length - suffixOld;
  const inserted = newRest.length - suffixOld;
  const boundary = prefix + deleted;
  const shift = inserted - deleted;

  return bookmarks.map((b) => {
    if (b.position <= prefix) return b;
    if (b.position >= boundary) return { ...b, position: b.position + shift };
    return { ...b, position: prefix };
  });
}

function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}