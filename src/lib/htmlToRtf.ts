interface FontDef {
  id: number;
  family: string;
  name: string;
}

interface ColorDef {
  id: number;
  red: number;
  green: number;
  blue: number;
}

export function htmlToRtf(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const fonts: FontDef[] = [];
  const colors: ColorDef[] = [];
  const rtfBody = convertRtfNode(doc.body, fonts, colors);
  return buildRtfDocument(rtfBody, fonts, colors);
}

function buildRtfDocument(body: string, fonts: FontDef[], colors: ColorDef[]): string {
  const fontTable = fonts
    .map((f) => `{\\f${f.id}\\fcharset0 ${f.name};}`)
    .join("");

  const colorTable = colors
    .map((c) => `\\red${c.red}\\green${c.green}\\blue${c.blue};`)
    .join("");

  const header = [
    "{\\rtf1\\ansi\\deff0",
    fontTable ? `{\\fonttbl ${fontTable}}` : "",
    colorTable ? `{\\colortbl ;${colorTable}}` : "",
    "\\viewkind4\\uc1",
  ].filter(Boolean).join("\n");

  return `${header}\n${body}\n}`;
}

function getFontId(name: string, fonts: FontDef[]): number {
  const existing = fonts.find((f) => f.name === name);
  if (existing) return existing.id;
  const id = fonts.length;
  fonts.push({ id, family: name, name });
  return id;
}

function getColorId(color: string, colors: ColorDef[]): number {
  const hex = color.replace("#", "");
  if (hex.length !== 6 && hex.length !== 3) return 0;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const existingColor = colors.find((c) => c.red === r && c.green === g && c.blue === b);
  if (existingColor) return existingColor.id;
  const id = colors.length;
  colors.push({ id, red: r, green: g, blue: b });
  return id;
}

function getAlignment(el: HTMLElement): string {
  const align = el.getAttribute("align") ?? el.style.textAlign;
  switch (align) {
    case "center": return "\\qc";
    case "right": return "\\qr";
    case "justify": return "\\qj";
    default: return "\\ql";
  }
}

function convertRtfNode(node: Node, fonts: FontDef[], colors: ColorDef[]): string {
  let result = "";

  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];

    if (child.nodeType === Node.TEXT_NODE) {
      result += escapeRtfText(child.textContent ?? "");
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case "h1": case "h2": case "h3":
      case "h4": case "h5": case "h6": {
        const fontSize = [24, 22, 20, 18, 16, 14][parseInt(tag[1]) - 1];
        const inner = convertRtfNode(el, fonts, colors);
        result += `\\pard\\sa120\\sb60\\fs${fontSize * 2}\\b ${inner}\\b0\\par\n`;
        break;
      }
      case "p": {
        const align = getAlignment(el);
        const inner = convertRtfNode(el, fonts, colors);
        result += `\\pard${align}\\sa60 ${inner}\\par\n`;
        break;
      }
      case "br": {
        result += "\\line ";
        break;
      }
      case "strong": case "b": {
        const inner = convertRtfNode(el, fonts, colors);
        result += `\\b ${inner}\\b0 `;
        break;
      }
      case "em": case "i": {
        const inner = convertRtfNode(el, fonts, colors);
        result += `\\i ${inner}\\i0 `;
        break;
      }
      case "u": {
        const inner = convertRtfNode(el, fonts, colors);
        result += `\\ul ${inner}\\ul0 `;
        break;
      }
      case "s": case "strike": case "del": {
        const inner = convertRtfNode(el, fonts, colors);
        result += `\\strike ${inner}\\strike0 `;
        break;
      }
      case "span": {
        const style = el.getAttribute("style") ?? "";
        const fontMatch = style.match(/font-family:\s*([^;]+)/);
        const colorMatch = style.match(/color:\s*#?([^;]+)/);

        let prefix = "";
        let suffix = "";

        if (fontMatch) {
          const fid = getFontId(fontMatch[1].trim().replace(/["']/g, ""), fonts);
          prefix += `\\f${fid} `;
        }

        if (colorMatch) {
          const cid = getColorId(colorMatch[1].trim(), colors);
          if (cid > 0) {
            prefix += `\\cf${cid} `;
          }
        }

        const inner = convertRtfNode(el, fonts, colors);
        result += `${prefix}${inner}${suffix}`;
        break;
      }
      case "a": {
        const href = el.getAttribute("href") ?? "";
        const inner = convertRtfNode(el, fonts, colors);
        result += `{\\field{\\*\\fldinst{HYPERLINK "${escapeRtfText(href)}"}}{\\fldrslt{\\ul ${inner}}}} `;
        break;
      }
      case "ul": {
        result += convertRtfList(el, fonts, colors, false);
        break;
      }
      case "ol": {
        result += convertRtfList(el, fonts, colors, true);
        break;
      }
      case "li": {
        const inner = convertRtfNode(el, fonts, colors);
        result += `{\\pntext\\bullet\\tab}{\\*\\pn\\pnlvlblt\\pnindent{\\pntxtb\\bullet}}\\fi-200\\li400 ${inner}\\par\n`;
        break;
      }
      case "table": {
        result += convertRtfTable(el, fonts, colors);
        break;
      }
      case "pre": {
        const inner = escapeRtfText(el.textContent ?? "");
        result += `\\pard\\sa60\\f1\\fs20 ${inner}\\par\n`;
        break;
      }
      case "code": {
        result += `\\f1 ` + escapeRtfText(el.textContent ?? "") + `\\f0 `;
        break;
      }
      default: {
        result += convertRtfNode(el, fonts, colors);
      }
    }
  }

  return result;
}

function convertRtfList(el: HTMLElement, fonts: FontDef[], colors: ColorDef[], ordered: boolean): string {
  let result = "";
  let index = 1;
  for (const child of el.children) {
    if (child.tagName.toLowerCase() === "li") {
      const prefix = ordered ? `${index}.` : "\\bullet";
      const inner = convertRtfNode(child, fonts, colors);
      result += `\\pard\\fi-200\\li400 {\\pntext\\${prefix}\\tab}${inner}\\par\n`;
      index++;
    }
  }
  return result;
}

function convertRtfTable(table: HTMLElement, fonts: FontDef[], colors: ColorDef[]): string {
  let result = "\\pard\\intbl\\sa60\\ql ";
  const rows = table.querySelectorAll("tr");
  let colCount = 0;

  for (const row of rows) {
    const cells = row.querySelectorAll("th, td");
    colCount = Math.max(colCount, cells.length);
  }

  for (const row of rows) {
    const cells = row.querySelectorAll("th, td");
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const isHeader = cell.tagName.toLowerCase() === "th";
      const inner = convertRtfNode(cell, fonts, colors);
      result += isHeader ? `\\b ${inner}\\b0 ` : `${inner} `;
      result += `\\cell `;
    }
    result += "\\row\n";
  }

  return result;
}

function escapeRtfText(text: string): string {
  let result = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (ch === "\\") result += "\\\\";
    else if (ch === "{") result += "\\{";
    else if (ch === "}") result += "\\}";
    else if (code > 127) {
      result += `\\u${code}?`;
    } else if (code < 32) {
      continue;
    } else {
      result += ch;
    }
  }
  return result;
}
