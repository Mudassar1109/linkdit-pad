export function htmlToMarkdown(html: string): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return convertNode(doc.body, 0);
}

function convertNode(node: Node, depth: number): string {
  let result = "";

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];

    if (child.nodeType === Node.TEXT_NODE) {
      result += escapeMarkdownText(child.textContent ?? "");
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": {
        const level = parseInt(tag[1]);
        result += "\n\n" + "#".repeat(level) + " " + convertNode(el, depth + 1).trim() + "\n\n";
        break;
      }
      case "p": {
        const inner = inlineFormat(el);
        result += "\n\n" + inner;
        break;
      }
      case "br": {
        result += "\n";
        break;
      }
      case "hr": {
        result += "\n\n---\n\n";
        break;
      }
      case "blockquote": {
        const inner = convertNode(el, depth + 1).trim();
        result += "\n\n" + inner.split("\n").map((l) => "> " + l).join("\n") + "\n\n";
        break;
      }
      case "ul": {
        result += "\n\n" + convertList(el, depth, false) + "\n\n";
        break;
      }
      case "ol": {
        result += "\n\n" + convertList(el, depth, true) + "\n\n";
        break;
      }
      case "pre": {
        const code = el.querySelector("code");
        const text = code ? code.textContent ?? "" : el.textContent ?? "";
        const lang = code?.getAttribute("class")?.replace(/^language-/, "") ?? "";
        result += "\n\n```" + lang + "\n" + text + "\n```\n\n";
        break;
      }
      case "code": {
        result += "`" + (el.textContent ?? "") + "`";
        break;
      }
      case "table": {
        result += "\n\n" + convertTable(el) + "\n\n";
        break;
      }
      case "div": {
        break;
      }
      default: {
        result += inlineFormat(el);
      }
    }
  }

  return result;
}

function inlineFormat(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();

  switch (tag) {
    case "strong": case "b": {
      const content = getTextContent(el);
      return boldPattern.test(content) ? content : `**${content}**`;
    }
    case "em": case "i": {
      const content = getTextContent(el);
      return italicPattern.test(content) ? content : `*${content}*`;
    }
    case "u": {
      return `<u>${getTextContent(el)}</u>`;
    }
    case "s": case "strike": case "del": {
      return `~~${getTextContent(el)}~~`;
    }
    case "a": {
      const href = el.getAttribute("href") ?? "";
      const text = getTextContent(el);
      return href === text ? href : `[${text}](${href})`;
    }
    case "img": {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      return `![${alt}](${src})`;
    }
    case "br": {
      return "\n";
    }
    case "code": {
      return "`" + (el.textContent ?? "") + "`";
    }
    case "span": {
      return getTextContent(el);
    }
    case "p": {
      return "\n\n" + getTextContent(el);
    }
    default: {
      return getTextContent(el);
    }
  }
}

function getTextContent(el: HTMLElement): string {
  let result = "";
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      result += child.textContent ?? "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      result += inlineFormat(child as HTMLElement);
    }
  }
  return result;
}

const boldPattern = /^\*\*.*\*\*$/;
const italicPattern = /^\*.*\*$/;

function convertList(el: HTMLElement, depth: number, ordered: boolean): string {
  let result = "";
  let index = 1;
  for (const child of el.children) {
    if (child.tagName.toLowerCase() === "li") {
      const prefix = ordered ? `${index}.` : "-";
      const prefix2 = "  ".repeat(depth);
      const inner = convertNode(child, depth + 1).trim();
      result += `\n${prefix2}${prefix} ${inner}`;
      index++;
    }
  }
  return result;
}

function convertTable(table: HTMLElement): string {
  const rows = table.querySelectorAll("tr");
  if (rows.length === 0) return "";

  const headers = rows[0].querySelectorAll("th, td");
  const headerRow = "| " + Array.from(headers).map((h) => h.textContent ?? "").join(" | ") + " |";
  const separatorRow = "| " + Array.from(headers).map(() => "---").join(" | ") + " |";

  const dataRows: string[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r].querySelectorAll("td");
    if (cells.length > 0) {
      dataRows.push("| " + Array.from(cells).map((c) => c.textContent ?? "").join(" | ") + " |");
    }
  }

  return headerRow + "\n" + separatorRow + (dataRows.length > 0 ? "\n" + dataRows.join("\n") : "");
}

function escapeMarkdownText(text: string): string {
  return text
    .replace(/\\(?!["'`*_{}\[\]()#+\-.!])/g, "\\\\")
    .replace(/([`*_{}\[\]()#+\-.!])/g, "\\$1");
}
