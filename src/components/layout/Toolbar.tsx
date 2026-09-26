import { useCallback, useEffect, useState } from "react";
import {
  FilePlus, File, Save, Scissors, Copy, Clipboard,
  Bold, Italic, Underline, Strikethrough, Highlighter, Palette,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, ListChecks, Table, Smile,
  Search, Replace, Undo2, Redo2, Type, CaseSensitive,
  Indent, Outdent, Minus, X,
  Heading1, Heading2, Heading3, Quote, Code, Image,
  Link, Subscript, Superscript, Eraser, BookmarkPlus,
  Printer, FileText,
  SquareSplitVertical, SquareSplitHorizontal, ListTree, History,
  DatabaseBackup, LockKeyhole, LockKeyholeOpen, Camera,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useEditorBridge } from "@/store/useEditorBridge";
import { useEditorStore, getFocusedPaneTabId } from "@/store/useEditorStore";
import { useCommandPaletteStore } from "@/store/useCommandPaletteStore";
import { useSearchStore } from "@/store/useSearchStore";
import { useConfirmStore } from "@/store/useConfirmStore";
import { useToastStore } from "@/store/useToastStore";
import { useFontStore, type FontEntry } from "@/store/useFontStore";
import { useRecentFilesStore } from "@/store/useRecentFilesStore";
import { useVersionHistoryStore } from "@/store/useVersionHistoryStore";
import { useBackupStore } from "@/store/useBackupStore";
import { useLockStore } from "@/store/useLockStore";
import { useOutlineStore } from "@/store/useOutlineStore";
import type { EditorMode } from "@/types/editor";
import { addBookmarkAtCursor } from "@/lib/bookmarks";
import { htmlToPlainText } from "@/lib/htmlToText";
import {
  getFormatFromPath, getSaveFilters, getOpenFilters, getBrowserAccept,
  prepareContentForSave, getFormatExtension, getFormatMimeType,
} from "@/lib/fileFormats";
import { getLoader } from "@/lib/loaders";
import { saveFocusedDocument } from "@/lib/saveDocument";
import { openPrintDialog } from "@/lib/print";
import { ScreenshotDialog } from "@/components/features/ScreenshotDialog";
import { useI18n, useI18nStore } from "@/store/useI18nStore";
import { formatDate } from "@/i18n";

const i18n = () => useI18nStore.getState().t;

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
          className="h-[30px] w-[30px] rounded-lg transition-all duration-150 data-[state=on]:bg-primary/15 data-[state=on]:text-primary data-[state=on]:shadow-glow-sm"
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
  { id: "all", label: "toolbar.fontCat.all" },
  { id: "recent", label: "toolbar.fontCat.recent" },
  { id: "favorites", label: "toolbar.fontCat.favorites" },
  { id: "english", label: "toolbar.fontCat.english" },
  { id: "urdu", label: "toolbar.fontCat.urdu" },
  { id: "arabic", label: "toolbar.fontCat.arabic" },
  { id: "monospace", label: "toolbar.fontCat.monospace" },
  { id: "handwriting", label: "toolbar.fontCat.handwriting" },
  { id: "serif", label: "toolbar.fontCat.serif" },
  { id: "sans-serif", label: "toolbar.fontCat.sansSerif" },
  { id: "google", label: "toolbar.fontCat.google" },
];

const GOOGLE_FONTS_LIST = [
  "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Inter",
  "Noto Sans", "Noto Serif", "Playfair Display", "Source Sans Pro",
  "Nunito", "Raleway", "Ubuntu", "Oswald", "Merriweather",
  "Noto Nastaliq Urdu", "Noto Kufi Arabic", "Noto Naskh Arabic",
  "Cairo", "Readex Pro", "Amiri", "Scheherazade New",
];

function FontSelector() {
  const { t } = useI18n();
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
  const importedFonts = useFontStore((s) => s.importedFonts);
  const loadGoogleFont = useFontStore((s) => s.loadGoogleFont);
  const importFont = useFontStore((s) => s.importFont);
  const removeImportedFont = useFontStore((s) => s.removeImportedFont);
  const addRecentFont = useFontStore((s) => s.addRecentFont);
  const toggleFavoriteFont = useFontStore((s) => s.toggleFavoriteFont);
  const isFavorite = useFontStore((s) => s.isFavorite);

  const allFonts = [...systemFonts, ...googleFonts, ...importedFonts];

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
        <Button variant="ghost" size="icon" className="h-8 w-8 font-mono text-xs" aria-label={t("toolbar.fontFamily")} title={t("toolbar.fontFamily")}>
          <CaseSensitive size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <div className="space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("toolbar.searchFonts")}
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
                    {t(c.label)}
                  </button>
                ))}
              </div>

          <div className="flex gap-1">
            <input
              value={googleInput}
              onChange={(e) => setGoogleInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLoadGoogle(); }}
              placeholder={t("toolbar.loadingGoogle")}
              className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={handleLoadGoogle}
              className="h-7 px-2 rounded-md bg-primary text-primary-foreground text-xs"
            >
              {t("toolbar.load")}
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
                    <div key={f.family} className="group flex items-center gap-1">
                      <FontItem
                        family={f.family}
                        isFav={isFavorite(f.family)}
                        onSelect={() => handleSelectFont(f.family)}
                        onToggleFav={() => toggleFavoriteFont(f.family)}
                      />
                      {f.source === "imported" && (
                        <button
                          onClick={() => removeImportedFont(f.family)}
                          className="shrink-0 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t("toolbar.removeImportedFont")}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {displayFonts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {isLoading ? t("toolbar.detectingFonts") : t("toolbar.noFontsFound")}
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

          <button
            onClick={importFont}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            <FilePlus size={14} />
            {t("toolbar.importFont")}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FontItem({ family, isFav, onSelect, onToggleFav }: { family: string; isFav: boolean; onSelect: () => void; onToggleFav: () => void }) {
  const { t } = useI18n();
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
        title={isFav ? t("toolbar.removeFromFavorites") : t("toolbar.addToFavorites")}
      >
        {isFav ? "★" : "☆"}
      </button>
    </div>
  );
}

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 42, 48, 60, 72];

function FontSizeSelector() {
  const { t } = useI18n();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-xs font-bold" aria-label={t("toolbar.fontSize")} title={t("toolbar.fontSize")}>
          <Type size={16} />
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
  const { t } = useI18n();
  const editor = useEditorBridge((s) => s.editor);
  useEditorBridge((s) => s.version);
  const hasColor = editor ? editor.isActive("textStyle") && !!editor.getAttributes("textStyle").color : false;
  const hasHighlight = editor ? editor.isActive("highlight") : false;
  const isActive = hasColor || hasHighlight;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" data-state={isActive ? "on" : "off"} className="h-[30px] w-[30px] rounded-lg data-[state=on]:bg-primary/15 data-[state=on]:text-primary data-[state=on]:shadow-glow-sm">
          <Palette size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <ColorPicker label={t("toolbar.textColor")} onChange={(c) => editor?.chain().focus().setColor(c).run()} />
        <Separator />
        <div className="p-2">
          <ColorPicker label={t("toolbar.highlightColor")} onChange={(c) => editor?.chain().focus().setHighlight({ color: c }).run()} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TableMenu() {
  const { t } = useI18n();
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
        <DropdownMenuItem onClick={() => insertTable(3, 3)}>{t("toolbar.table.insert3x3")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertTable(4, 4)}>{t("toolbar.table.insert4x4")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => insertTable(5, 5)}>{t("toolbar.table.insert5x5")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().addColumnBefore().run())}>{t("toolbar.table.addColumnLeft")}</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().addColumnAfter().run())}>{t("toolbar.table.addColumnRight")}</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().deleteColumn().run())}>{t("toolbar.table.deleteColumn")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().addRowBefore().run())}>{t("toolbar.table.addRowAbove")}</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().addRowAfter().run())}>{t("toolbar.table.addRowBelow")}</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().deleteRow().run())}>{t("toolbar.table.deleteRow")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().mergeCells().run())}>{t("toolbar.table.mergeCells")}</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().splitCell().run())}>{t("toolbar.table.splitCell")}</DropdownMenuItem>
        <DropdownMenuItem onClick={withEditor((e) => e.chain().focus().deleteTable().run())}>{t("toolbar.table.deleteTable")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export async function openFileRaw(raw: string, name: string) {
  const format = getFormatFromPath(name);
  const loader = getLoader(format);
  let content: string;
  let mode: EditorMode;
  let isCorrupted = false;

  if (loader) {
    const result = loader(raw);
    if (result) {
      content = result.content;
      mode = result.mode;
    } else {
      content = `<p style="color:hsl(var(--danger));font-weight:500">This document is corrupted or not a valid LinkDit Pad document.</p>`;
      mode = "rich";
      isCorrupted = true;
    }
  } else {
    content = raw;
    mode = "rich";
  }

  const { openTab, renameTab, markSaved } = useEditorStore.getState();
  const tabId = openTab({ content, mode });
  const fileName = name.split("\\").pop()?.split("/").pop() ?? i18n()("common.untitled");
  renameTab(tabId, fileName.replace(/\.\w+$/, ""));
  if (!isCorrupted) {
    markSaved(tabId, name);
    useToastStore.getState().show("success", i18n()("toast.opened", { name: fileName.replace(/\.\w+$/, "") }));
  } else {
    useToastStore.getState().show("error", i18n()("toast.fileMayBeCorrupted"));
  }
}

export async function openFile() {
  try {
    const { open: showOpen } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const file = await showOpen({ multiple: false, filters: getOpenFilters() });
    if (file) {
      const raw = await readTextFile(file as string);
      await openFileRaw(raw, file as string);
    }
  } catch {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = getBrowserAccept();
    input.onchange = async (e) => {
      const file2 = (e.target as HTMLInputElement).files?.[0];
      if (file2) {
        const raw = await file2.text();
        await openFileRaw(raw, file2.name);
      }
    };
    input.click();
  }
}

export async function openFileAtPath(filePath: string) {
  try {
    const { readTextFile } = await import("@tauri-apps/plugin-fs");
    const raw = await readTextFile(filePath);
    await openFileRaw(raw, filePath);
  } catch {
    useToastStore.getState().show("error", i18n()("toast.couldNotOpenFile", { path: filePath }));
  }
}

export async function saveFile() {
  const outcome = await saveFocusedDocument();
  if (outcome.status === "no-tab") return;
  if (outcome.status === "no-path") {
    await saveFileAs();
    return;
  }
  if (outcome.status === "saved") {
    useToastStore.getState().show("success", i18n()("toast.saved", { title: outcome.title }));
    return;
  }
  if (outcome.status === "not-dirty") {
    const title = useEditorStore.getState().tabs[outcome.tabId]?.meta.title ?? i18n()("common.document");
    useToastStore.getState().show("success", i18n()("toast.saved", { title }));
    return;
  }
  // Disk write failed in the Tauri layer. Preserve the dirty state so the
  // failure is visible and retryable, and offer a browser download of the
  // identical serialized bytes as data-loss protection.
  downloadFile(outcome.output, outcome.title, outcome.format);
  useToastStore.getState().show("warning", i18n()("toast.couldNotSaveToDisk", { message: outcome.message }));
}

export async function saveFileAs() {
  useEditorStore.getState().commitFocusedPaneToTab();
  const editor = useEditorBridge.getState().editor;
  const state = useEditorStore.getState();
  const focusedTabId = getFocusedPaneTabId(state);
  const activeTab = state.tabs[focusedTabId ?? ""];
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
    const fileName = (filePath as string).split("\\").pop()?.split("/").pop() ?? activeTab.meta.title;
    useToastStore.getState().show("success", i18n()("toast.savedAs", { name: fileName }));
  } catch {
    const format = getFormatFromPath(activeTab.meta.filePath ?? `${activeTab.meta.title}.ldp`);
    const output = prepareContentForSave(content, activeTab.mode, activeTab.meta.title, format);
    downloadFile(output, activeTab.meta.title, format);
    state.markSaved(activeTab.meta.id, activeTab.meta.filePath);
    useToastStore.getState().show("warning", i18n()("toast.savedAsDownload"));
  }
}

export async function deleteFile(filePath: string, title: string) {
  try {
    const { remove } = await import("@tauri-apps/plugin-fs");
    await remove(filePath);
    useToastStore.getState().show("success", i18n()("toast.deleted", { title }));
  } catch {
    useToastStore.getState().show("error", i18n()("toast.couldNotDelete", { title }));
    throw new Error("Failed to delete file");
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
  const { t } = useI18n();
  const openTab = useEditorStore((s) => s.openTab);
  const closeTab = useEditorStore((s) => s.closeTab);
  const togglePalette = useCommandPaletteStore((s) => s.toggle);
  const toggleSearch = useSearchStore((s) => s.setIsVisible);
  const activeGroupId = useEditorStore((s) => s.activeGroupId);
  const recentFiles = useRecentFilesStore((s) => s.entries);

  const splitMode = useEditorStore((s) => s.splitMode);
  const activePane = useEditorStore((s) => s.activePane);
  const secondaryTabId = useEditorStore((s) => s.secondaryTabId);
  const groupActiveTabId = useEditorStore((s) => s.groups[s.activeGroupId]?.activeTabId);
  const splitEditor = useEditorStore((s) => s.splitEditor);
  const closeSplit = useEditorStore((s) => s.closeSplit);
  const toggleOutline = useOutlineStore((s) => s.toggle);
  const openVersionHistory = useVersionHistoryStore((s) => s.open);
  const openBackup = useBackupStore((s) => s.open);
  const openLockDialog = useLockStore((s) => s.openDialog);
  const lockLocks = useLockStore((s) => s.locks);
  const unlockedIds = useLockStore((s) => s.unlockedIds);

  const focusedTabId =
    splitMode !== "none" && activePane === "secondary" ? secondaryTabId : groupActiveTabId;
  const focusedProtected = focusedTabId ? !!lockLocks[focusedTabId] : false;
  const focusedIsLocked = focusedTabId
    ? lockLocks[focusedTabId]
      ? !unlockedIds.includes(focusedTabId)
      : false
    : false;

  const handleSplitRight = useCallback(() => splitEditor("right"), [splitEditor]);
  const handleSplitDown = useCallback(() => splitEditor("down"), [splitEditor]);
  const handleCloseSplit = useCallback(() => closeSplit(), [closeSplit]);

  const handleLockDocument = useCallback(() => {
    const state = useEditorStore.getState();
    const id = getFocusedPaneTabId(state);
    if (!id) {
      useToastStore.getState().show("warning", t("toast.noDocumentToLock"));
      return;
    }
    const lockStore = useLockStore.getState();
    if (lockStore.isProtected(id)) {
      if (lockStore.isLocked(id)) {
        useToastStore.getState().show("info", t("toast.alreadyLocked"));
        return;
      }
      lockStore.rejectLock(id);
      useToastStore.getState().show("success", t("toast.lockedAgain"));
      return;
    }
    openLockDialog("lock");
  }, [openLockDialog]);

  const handleUnlockDocument = useCallback(() => {
    const state = useEditorStore.getState();
    const id = getFocusedPaneTabId(state);
    if (!id) {
      useToastStore.getState().show("warning", t("toast.noDocumentToUnlock"));
      return;
    }
    const lockStore = useLockStore.getState();
    if (!lockStore.isProtected(id)) {
      useToastStore.getState().show("info", t("toast.notPasswordProtected"));
      return;
    }
    if (!lockStore.isLocked(id)) {
      useToastStore.getState().show("info", t("toast.alreadyUnlocked"));
      return;
    }
    openLockDialog("unlock");
  }, [openLockDialog]);

  const handleNew = useCallback(() => openTab(), [openTab]);
  const handleClose = useCallback(async () => {
    const state = useEditorStore.getState();
    const group = state.groups[activeGroupId];
    if (group?.activeTabId) {
      const tab = state.tabs[group.activeTabId];
      if (tab?.meta.isDirty) {
        const action = await useConfirmStore.getState().show(
          t("dialogs.confirm.unsavedChangesBody", { title: tab.meta.title })
        );
        if (action === "cancel") return;
        if (action === "save") {
          await saveFile();
        }
      }
      closeTab(group.activeTabId);
    }
  }, [activeGroupId, closeTab]);

  const handleExportPdf = useCallback(() => {
    openPrintDialog();
  }, []);

  const handlePrint = useCallback(() => {
    openPrintDialog();
  }, []);

  const handleOpenRecent = useCallback((entry: { id: string; path: string | null; title: string }) => {
    if (entry.path) {
      openFileAtPath(entry.path);
    } else {
      const state = useEditorStore.getState();
      const tab = state.tabs[entry.id];
      if (tab) {
        useEditorStore.getState().setActiveTab(activeGroupId, entry.id);
      } else {
        openTab();
      }
    }
  }, [activeGroupId, openTab]);

  const handleProperties = useCallback(() => {
    // DocumentPropertiesDialog manages its own state
  }, []);

  const handleImport = useCallback(async (format: "md" | "txt") => {
    try {
      const { open: showOpen } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const file = await showOpen({
        multiple: false,
        filters: [{ name: format === "md" ? "Markdown (*.md)" : "Plain Text (*.txt)", extensions: [format] }]
      });
      if (file) {
        const raw = await readTextFile(file as string);
        const loader = getLoader(format);
        let content = raw;
        let mode: EditorMode = "rich";
        if (loader) {
          const result = loader(raw);
          if (result) {
            content = result.content;
            mode = result.mode;
          }
        }
        const { openTab, renameTab } = useEditorStore.getState();
        const tabId = openTab({ content, mode });
        const fileName = (file as string).split("\\").pop()?.split("/").pop() ?? i18n()("common.untitled");
        renameTab(tabId, fileName.replace(/\.\w+$/, ""));
        useToastStore.getState().show("success", i18n()("toast.imported", { name: fileName.replace(/\.\w+$/, "") }));
      }
    } catch {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = format === "md" ? ".md" : ".txt";
      input.onchange = async (e) => {
        const file2 = (e.target as HTMLInputElement).files?.[0];
        if (file2) {
          const raw = await file2.text();
          const loader = getLoader(format);
          let content = raw;
          let mode: EditorMode = "rich";
          if (loader) {
            const result = loader(raw);
            if (result) {
              content = result.content;
              mode = result.mode;
            }
          }
          const { openTab, renameTab } = useEditorStore.getState();
          const tabId = openTab({ content, mode });
          renameTab(tabId, file2.name.replace(/\.\w+$/, ""));
          useToastStore.getState().show("success", i18n()("toast.imported", { name: file2.name.replace(/\.\w+$/, "") }));
        }
      };
      input.click();
    }
  }, []);

  const menus = [
    {
      label: t("menu.file"),
      items: [
        { label: t("menu.new"), shortcut: "Ctrl+N", icon: FilePlus, action: handleNew },
        { label: t("menu.openFile"), shortcut: "Ctrl+O", icon: File, action: openFile },
        { label: t("menu.save"), shortcut: "Ctrl+S", icon: Save, action: saveFile },
        { label: t("menu.saveAs"), shortcut: "Ctrl+Shift+S", action: saveFileAs },
        { separator: true },
        {
          label: t("menu.import"),
          children: [
            { label: t("menu.importMarkdown"), icon: FileText, action: () => handleImport("md") },
            { label: t("menu.importPlainText"), icon: FileText, action: () => handleImport("txt") },
          ],
        },
        { separator: true },
        {
          label: t("menu.export"),
          children: [
            { label: t("menu.exportPdf"), action: handleExportPdf },
          ],
        },
        { separator: true },
        { label: t("menu.print"), shortcut: "Ctrl+P", icon: Printer, action: handlePrint },
        { separator: true },
        {
          label: t("menu.recentFiles"),
          children: recentFiles.length === 0
            ? [{ label: t("menu.noRecentFiles"), disabled: true }]
            : recentFiles.slice(0, 10).map((entry) => ({
                label: entry.title,
                icon: FileText,
                action: () => handleOpenRecent(entry),
              })),
        },
        { separator: true },
        { label: t("menu.documentProperties"), shortcut: "Ctrl+Shift+I", icon: FileText, action: handleProperties },
        { separator: true },
        { label: t("menu.closeTab"), shortcut: "Ctrl+W", action: handleClose },
        { label: t("menu.exit"), action: () => window.close() },
      ],
    },
    {
      label: t("menu.edit"),
      items: [
        { label: t("menu.undo"), shortcut: "Ctrl+Z", icon: Undo2, action: withEditor((e) => e.chain().focus().undo().run()) },
        { label: t("menu.redo"), shortcut: "Ctrl+Y", icon: Redo2, action: withEditor((e) => e.chain().focus().redo().run()) },
        { separator: true },
        { label: t("menu.cut"), shortcut: "Ctrl+X", icon: Scissors, action: () => {
          const ed = useEditorBridge.getState().editor;
          if (ed) {
            const { from, to } = ed.state.selection;
            navigator.clipboard.writeText(ed.state.doc.textBetween(from, to));
            ed.chain().focus().deleteSelection().run();
          }
        } },
        { label: t("menu.copy"), shortcut: "Ctrl+C", icon: Copy, action: () => {
          const ed = useEditorBridge.getState().editor;
          if (ed) {
            const { from, to } = ed.state.selection;
            navigator.clipboard.writeText(ed.state.doc.textBetween(from, to));
          }
        } },
        { label: t("menu.paste"), shortcut: "Ctrl+V", icon: Clipboard, action: () => navigator.clipboard.readText().then(text => { const ed = useEditorBridge.getState().editor; if (ed) ed.chain().focus().insertContent(text).run(); }) },
        { separator: true },
        { label: t("menu.selectAll"), shortcut: "Ctrl+A", action: () => document.execCommand("selectAll") },
      ],
    },
    {
      label: t("menu.view"),
      items: [
        { label: t("menu.commandPalette"), shortcut: "Ctrl+Shift+P", action: togglePalette },
        { separator: true },
        { label: t("menu.toggleSidebar"), shortcut: "Ctrl+B", action: () => useEditorStore.getState().toggleSidebar() },
        { separator: true },
        {
          label: t("menu.splitRight"),
          icon: SquareSplitVertical,
          action: handleSplitRight,
        },
        {
          label: t("menu.splitDown"),
          icon: SquareSplitHorizontal,
          action: handleSplitDown,
        },
        {
          label: t("menu.closeSplit"),
          icon: SquareSplitHorizontal,
          disabled: splitMode === "none",
          action: handleCloseSplit,
        },
        { separator: true },
        {
          label: t("menu.documentOutline"),
          icon: ListTree,
          action: toggleOutline,
        },
      ],
    },
    {
      label: t("menu.insert"),
      items: [
        { label: t("menu.table"), icon: Table, action: () => useEditorBridge.getState().editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
        { label: t("menu.image"), icon: Image, action: () => {
          const url = prompt(t("toolbar.insert.enterImageUrl"));
          if (url) useEditorBridge.getState().editor?.chain().focus().setImage({ src: url }).run();
        }},
        { label: t("menu.link"), icon: Link, action: () => {
          const url = prompt(t("toolbar.insert.enterUrl"));
          if (url) useEditorBridge.getState().editor?.chain().focus().setLink({ href: url }).run();
        }},
        { separator: true },
        { label: t("menu.horizontalRule"), icon: Minus, action: withEditor((e) => e.chain().focus().setHorizontalRule().run()) },
        { separator: true },
        { label: t("menu.insertEmoji"), icon: Smile, action: () => {
          const picker = document.querySelector('[data-emoji-trigger]') as HTMLButtonElement;
          if (picker) picker.click();
        }},
      ],
    },
    {
      label: t("menu.format"),
      items: [
        { label: t("menu.bold"), shortcut: "Ctrl+B", icon: Bold, action: withEditor((e) => e.chain().focus().toggleBold().run()) },
        { label: t("menu.italic"), shortcut: "Ctrl+I", icon: Italic, action: withEditor((e) => e.chain().focus().toggleItalic().run()) },
        { label: t("menu.underline"), shortcut: "Ctrl+U", icon: Underline, action: withEditor((e) => e.chain().focus().toggleUnderline().run()) },
        { label: t("menu.strikethrough"), icon: Strikethrough, action: withEditor((e) => e.chain().focus().toggleStrike().run()) },
        { label: t("menu.code"), icon: Code, action: withEditor((e) => e.chain().focus().toggleCode().run()) },
        { separator: true },
        { label: t("menu.subscript"), icon: Subscript, action: withEditor((e) => e.chain().focus().toggleSubscript().run()) },
        { label: t("menu.superscript"), icon: Superscript, action: withEditor((e) => e.chain().focus().toggleSuperscript().run()) },
        { separator: true },
        { label: t("menu.clearFormatting"), icon: Eraser, action: withEditor((e) => e.chain().focus().clearNodes().unsetAllMarks().run()) },
        { separator: true },
        { label: t("menu.heading1"), icon: Heading1, action: withEditor((e) => e.chain().focus().toggleHeading({ level: 1 }).run()) },
        { label: t("menu.heading2"), icon: Heading2, action: withEditor((e) => e.chain().focus().toggleHeading({ level: 2 }).run()) },
        { label: t("menu.heading3"), icon: Heading3, action: withEditor((e) => e.chain().focus().toggleHeading({ level: 3 }).run()) },
        { separator: true },
        { label: t("menu.blockquote"), icon: Quote, action: withEditor((e) => e.chain().focus().toggleBlockquote().run()) },
        { label: t("menu.codeBlock"), icon: Code, action: withEditor((e) => e.chain().focus().toggleCodeBlock().run()) },
      ],
    },
    {
      label: t("menu.tools"),
      items: [
        { label: t("menu.search"), shortcut: "Ctrl+F", icon: Search, action: () => toggleSearch(true) },
        { label: t("menu.replace"), shortcut: "Ctrl+H", icon: Replace, action: () => toggleSearch(true) },
        { separator: true },
        { label: t("menu.versionHistory"), icon: History, action: () => openVersionHistory() },
        { label: t("menu.backupRecovery"), icon: DatabaseBackup, action: () => openBackup() },
        { separator: true },
        { label: t("menu.wordCount"), action: () => {
          const editor = useEditorBridge.getState().editor;
          if (editor) {
            const text = editor.state.doc.textContent;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            alert(t("menu.wordsChars", { words, chars }));
          }
        }},
      ],
    },
    {
      label: t("menu.document"),
      items: [
        {
          label: focusedIsLocked ? t("menu.lockedReadOnly") : t("menu.lockDocument"),
          icon: LockKeyhole,
          disabled: focusedIsLocked || !focusedTabId,
          action: handleLockDocument,
        },
        {
          label: t("menu.unlockDocument"),
          icon: LockKeyholeOpen,
          disabled: !focusedProtected || !focusedIsLocked || !focusedTabId,
          action: handleUnlockDocument,
        },
      ],
    },
  ];

  return (
    <div className="flex h-9 items-center gap-0.5 px-1.5">
      {menus.map((menu) => (
        <DropdownMenu key={menu.label}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-7 rounded-lg px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted/70 hover:text-foreground">
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
                        const childItem = child as { label: string; disabled?: boolean; action?: () => void; icon?: React.ElementType };
                        if (childItem.disabled) {
                          return (
                            <DropdownMenuItem key={childItem.label} disabled className="text-muted-foreground">
                              {childItem.label}
                            </DropdownMenuItem>
                          );
                        }
                        return (
                          <DropdownMenuItem key={childItem.label} onClick={childItem.action}>
                            {childItem.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                );
              }
              const i = item as { label: string; shortcut?: string; icon?: React.ElementType; action: () => void; disabled?: boolean };
              return (
                <DropdownMenuItem key={i.label} onClick={i.action} disabled={i.disabled}>
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

function DocumentPropertiesDialog() {
  const { t, language } = useI18n();
  const { tabs, groups, activeGroupId } = useEditorStore();
  const group = groups[activeGroupId];
  const activeTabId = group?.activeTabId;
  const tab = activeTabId ? tabs[activeTabId] : null;
  const editor = useEditorBridge.getState().editor;
  const [showProperties, setShowProperties] = useState(false);
  const [fileSize, setFileSize] = useState(t("properties.loading"));

  const getContentStats = () => {
    if (!tab) return { words: 0, chars: 0, lines: 0 };
    let content = tab.content;
    if (editor && tab.mode === "rich") {
      content = editor.getHTML();
    }
    const plainText = htmlToPlainText(content);
    const words = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
    const chars = plainText.length;
    const lines = plainText.split("\n").length;
    return { words, chars, lines };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileSize = async (): Promise<string> => {
    if (!tab?.meta.filePath) return t("properties.unavailableUnsaved");
    try {
      const { stat } = await import("@tauri-apps/plugin-fs");
      const statResult = await stat(tab.meta.filePath);
      return formatFileSize(statResult.size);
    } catch {
      return t("properties.unavailable");
    }
  };

  useEffect(() => {
    if (tab) {
      getFileSize().then(setFileSize);
    }
  }, [tab?.meta.filePath]);

  if (!tab) return null;

  const stats = getContentStats();
  const format = tab.meta.filePath ? tab.meta.filePath.split(".").pop()?.toUpperCase() : t("properties.unsaved");

  return (
    <Dialog open={showProperties} onOpenChange={(open) => !open && setShowProperties(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("properties.title")}</DialogTitle>
          <DialogDescription>
            {t("properties.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">{t("properties.infoTitle")}</span>
            <span className="font-medium truncate">{tab.meta.title}</span>
            <span className="text-muted-foreground">{t("properties.filePath")}</span>
            <span className="font-medium truncate">{tab.meta.filePath || t("properties.unsaved")}</span>
            <span className="text-muted-foreground">{t("properties.fileType")}</span>
            <span className="font-medium">{format}</span>
            <span className="text-muted-foreground">{t("properties.fileSize")}</span>
            <span className="font-medium">{fileSize}</span>
            <span className="text-muted-foreground">{t("properties.words")}</span>
            <span className="font-medium">{stats.words}</span>
            <span className="text-muted-foreground">{t("properties.characters")}</span>
            <span className="font-medium">{stats.chars}</span>
            <span className="text-muted-foreground">{t("properties.lines")}</span>
            <span className="font-medium">{stats.lines}</span>
            <span className="text-muted-foreground">{t("properties.created")}</span>
            <span className="font-medium">{formatDate(language, tab.meta.createdAt)}</span>
            <span className="text-muted-foreground">{t("properties.modified")}</span>
            <span className="font-medium">{formatDate(language, tab.meta.updatedAt)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setShowProperties(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToolbarActions() {
  const { t } = useI18n();
  const editor = useEditorBridge((s) => s.editor);
  useEditorBridge((s) => s.version);
  const openTab = useEditorStore((s) => s.openTab);
  const toggleSearch = useSearchStore((s) => s.setIsVisible);
  const [screenshotOpen, setScreenshotOpen] = useState(false);

  const b = (name: string, attrs?: Record<string, string | boolean>) => editor?.isActive(name, attrs) ?? false;

  return (
    <>
      <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1">
      <ToolbarButton icon={FilePlus} label={t("menu.new")} shortcut="Ctrl+N" onClick={() => openTab()} />
      <ToolbarButton icon={File} label={t("menu.openFile")} shortcut="Ctrl+O" onClick={openFile} />
      <ToolbarButton icon={Save} label={t("menu.save")} shortcut="Ctrl+S" onClick={saveFile} />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <ToolbarButton icon={Undo2} label={t("menu.undo")} shortcut="Ctrl+Z" isActive={false} onClick={withEditor((e) => e.chain().focus().undo().run())} />
      <ToolbarButton icon={Redo2} label={t("menu.redo")} shortcut="Ctrl+Y" isActive={false} onClick={withEditor((e) => e.chain().focus().redo().run())} />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <ToolbarButton icon={Scissors} label={t("menu.cut")} shortcut="Ctrl+X" onClick={() => {
        const ed = useEditorBridge.getState().editor;
        if (ed) {
          const { from, to } = ed.state.selection;
          navigator.clipboard.writeText(ed.state.doc.textBetween(from, to));
          ed.chain().focus().deleteSelection().run();
        }
      }} />
      <ToolbarButton icon={Copy} label={t("menu.copy")} shortcut="Ctrl+C" onClick={() => {
        const ed = useEditorBridge.getState().editor;
        if (ed) {
          const { from, to } = ed.state.selection;
          navigator.clipboard.writeText(ed.state.doc.textBetween(from, to));
        }
      }} />
      <ToolbarButton icon={Clipboard} label={t("menu.paste")} shortcut="Ctrl+V" onClick={() => navigator.clipboard.readText().then(text => { const ed = useEditorBridge.getState().editor; if (ed) ed.chain().focus().insertContent(text).run(); })} />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <ToolbarButton icon={Bold} label={t("menu.bold")} shortcut="Ctrl+B" isActive={b("bold")} onClick={withEditor((e) => e.chain().focus().toggleBold().run())} />
      <ToolbarButton icon={Italic} label={t("menu.italic")} shortcut="Ctrl+I" isActive={b("italic")} onClick={withEditor((e) => e.chain().focus().toggleItalic().run())} />
      <ToolbarButton icon={Underline} label={t("menu.underline")} shortcut="Ctrl+U" isActive={b("underline")} onClick={withEditor((e) => e.chain().focus().toggleUnderline().run())} />
      <ToolbarButton icon={Strikethrough} label={t("menu.strikethrough")} isActive={b("strike")} onClick={withEditor((e) => e.chain().focus().toggleStrike().run())} />
      <ToolbarButton icon={Highlighter} label={t("toolbar.highlight")} isActive={b("highlight")} onClick={withEditor((e) => e.chain().focus().toggleHighlight().run())} />
      <TextColorButton />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <FontSelector />
      <FontSizeSelector />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <ToolbarButton icon={AlignLeft} label={t("toolbar.alignLeft")} isActive={b("textAlign", { textAlign: "left" })} onClick={withEditor((e) => e.chain().focus().setTextAlign("left").run())} />
      <ToolbarButton icon={AlignCenter} label={t("toolbar.alignCenter")} isActive={b("textAlign", { textAlign: "center" })} onClick={withEditor((e) => e.chain().focus().setTextAlign("center").run())} />
      <ToolbarButton icon={AlignRight} label={t("toolbar.alignRight")} isActive={b("textAlign", { textAlign: "right" })} onClick={withEditor((e) => e.chain().focus().setTextAlign("right").run())} />
      <ToolbarButton icon={AlignJustify} label={t("toolbar.alignJustify")} isActive={b("textAlign", { textAlign: "justify" })} onClick={withEditor((e) => e.chain().focus().setTextAlign("justify").run())} />
      <ToolbarButton icon={Indent} label={t("toolbar.indent")} onClick={withEditor((e) => e.chain().focus().sinkListItem("listItem").run())} />
      <ToolbarButton icon={Outdent} label={t("toolbar.outdent")} onClick={withEditor((e) => e.chain().focus().liftListItem("listItem").run())} />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <ToolbarButton icon={List} label={t("toolbar.bulletList")} isActive={b("bulletList")} onClick={withEditor((e) => e.chain().focus().toggleBulletList().run())} />
      <ToolbarButton icon={ListOrdered} label={t("toolbar.numberList")} isActive={b("orderedList")} onClick={withEditor((e) => e.chain().focus().toggleOrderedList().run())} />
      <ToolbarButton icon={ListChecks} label={t("toolbar.taskList")} isActive={b("taskList")} onClick={withEditor((e) => e.chain().focus().toggleTaskList().run())} />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <TableMenu />
      <EmojiPicker />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <ToolbarButton icon={Search} label={t("menu.search")} shortcut="Ctrl+F" onClick={() => toggleSearch(true)} />
      <ToolbarButton icon={Replace} label={t("menu.replace")} shortcut="Ctrl+H" onClick={() => toggleSearch(true)} />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <ToolbarButton icon={BookmarkPlus} label={t("toolbar.addBookmark")} shortcut="Ctrl+Shift+K" onClick={addBookmarkAtCursor} />
      <Separator orientation="vertical" className="mx-1.5 h-5 rounded-full bg-border/60" />
      <ToolbarButton icon={Camera} label={t("toolbar.captureScreenshot")} onClick={() => setScreenshotOpen(true)} />
      </div>
      <ScreenshotDialog open={screenshotOpen} onOpenChange={setScreenshotOpen} />
    </>
  );
}

export function Toolbar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col border-b border-border/80 bg-toolbar"
    >
      <MenuBar />
      <div className="border-t border-border/40">
        <ToolbarActions />
      </div>
      <DocumentPropertiesDialog />
    </motion.div>
  );
}
