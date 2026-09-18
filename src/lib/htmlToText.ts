/**
 * Normalizes rich (HTML) document content into plain searchable text using a
 * ProseMirror-like block layout: block-level elements are separated by "\n\n",
 * hard breaks become "\n", and mark/inline wrappers contribute just their text.
 * This keeps line numbers stable enough to navigate to results after the
 * document is opened in the editor.
 */

const BLOCK_TAGS = new Set([
  "P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "UL", "OL", "LI",
  "DIV", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH", "SECTION", "ARTICLE",
  "ASIDE", "HEADER", "FOOTER", "MAIN", "NAV", "HR", "FIGURE", "FIGCAPTION",
]);

/** Text of an inline (non-block) element, resolving nested text and <br>. */
function inlineText(el: Element): string {
  let out = "";
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.nodeValue ?? "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const e = child as Element;
      if (e.tagName.toUpperCase() === "BR") {
        out += "\n";
      } else if (!BLOCK_TAGS.has(e.tagName.toUpperCase())) {
        out += inlineText(e);
      }
    }
  }
  return out;
}

/** Plain text of a block element, joining nested blocks with "\n\n". */
function blockText(el: Element): string {
  const chunks: string[] = [];
  let cur = "";

  const flush = () => {
    if (cur !== "") {
      chunks.push(cur);
      cur = "";
    }
  };

  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      cur += child.nodeValue ?? "";
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const e = child as Element;
    const tag = e.tagName.toUpperCase();
    if (tag === "BR") {
      cur += "\n";
    } else if (BLOCK_TAGS.has(tag)) {
      flush();
      const inner = blockText(e);
      if (inner !== "") chunks.push(inner);
    } else {
      cur += inlineText(e);
    }
  }
  flush();
  return chunks.join("\n\n").replace(/[ \t]+\n/g, "\n");
}

/** Extracts searchable plain text from an HTML document fragment. */
export function htmlToPlainText(html: string): string {
  let root: HTMLElement | null = null;
  try {
    root = new DOMParser().parseFromString(html, "text/html").body;
  } catch {
    return "";
  }
  return cropSurrogates(blockText(root));
}

/** Compacts lone surrogate halves emitted by some serializers. */
function cropSurrogates(text: string): string {
  return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "").replace(/(^|[^\uDC00-\uDFFF])[\uDC00-\uDFFF]/g, "$1");
}