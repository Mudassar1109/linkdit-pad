import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImageNodeView } from "@/components/editor/image/ImageNodeView";

export interface ImageResizeOptions {
  /** Render the image node inline (inside text) instead of as a block. */
  inline: boolean;
  /** Allow data: URLs when parsing image sources. */
  allowBase64: boolean;
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      setImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number }) => ReturnType;
    };
  }
}

const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/;

function numFromStyle(el: HTMLElement, prop: string): number | null {
  const style = el.getAttribute("style") || "";
  const match = style.match(new RegExp(`${prop}:\\s*(\\d+(?:\\.\\d+)?)px`));
  if (match) {
    const value = parseFloat(match[1]);
    if (Number.isFinite(value)) return value;
  }
  const attr = parseFloat(el.getAttribute(prop) || "");
  return Number.isFinite(attr) ? attr : null;
}

export const ImageResize = Node.create<ImageResizeOptions>({
  name: "image",

  group: "block",

  atom: true,

  selectable: true,

  draggable: true,

  inline() {
    return this.options.inline;
  },

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? "img[src]"
          : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = { ...(HTMLAttributes as Record<string, any>) };
    const styleParts: string[] = [];
    if (attrs.style) {
      const cleaned = String(attrs.style)
        .replace(/width:\s*[^;]+;?/g, "")
        .replace(/height:\s*[^;]+;?/g, "")
        .replace(/;\s*;+/g, ";")
        .trim();
      if (cleaned) styleParts.push(cleaned.replace(/;$/, ""));
    }
    const width = typeof attrs.width === "number" ? attrs.width : Number.parseInt(String(attrs.width ?? ""), 10);
    const height = typeof attrs.height === "number" ? attrs.height : Number.parseInt(String(attrs.height ?? ""), 10);
    if (Number.isFinite(width) && width > 0) {
      styleParts.push(`width:${Math.round(width)}px`);
    }
    if (Number.isFinite(height) && height > 0) {
      styleParts.push(`height:${Math.round(height)}px`);
    }
    delete attrs.width;
    delete attrs.height;
    if (styleParts.length) {
      attrs.style = styleParts.join(";");
    }
    return ["img", mergeAttributes(this.options.HTMLAttributes, attrs)];
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) => (el as HTMLImageElement).getAttribute("src"),
        renderHTML: (attrs) => ({ src: (attrs as any).src }),
      },
      alt: {
        default: null,
        parseHTML: (el) => (el as HTMLImageElement).getAttribute("alt"),
        renderHTML: (attrs) => ({ alt: (attrs as any).alt }),
      },
      title: {
        default: null,
        parseHTML: (el) => (el as HTMLImageElement).getAttribute("title"),
        renderHTML: (attrs) => ((attrs as any).title ? { title: (attrs as any).title } : {}),
      },
      width: {
        default: null,
        parseHTML: (el) => numFromStyle(el as HTMLElement, "width"),
        renderHTML: () => ({}),
      },
      height: {
        default: null,
        parseHTML: (el) => numFromStyle(el as HTMLElement, "height"),
        renderHTML: () => ({}),
      },
      dataAlign: {
        default: "left",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-align") ?? "left",
        renderHTML: (attrs) => {
          const { dataAlign } = attrs as any;
          return dataAlign && dataAlign !== "left" ? { "data-align": dataAlign } : {};
        },
      },
      dataDisplay: {
        default: "block",
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-display") ?? "block",
        renderHTML: (attrs) => {
          const { dataDisplay } = attrs as any;
          return dataDisplay && dataDisplay !== "block" ? { "data-display": dataDisplay } : {};
        },
      },
      dataAspectLocked: {
        default: true,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-aspect-locked") !== "false",
        renderHTML: (attrs) => {
          const { dataAspectLocked } = attrs as any;
          return dataAspectLocked === false ? { "data-aspect-locked": "false" } : {};
        },
      },
    };
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string; width?: number; height?: number }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: (match) => {
          const [, alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});