import type { LoadResult } from "./index";

export function loadRtf(raw: string): LoadResult {
  const html = rtfToHtml(raw);
  return { content: html, mode: "rich" };
}

interface RtfState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  fontSize: number;
  fontFamily: string;
  foreground: string;
  background: string;
  align: string;
  superscript: boolean;
  subscript: boolean;
}

function defaultState(): RtfState {
  return {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    fontSize: 24,
    fontFamily: "",
    foreground: "",
    background: "",
    align: "left",
    superscript: false,
    subscript: false,
  };
}

interface FontEntry {
  id: number;
  name: string;
}

export function rtfToHtml(rtf: string): string {
  const fonts: FontEntry[] = [];
  const colors: string[] = ["#000000"];
  const lines: string[] = [];
  const state = defaultState();

  let stack: RtfState[] = [];
  let i = 0;

  while (i < rtf.length) {
    if (rtf[i] === "{") {
      stack.push({ ...state });
      i++;
      continue;
    }

    if (rtf[i] === "}") {
      const prev = stack.pop();
      if (prev) Object.assign(state, prev);
      i++;
      continue;
    }

    if (rtf[i] === "\\") {
      i++;
      let control = "";
      while (i < rtf.length && /[a-zA-Z]/.test(rtf[i])) {
        control += rtf[i];
        i++;
      }

      let numeric = "";
      let negate = false;
      if (rtf[i] === "-") { negate = true; i++; }
      while (i < rtf.length && /\d/.test(rtf[i])) {
        numeric += rtf[i];
        i++;
      }
      const num = numeric ? (negate ? -parseInt(numeric) : parseInt(numeric)) : null;

      if (rtf[i] === " ") i++;

      switch (control) {
        case "b": state.bold = num !== 0; break;
        case "i": state.italic = num !== 0; break;
        case "ul": state.underline = num !== 0; break;
        case "strike": state.strikethrough = num !== 0; break;
        case "sub": state.subscript = num !== 0; break;
        case "super": state.superscript = num !== 0; break;
        case "plain": Object.assign(state, defaultState()); break;
        case "par": case "pard": lines.push("</p><p>"); break;
        case "line": lines.push("<br>"); break;
        case "tab": lines.push("&emsp;"); break;
        case "qc": state.align = "center"; break;
        case "qr": state.align = "right"; break;
        case "qj": state.align = "justify"; break;
        case "ql": state.align = "left"; break;
        case "cell": lines.push("</td><td>"); break;
        case "row": lines.push("</td></tr><tr><td>"); break;
        case "fonttbl": break;
        case "colortbl": break;
        case "stylesheet": break;
        case "f": {
          if (num !== null) {
            const font = fonts.find((f) => f.id === num);
            if (font) state.fontFamily = font.name;
          }
          break;
        }
        case "fnil": case "froman": case "fswiss": case "fmodern":
        case "fscript": case "fdecor": case "ftech": case "fbidi": {
          break;
        }
        case "fcharset": case "cchs": break;
        case "fs": {
          if (num !== null) state.fontSize = num;
          break;
        }
        case "cf": {
          if (num !== null && num < colors.length) {
            state.foreground = colors[num];
          }
          break;
        }
        case "cb": {
          if (num !== null && num < colors.length) {
            state.background = colors[num];
          }
          break;
        }
        case "'": {
          if (i + 1 < rtf.length) {
            const hex = rtf.substring(i, i + 2);
            i += 2;
            const code = parseInt(hex, 16);
            if (!isNaN(code)) {
              lines.push(applyFormat(String.fromCharCode(code), state));
            }
          }
          break;
        }
        case "u": {
          if (num !== null) {
            lines.push(applyFormat(String.fromCharCode(Math.abs(num)), state));
          }
          if (rtf[i] === "'") {
            i += 2;
          }
          break;
        }
        case "fontfamily": case "fname": break;
        default: {
          if (control.length === 0 && rtf[i] === "\\") {
            lines.push("\\");
            i++;
          } else if (control.length === 0 && rtf[i] === "{") {
            lines.push("{");
            i++;
          } else if (control.length === 0 && rtf[i] === "}") {
            lines.push("}");
            i++;
          }
        }
      }
      continue;
    }

    if (rtf[i] === "\r" || rtf[i] === "\n") {
      i++;
      continue;
    }

    if (rtf[i] === ";" || rtf[i] === " ") {
      i++;
      continue;
    }

    let text = "";
    while (i < rtf.length && rtf[i] !== "{" && rtf[i] !== "}" && rtf[i] !== "\\" && rtf[i] !== "\r" && rtf[i] !== "\n") {
      text += rtf[i];
      i++;
    }

    if (text) {
      lines.push(applyFormat(text, state));
    }
  }

  const body = lines.join("")
    .replace(/<\/p><p><\/td><td>/g, "</p><p>")
    .replace(/(<br>\s*)+<br>/g, "<br>")
    .trim();

  const alignClass = state.align !== "left" ? ` style="text-align:${state.align}"` : "";
  return `<p${alignClass}>${body}</p>`;
}

function applyFormat(text: string, state: RtfState): string {
  let result = escapeHtml(text);

  if (state.bold) result = `<strong>${result}</strong>`;
  if (state.italic) result = `<em>${result}</em>`;
  if (state.underline) result = `<u>${result}</u>`;
  if (state.strikethrough) result = `<s>${result}</s>`;
  if (state.superscript) result = `<sup>${result}</sup>`;
  if (state.subscript) result = `<sub>${result}</sub>`;

  let style = "";
  if (state.fontFamily) style += `font-family:${state.fontFamily};`;
  if (state.fontSize && state.fontSize !== 24) style += `font-size:${Math.round(state.fontSize / 2)}pt;`;
  if (state.foreground) style += `color:${state.foreground};`;
  if (state.background) style += `background-color:${state.background};`;

  if (style) result = `<span style="${style}">${result}</span>`;

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
