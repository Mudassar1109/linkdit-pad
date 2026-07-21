import { useCallback, useEffect, useState } from "react";
import {
  FilePlus, File, Save, Scissors, Copy, Clipboard,
  Bold, Italic, Underline, Strikethrough, Highlighter, Palette,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ListChecks, Table, Smile,
  Search, Settings, Replace, Undo2, Redo2, Type,
  Indent, Outdent, Minus,
  Heading1, Heading2, Heading3, Quote, Code, Image,
  Link, Subscript, Superscript, Eraser,
  Sun, Moon
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useEditorBridge } from "@/store/useEditorBridge";
import { useEditorStore } from "@/store/useEditorStore";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { useSearchStore } from "@/store/useSearchStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useFontStore, type FontEntry } from "@/store/useFontStore";
import type { EditorMode } from "@/types/editor";
import {
  getFormatFromPath, getSaveFilters, getOpenFilters, getBrowserAccept,
  prepareContentForSave, deserializeLdp, getFormatExtension, getFormatMimeType,
} from "@/lib/fileFormats";

interface ToolbarButtonProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  shortcut?: string;
  isActive?: boolean;
}

function ToolbarButton({ icon: Icon, label, onClick, shortcut, isActive }: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          data-state={isActive ? "on" : "off"}
          className="h-8 w-8 data-[state=on]:bg-muted data-[state=on]:text-foreground"
        >
          <Icon size={16} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}{shortcut ? ` (${shortcut})` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

function withEditor(fn: (editor: NonNullable<ReturnType<typeof useEditorBridge.getState>["editor"]>) => void) {
  return () => {
    const editor = useEditorBridge.getState().editor;
    if (editor) fn(editor);
  };
}

const FONT_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recent" },
  { id: "favorites", label: "Favorites" },
  { id: "english", label: "English" },
  { id: "urdu", label: "Urdu" },
  { id: "arabic", label: "Arabic" },
  { id: "monospace", label: "Monospace" },
  { id: "handwriting", label: "Handwriting" },
  { id: "serif", label: "Serif" },
  { id: "sans-serif", label: "Sans Serif" },
  { id: "google", label: "Google Fonts" },
];

const GOOGLE_FONTS_LIST = [
  "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Inter",
  "Noto Sans", "Noto Serif", "Playfair Display", "Source Sans Pro",
  "Nunito", "Raleway", "Ubuntu", "Oswald", "Merriweather",
  "Noto Nastaliq Urdu", "Noto Kufi Arabic", "Noto Naskh Arabic",
  "Cairo", "Readex Pro", "Amiri", "Scheherazade New",
];

function FontSelector() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [googleInput, setGoogleInput] = useState("");

  const systemFonts = useFontStore((s) => s.systemFonts);

  useEffect(() => {
    if (systemFonts.length === 0) {
      useFontStore.getState().detectSystemFonts();
    }
  }, [systemFonts.length]);
  const googleFonts = useFontStore((s) => s.googleFonts);
  const recentFonts = useFontStore((s) => s.recentFonts);
  const favoriteFonts = useFontStore((s) => s.favoriteFonts);
  const isLoading = useFontStore((s) => s.isLoading);
  const loadGoogleFont = useFontStore((s) => s.loadGoogleFont);
  const addRecentFont = useFontStore((s) => s.addRecentFont);
  const toggleFavoriteFont = useFontStore((s) => s.toggleFavoriteFont);
  const isFavorite = useFontStore((s) => s.isFavorite);

  const allFonts = [...systemFonts, ...googleFonts];

  const getDisplayFonts = (): FontEntry[] => {
    if (category === "recent") {
      return recentFonts.map((name) => {
        const found = allFonts.find((f) => f.family === name);
        return found || { family: name, category: "other" as FontEntry["category"], source: "system" as FontEntry["source"] };
      });
    }
    if (category === "favorites") {
      return favoriteFonts.map((name) => {
        const found = allFonts.find((f) => f.family === name);
        return found || { family: name, category: "other" as FontEntry["category"], source: "system" as FontEntry["source"] };
      });
    }
    if (category === "google") {
      return GOOGLE_FONTS_LIST.filter((f) =>
        !search || f.toLowerCase().includes(search.toLowerCase())
      ).map((family) => ({
        family,
        category: "sans-serif" as FontEntry["category"],
        source: "google" as FontEntry["source"],
      }));
    }
    return allFonts.filter((f) => {
      if (search && !f.family.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "all" && f.category !== category) return false;
      return true;
    });
  };

  const displayFonts = getDisplayFonts();

  const handleSelectFont = (family: string) => {
    const editor = useEditorBridge.getState().editor;
    if (editor) {
      editor.chain().focus().setFontFamily(family).run();
      addRecentFont(family);
    }
  };

  const handleLoadGoogle = async () => {
    const name = googleInput.trim();
    if (!name) return;
    await loadGoogleFont(name);
    handleSelectFont(name);
    setGoogleInput("");
  };

  const categorizedFonts = (() => {
    const grouped: Record<string, FontEntry[]> = {};
    for (const font of displayFonts) {
      const cat = font.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(font);
    }
    return grouped;
  })();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 font-mono text-xs">
          <Type size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fonts..."
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-1 flex-wrap max-h-20 overflow-y-auto">
            {FONT_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                  category === c.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            <input
              value={googleInput}
              onChange={(e) => setGoogleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLoadGoogle(); }}
              placeholder="Load Google Font..."
              className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleLoadGoogle}
              className="h-7 px-2 rounded-md bg-primary text-primary-foreground text-xs"
            >
              Load
            </button>
          </div>

          {category === "all" ? (
            <div className="max-h-56 overflow-y-auto space-y-1">
              {Object.entries(categorizedFonts).map(([cat, fonts]) => (
                <div key={cat}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 py-0.5 sticky top-0 bg-popover">
                    {cat}
                  </div>
                  {fonts.map((f) => (
                    <FontItem
                      key={f.family}
                      family={f.family}
                      isFav={isFavorite(f.family)}
                      onSelect={() => handleSelectFont(f.family)}
                      onToggleFav={() => toggleFavoriteFont(f.family)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {displayFonts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {isLoading ? "Detecting fonts..." : "No fonts found"}
                </p>
              )}
              {displayFonts.map((f) => (
                <FontItem
                  key={f.family}
                  family={f.family}
                  isFav={isFavorite(f.family)}
                  onSelect={() => handleSelectFont(f.family)}
                  onToggleFav={() => toggleFavoriteFont(f.family)}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FontItem({ family, isFav, onSelect, onToggleFav }: { family: string; isFav: boolean; onSelect: () => void; onToggleFav: () => void }) {
  return (
    <div className="flex items-center gap-1 group">
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted text-left truncate"
        style={{ fontFamily: family }}
      >
        {family}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
        className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground"
        title={isFav ? "Remove from favorites" : "Add to favorites"}
      >
        {isFav ? "★" : "☆"}
      </button>
    </div>
  );
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 42, 48, 60, 72];

function FontSizeSelector() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-xs font-bold">
          T
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-28 p-1">
        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => {
                const editor = useEditorBridge.getState().editor;
                if (editor) editor.chain().focus().setFontSize(`${size}px`).run();
              }}
              className="flex w-full items-center justify-center rounded px-2 py-1 text-sm hover:bg-muted"
            >
              {size}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const EMOJIS = ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","🥰","🤗","🤩","😘","😗","😚","😙","🥲","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😔","😪","🤤","😴","😷","🤒","🤕","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍","💅","🤳","💪","🦵","🦶","👂","🦻","👃","🧠","🫀","🫁","🦷","🦴","👀","👁","👅","👄","💋","❤","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣","💕","💞","💓","💗","💖","💘","💝","💟","☮","✝","☪","🕉","☸","✡","🔯","🕎","☯","☦","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚕","♿","☣","☢","☠","‼","⁉","❓","❔","❕","❗","〰","💱","💲","⚜","🔱","〽","🔰","♻","✅","❌","❎","➕","➖","➗","✖","💟","🉑","☑","🔘","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","🔺","🔻","🔸","🔹","🔶","🔷","🔳","🔲","▪","▫","◾","◽","◻","◼","🟧","🟨","🟩","🟦","🟪","⬛","⬜","🟫"];

function EmojiPicker() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Smile size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="max-h-56 overflow-y-auto grid grid-cols-8 gap-0.5">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                const editor = useEditorBridge.getState().editor;
                if (editor) editor.chain().focus().insertContent(emoji).run();
              }}
              className="flex items-center justify-center h-8 w-8 rounded hover:bg-muted text-lg"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const COLORS = [
  "#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#efefef","#f3f3f3","#ffffff",
  "#980000","#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8","#0000ff","#9900ff","#ff00ff",
  "#e6b8af","#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#c9daf8","#cfe2f3","#d9d2e9","#ead1dc",
  "#dd7e6b","#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#a4c2f4","#9fc5e8","#b4a7d6","#d5a6bd",
  "#cc4125","#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6d9eeb","#6fa8dc","#8e7cc3","#c27ba0",
  "#a61c00","#cc0000","#e69138","#f1c232","#6aa84f","#45818e","#3c78d8","#3d85c6","#674ea7","#a64d79",
  "#85200c","#990000","#b45f06","#bf9000","#38761d","#134f5c","#1155cc","#0b5394","#351c75","#741b47",
  "#5b0f00","#660000","#783f04","#7f6000","#274e13","#0c343d","#1c4587","#073763","#20124d","#4c1130",
];

function ColorPicker({ onChange, label }: { onChange: (color: string) => void; label: string }) {
  return (
    <div className="p-2">
      <p className="text-xs font-medium text-muted-foreground mb-2">{label}</p>
      <div className="grid grid-cols-10 gap-0.5">
        {COLORS.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            className="h-5 w-5 rounded-sm border border-border hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <input
        type="color"
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-6 w-full cursor-pointer rounded border border-border bg-transparent"
      />
    </div>
  );
}

function TextColorButton() {
  const editor = useEditorBridge((s) => s.editor);
  useEditorBridge((s) => s.version);
  const hasColor = editor ? editor.isActive("textStyle") && !!editor.getAttributes("textStyle").color : false;
  const hasHighlight = editor ? editor.isActive("highlight") : false;
  const isActive = hasColor || hasHighlight;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" data-state={isActive ? "on" : "off"} className="h-8 w-8 data-[state=on]:bg-muted">
          <Palette size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <ColorPicker label="Text Color" onChange={(c) => editor?.chain().focus().setColor(c).run()} />
        <Separator />
        <div className="p-2">
          <ColorPicker label="Highlight Color" onChange={(c) => editor?.chain().focus().setHighlight({ color: c }).run()} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TableMenu() {
  const insertTable = (rows: number, cols: number) => {
    useEditorBridge.getState().editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Table size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        <DropdownMenuItem onClick={() => insertTable(3, 3)}>Insert 3x3 Table</DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertTable(4, 4)}>Insert 4x4 Table</DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertTable(5, 5)}>Insert 5x5 Table</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().addColumnBefore().run())}>Add Column Left</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().addColumnAfter().run())}>Add Column Right</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().deleteColumn().run())}>Delete Column</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().addRowBefore().run())}>Add Row Above</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().addRowAfter().run())}>Add Row Below</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().deleteRow().run())}>Delete Row</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().mergeCells().run())}>Merge Cells</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().splitCell().run())}>Split Cell</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().deleteTable().run())}>Delete Table</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export async function openFile() {
  const openRaw = (raw: string, name: string) => {
    const format = getFormatFromPath(name);
    let content: string;
    let mode: EditorMode = "rich";
    let isCorrupted = false;
    if (format === "ldp") {
      const parsed = deserializeLdp(raw);
      if (parsed) {
        content = parsed.content;
        mode = (parsed.mode as EditorMode) ?? "rich";
      } else {
        content = `<p style="color:hsl(var(--danger));font-weight:500">This document is corrupted or not a valid LinkDit Pad document.</p>`;
        isCorrupted = true;
      }
    } else if (format === "txt") {
      content = raw;
      mode = "plain";
    } else if (format === "md") {
      content = raw;
      mode = "markdown";
    } else {
      content = raw;
    }
    const { openTab, renameTab, markSaved } = useEditorStore.getState();
    const tabId = openTab({ content, mode });
    const fileName = name.split("\\").pop()?.split("/").pop() ?? "Untitled";
    renameTab(tabId, fileName.replace(/\.\w+$/, ""));
    if (!isCorrupted) {
      markSaved(tabId, name);
    }
  };

  try {
    const { open: showOpen } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const file = await showOpen({ multiple: false, filters: getOpenFilters() });
    if (file) {
      const raw = await readTextFile(file as string);
      openRaw(raw, file as string);
    }
  } catch {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = getBrowserAccept();
    input.onchange = async (e) => {
      const file2 = (e.target as HTMLInputElement).files?.[0];
      if (file2) {
        const raw = await file2.text();
        openRaw(raw, file2.name);
      }
    };
    input.click();
  }
}

export async function saveFile() {
  const editor = useEditorBridge.getState().editor;
  const state = useEditorStore.getState();
  const activeTab = state.tabs[state.groups[state.activeGroupId]?.activeTabId ?? ""];
  if (!editor || !activeTab) return;
  const content = activeTab.mode === "rich" ? editor.getHTML() : activeTab.content;

  if (activeTab.meta.filePath) {
    const format = getFormatFromPath(activeTab.meta.filePath);
    const output = prepareContentForSave(content, activeTab.mode, activeTab.meta.title, format);
    try {
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      await writeTextFile(activeTab.meta.filePath, output);
      state.markSaved(activeTab.meta.id, activeTab.meta.filePath);
      return;
    } catch {
      downloadFile(output, activeTab.meta.title, format);
      state.markSaved(activeTab.meta.id, activeTab.meta.filePath);
      return;
    }
  }

  await saveFileAs();
}

export async function saveFileAs() {
  const editor = useEditorBridge.getState().editor;
  const state = useEditorStore.getState();
  const activeTab = state.tabs[state.groups[state.activeGroupId]?.activeTabId ?? ""];
  if (!editor || !activeTab) return;
  const content = activeTab.mode === "rich" ? editor.getHTML() : activeTab.content;

  try {
    const { save: showSave } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const filePath = await showSave({
      filters: getSaveFilters(),
      defaultPath: `${activeTab.meta.title}.ldp`,
    });
    if (!filePath) return;
    const format = getFormatFromPath(filePath as string);
    const output = prepareContentForSave(content, activeTab.mode, activeTab.meta.title, format);
    await writeTextFile(filePath as string, output);
    state.markSaved(activeTab.meta.id, filePath as string);
  } catch {
    const format = getFormatFromPath(activeTab.meta.filePath ?? `${activeTab.meta.title}.ldp`);
    const output = prepareContentForSave(content, activeTab.mode, activeTab.meta.title, format);
    downloadFile(output, activeTab.meta.title, format);
    state.markSaved(activeTab.meta.id, activeTab.meta.filePath);
  }
}

function downloadFile(content: string, title: string, format: import("@/lib/fileFormats").DocumentFormat) {
  const mimeType = getFormatMimeType(format);
  const ext = getFormatExtension(format);
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

function MenuBar() {
  const openTab = useEditorStore((s) => s.openTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const togglePalette = useCommandPaletteStore((s) => s.toggle);
  const toggleSearch = useSearchStore((s) => s.setIsVisible);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);

  const handleNew = useCallback(() => openTab(), [openTab]);
  const handleClose = useCallback(() => {
    const state = useEditorStore.getState();
    const group = state.groups[activeGroupId];
    if (group?.activeTabId) {
      const tab = state.tabs[group.activeTabId];
      if (tab?.meta.isDirty && !window.confirm(`"${tab.meta.title}" has unsaved changes. Close anyway?`)) return;
      closeTab(group.activeTabId);
    }
  }, [activeGroupId, closeTab]);

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  const menus = [
    {
      label: "File",
      items: [
        { label: "New", shortcut: "Ctrl+N", icon: FilePlus, action: handleNew },
        { label: "Open...", shortcut: "Ctrl+O", icon: File, action: openFile },
        { label: "Save", shortcut: "Ctrl+S", icon: Save, action: saveFile },
        { label: "Save As...", shortcut: "Ctrl+Shift+S", action: saveFileAs },
        { separator: true },
        {
          label: "Export",
          children: [
            { label: "Export PDF", action: handleExportPdf },
          ],
        },
        { separator: true },
        { label: "Close Tab", shortcut: "Ctrl+W", action: handleClose },
        { label: "Exit", action: () => window.close() },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", icon: Undo2, action: withEditor((e) => e.chain().focus().undo().run()) },
        { label: "Redo", shortcut: "Ctrl+Y", icon: Redo2, action: withEditor((e) => e.chain().focus().redo().run()) },
        { separator: true },
        { label: "Cut", shortcut: "Ctrl+X", icon: Scissors, action: () => {
          const ed = useEditorBridge.getState().editor;
          if (ed) {
            const { from, to } = ed.state.selection;
            navigator.clipboard.writeText(ed.state.doc.textBetween(from, to));
            ed.chain().focus().deleteSelection().run();
          }
        } },
        { label: "Copy", shortcut: "Ctrl+C", icon: Copy, action: () => {
          const ed = useEditorBridge.getState().editor;
          if (ed) {
            const { from, to } = ed.state.selection;
            navigator.clipboard.writeText(ed.state.doc.textBetween(from, to));
          }
        } },
        { label: "Paste", shortcut: "Ctrl+V", icon: Clipboard, action: () => navigator.clipboard.readText().then(text => { const ed = useEditorBridge.getState().editor; if (ed) ed.chain().focus().insertContent(text).run(); }) },
        { separator: true },
        { label: "Select All", shortcut: "Ctrl+A", action: () => document.execCommand("selectAll") },
      ],
    },
    {
      label: "View",
      items: [
        { label: "Command Palette", shortcut: "Ctrl+Shift+P", action: togglePalette },
        { separator: true },
        { label: "Toggle Sidebar", shortcut: "Ctrl+B", action: () => useEditorStore.getState().toggleSidebar() },
      ],
    },
    {
      label: "Insert",
      items: [
        { label: "Table", icon: Table, action: () => useEditorBridge.getState().editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
        { label: "Image", icon: Image, action: () => {
          const url = prompt("Enter image URL:");
          if (url) useEditorBridge.getState().editor?.chain().focus().setImage({ src: url }).run();
        }},
        { label: "Link", icon: Link, action: () => {
          const url = prompt("Enter URL:");
          if (url) useEditorBridge.getState().editor?.chain().focus().setLink({ href: url }).run();
        }},
        { separator: true },
        { label: "Horizontal Rule", icon: Minus, action: withEditor((e) => e.chain().focus().setHorizontalRule().run()) },
        { separator: true },
        { label: "Emoji", icon: Smile, action: () => {
          const picker = document.querySelector('[data-emoji-trigger]') as HTMLButtonElement;
          if (picker) picker.click();
        }},
      ],
    },
    {
      label: "Format",
      items: [
        { label: "Bold", shortcut: "Ctrl+B", icon: Bold, action: withEditor((e) => e.chain().focus().toggleBold().run()) },
        { label: "Italic", shortcut: "Ctrl+I", icon: Italic, action: withEditor((e) => e.chain().focus().toggleItalic().run()) },
        { label: "Underline", shortcut: "Ctrl+U", icon: Underline, action: withEditor((e) => e.chain().focus().toggleUnderline().run()) },
        { label: "Strikethrough", icon: Strikethrough, action: withEditor((e) => e.chain().focus().toggleStrike().run()) },
        { label: "Code", icon: Code, action: withEditor((e) => e.chain().focus().toggleCode().run()) },
        { separator: true },
        { label: "Subscript", icon: Subscript, action: withEditor((e) => e.chain().focus().toggleSubscript().run()) },
        { label: "Superscript", icon: Superscript, action: withEditor((e) => e.chain().focus().toggleSuperscript().run()) },
        { separator: true },
        { label: "Clear Formatting", icon: Eraser, action: withEditor((e) => e.chain().focus().clearNodes().unsetAllMarks().run()) },
        { separator: true },
        { label: "Heading 1", icon: Heading1, action: withEditor((e) => e.chain().focus().toggleHeading({ level: 1 }).run()) },
        { label: "Heading 2", icon: Heading2, action: withEditor((e) => e.chain().focus().toggleHeading({ level: 2 }).run()) },
        { label: "Heading 3", icon: Heading3, action: withEditor((e) => e.chain().focus().toggleHeading({ level: 3 }).run()) },
        { separator: true },
        { label: "Blockquote", icon: Quote, action: withEditor((e) => e.chain().focus().toggleBlockquote().run()) },
        { label: "Code Block", icon: Code, action: withEditor((e) => e.chain().focus().toggleCodeBlock().run()) },
      ],
    },
    {
      label: "Tools",
      items: [
        { label: "Search", shortcut: "Ctrl+F", icon: Search, action: () => toggleSearch(true) },
        { label: "Replace", shortcut: "Ctrl+H", icon: Replace, action: () => toggleSearch(true) },
        { separator: true },
        { label: "Word Count", action: () => {
          const editor = useEditorBridge.getState().editor;
          if (editor) {
            const text = editor.state.doc.textContent;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            alert(`Words: ${words}\nCharacters: ${chars}`);
          }
        }},
      ],
    },
  ];

  return (
    <div className="flex h-8 items-center gap-0.5 px-1">
      {menus.map((menu) => (
        <DropdownMenu key={menu.label}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              {menu.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[200px]">
            {menu.items.map((item, idx) => {
              if ("separator" in item && item.separator) return <DropdownMenuSeparator key={idx} />;
              if ("children" in item && item.children) {
                return (
                  <DropdownMenuSub key={item.label}>
                    <DropdownMenuSubTrigger>{item.label}</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {item.children.map((child, cidx) => {
                        if ("separator" in child && child.separator) return <DropdownMenuSeparator key={cidx} />;
                        return (
                          <DropdownMenuItem key={child.label} onClick={child.action}>
                            {child.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              }
              const i = item as { label: string; shortcut?: string; icon?: React.ElementType; action: () => void };
              return (
                <DropdownMenuItem key={i.label} onClick={i.action}>
                  {i.icon ? <i.icon size={14} className="mr-1" /> : null}
                  {i.label}
                  {i.shortcut ? <DropdownMenuShortcut>{i.shortcut}</DropdownMenuShortcut> : null}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  );
}

function ToolbarActions() {
  const editor = useEditorBridge((s) => s.editor);
  useEditorBridge((s) => s.version);
  const openTab = useEditorStore((s) => s.openTab);
  const toggleSearch = useSearchStore((s) => s.setIsVisible);
  const toggleSettings = useSettingsStore((s) => s.toggle);
  const resolvedMode = useThemeStore((s) => s.resolvedMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);

  const b = (name: string, attrs?: Record<string, string | boolean>) => editor?.isActive(name, attrs) ?? false;

  return (
    <div className="flex items-center gap-0.5 px-2 overflow-x-auto">
      <ToolbarButton icon={FilePlus} label="New" shortcut="Ctrl+N" onClick={() => openTab()} />
      <ToolbarButton icon={File} label="Open" shortcut="Ctrl+O" onClick={openFile} />
      <ToolbarButton icon={Save} label="Save" shortcut="Ctrl+S" onClick={saveFile} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton icon={Undo2} label="Undo" shortcut="Ctrl+Z" isActive={false} onClick={withEditor((e) => e.chain().focus().undo().run())} />
      <ToolbarButton icon={Redo2} label="Redo" shortcut="Ctrl+Y" isActive={false} onClick={withEditor((e) => e.chain().focus().redo().run())} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton icon={Scissors} label="Cut" shortcut="Ctrl+X" onClick={() => {
        const ed = useEditorBridge.getState().editor;
        if (ed) {
          const { from, to } = ed.state.selection;
          navigator.clipboard.writeText(ed.state.doc.textBetween(from, to));
          ed.chain().focus().deleteSelection().run();
        }
      }} />
      <ToolbarButton icon={Copy} label="Copy" shortcut="Ctrl+C" onClick={() => {
        const ed = useEditorBridge.getState().editor;
        if (ed) {
          const { from, to } = ed.state.selection;
          navigator.clipboard.writeText(ed.state.doc.textBetween(from, to));
        }
      }} />
      <ToolbarButton icon={Clipboard} label="Paste" shortcut="Ctrl+V" onClick={() => navigator.clipboard.readText().then(text => { const ed = useEditorBridge.getState().editor; if (ed) ed.chain().focus().insertContent(text).run(); })} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton icon={Bold} label="Bold" shortcut="Ctrl+B" isActive={b("bold")} onClick={withEditor((e) => e.chain().focus().toggleBold().run())} />
      <ToolbarButton icon={Italic} label="Italic" shortcut="Ctrl+I" isActive={b("italic")} onClick={withEditor((e) => e.chain().focus().toggleItalic().run())} />
      <ToolbarButton icon={Underline} label="Underline" shortcut="Ctrl+U" isActive={b("underline")} onClick={withEditor((e) => e.chain().focus().toggleUnderline().run())} />
      <ToolbarButton icon={Strikethrough} label="Strikethrough" isActive={b("strike")} onClick={withEditor((e) => e.chain().focus().toggleStrike().run())} />
      <ToolbarButton icon={Highlighter} label="Highlight" isActive={b("highlight")} onClick={withEditor((e) => e.chain().focus().toggleHighlight().run())} />
      <TextColorButton />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <FontSelector />
      <FontSizeSelector />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton icon={AlignLeft} label="Align Left" isActive={b("textAlign", { textAlign: "left" })} onClick={withEditor((e) => e.chain().focus().setTextAlign("left").run())} />
      <ToolbarButton icon={AlignCenter} label="Align Center" isActive={b("textAlign", { textAlign: "center" })} onClick={withEditor((e) => e.chain().focus().setTextAlign("center").run())} />
      <ToolbarButton icon={AlignRight} label="Align Right" isActive={b("textAlign", { textAlign: "right" })} onClick={withEditor((e) => e.chain().focus().setTextAlign("right").run())} />
      <ToolbarButton icon={AlignJustify} label="Justify" isActive={b("textAlign", { textAlign: "justify" })} onClick={withEditor((e) => e.chain().focus().setTextAlign("justify").run())} />
      <ToolbarButton icon={Indent} label="Indent" onClick={withEditor((e) => e.chain().focus().sinkListItem("listItem").run())} />
      <ToolbarButton icon={Outdent} label="Outdent" onClick={withEditor((e) => e.chain().focus().liftListItem("listItem").run())} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton icon={List} label="Bullet List" isActive={b("bulletList")} onClick={withEditor((e) => e.chain().focus().toggleBulletList().run())} />
      <ToolbarButton icon={ListOrdered} label="Number List" isActive={b("orderedList")} onClick={withEditor((e) => e.chain().focus().toggleOrderedList().run())} />
      <ToolbarButton icon={ListChecks} label="Task List" isActive={b("taskList")} onClick={withEditor((e) => e.chain().focus().toggleTaskList().run())} />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <TableMenu />
      <EmojiPicker />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <ToolbarButton icon={Search} label="Search" shortcut="Ctrl+F" onClick={() => toggleSearch(true)} />
      <ToolbarButton icon={Replace} label="Replace" shortcut="Ctrl+H" onClick={() => toggleSearch(true)} />
      <div className="ml-auto flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setThemeMode(resolvedMode === "dark" ? "light" : "dark")}
              className="h-8 w-8"
            >
              {resolvedMode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {resolvedMode === "dark" ? "Light Mode" : "Dark Mode"}
          </TooltipContent>
        </Tooltip>
        <ToolbarButton icon={Settings} label="Settings" onClick={toggleSettings} />
      </div>
    </div>
  );
}

export function Toolbar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col border-b border-border bg-card/50"
    >
      <MenuBar />
      <div className="border-t border-border/50">
        <ToolbarActions />
      </div>
    </motion.div>
  );
}
