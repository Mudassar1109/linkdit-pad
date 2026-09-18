import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Search, X, ChevronUp, ChevronDown, Replace, History, CornerDownRight, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useSidebarSearchStore } from "@/store/useSidebarSearchStore";
import { useEditorStore } from "@/store/useEditorStore";
import { useEditorBridge } from "@/store/useEditorBridge";
import { getPlainTarget } from "@/lib/bookmarks";
import { docPositionsForCharOffsets } from "@/lib/bookmarkPositions";
import { findMatchByOrdinal, searchText, replaceAllMatches, type SearchOptions } from "@/lib/textSearch";
import type { DocSearchMatch } from "@/store/useSidebarSearchStore";

function HighlightPreview({ match }: { match: DocSearchMatch }) {
  const before = match.content.slice(0, match.matchStart);
  const hit = match.content.slice(match.matchStart, match.matchEnd);
  const after = match.content.slice(match.matchEnd);
  return (
    <span className="truncate">
      <span className="text-foreground/60">{before}</span>
      <mark className="rounded-sm bg-primary/30 px-0.5 text-foreground">{hit}</mark>
      <span className="text-foreground/60">{after}</span>
    </span>
  );
}

export function SearchPanel() {
  const {
    query, isRegex, caseSensitive, wholeWord, history,
    results, totalMatches, matchedDocs, isSearching,
    setQuery, setIsRegex, setCaseSensitive, setWholeWord,
    runSearch, clearSearch, pushHistory, clearHistory,
  } = useSidebarSearchStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showReplace, setShowReplace] = useState(false);
  const [replaceText, setReplaceText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [replaceMessage, setReplaceMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeGroupId = useEditorStore((s) => s.activeGroupId);

  const debouncedRun = useCallback(() => {
    if (historyTimer.current) clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => runSearch(), 200);
  }, [runSearch]);

  useEffect(() => {
    debouncedRun();
    return () => {
      if (historyTimer.current) clearTimeout(historyTimer.current);
    };
  }, [query, isRegex, caseSensitive, wholeWord, debouncedRun]);

  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  const groups = useMemo(() => {
    const map = new Map<string, { idx: number; match: DocSearchMatch }[]>();
    for (let idx = 0; idx < results.length; idx++) {
      const r = results[idx];
      const arr = map.get(r.fileId) ?? [];
      arr.push({ idx, match: r });
      map.set(r.fileId, arr);
    }
    return [...map.entries()];
  }, [results]);

  const current = results[currentIndex];

  const getOptions = (): SearchOptions => ({ isRegex, caseSensitive, wholeWord });

  const jumpTo = (fileId: string, ordinal: number) => {
    const store = useEditorStore.getState();
    const group = store.groups[store.activeGroupId];
    if (group && group.activeTabId !== fileId) {
      store.setActiveTab(store.activeGroupId, fileId);
    }
    setTimeout(() => {
      const opts = getOptions();
      const q = useSidebarSearchStore.getState().query.trim();
      const editor = useEditorBridge.getState().editor;
      const activeTab = useEditorStore.getState().tabs[fileId];
      if (editor && activeTab) {
        const text = editor.state.doc.textContent;
        const m = findMatchByOrdinal(text, q, opts, ordinal);
        if (!m) return;
        const [startPos, endPos] = docPositionsForCharOffsets(editor.state.doc, [
          m.offset,
          m.offset + (m.matchEnd - m.matchStart),
        ]);
        if (endPos > startPos) {
          editor.chain().focus().setTextSelection({ from: startPos, to: endPos }).scrollIntoView().run();
        } else {
          editor.chain().focus().setTextSelection(startPos).scrollIntoView().run();
        }
      } else {
        const el = getPlainTarget(fileId);
        if (el) {
          const m = findMatchByOrdinal(el.value, q, opts, ordinal);
          if (!m) return;
          el.setSelectionRange(m.offset, m.offset + (m.matchEnd - m.matchStart));
          el.focus();
        }
      }
    }, 30);
  };

  const goToIndex = (idx: number) => {
    const i = Math.max(0, Math.min(idx, results.length - 1));
    setCurrentIndex(i);
    const r = results[i];
    if (r) jumpTo(r.fileId, r.ordinal);
  };

  const commitHistory = () => {
    const q = query.trim();
    if (q) pushHistory(q);
    setShowHistory(false);
  };

  const replaceSelected = () => {
    if (!current) return;
    const opts = getOptions();
    const q = query.trim();
    if (!q) return;
    const activeTab = useEditorStore.getState().tabs[current.fileId];
    if (!activeTab) return;

    const editor = useEditorBridge.getState().editor;
    const isActive =
      useEditorStore.getState().groups[activeGroupId]?.activeTabId === current.fileId;

    if (editor && isActive) {
      const text = editor.state.doc.textContent;
      const m = findMatchByOrdinal(text, q, opts, current.ordinal);
      if (!m) return;
      const [from, to] = docPositionsForCharOffsets(editor.state.doc, [
        m.offset,
        m.offset + (m.matchEnd - m.matchStart),
      ]);
      editor.chain().focus().deleteRange({ from, to }).insertContent(replaceText).run();
      setReplaceMessage("Replaced 1 occurrence");
      useSidebarSearchStore.getState().runSearch();
      return;
    }

    const el = getPlainTarget(current.fileId);
    if (el) {
      const m = findMatchByOrdinal(el.value, q, opts, current.ordinal);
      if (!m) return;
      const start = m.offset;
      const end = m.offset + (m.matchEnd - m.matchStart);
      el.setRangeText(replaceText, start, end, "select");
      useEditorStore.getState().updateContent(current.fileId, el.value);
      setReplaceMessage("Replaced 1 occurrence");
      useSidebarSearchStore.getState().runSearch();
      return;
    }

    const sourceText = current.sourceText;
    const m = findMatchByOrdinal(sourceText, q, opts, current.ordinal);
    if (!m) return;
    const newText =
      sourceText.slice(0, m.offset) +
      replaceText +
      sourceText.slice(m.offset + (m.matchEnd - m.matchStart));
    useEditorStore.getState().updateContent(current.fileId, newText);
    setReplaceMessage("Replaced 1 occurrence");
    useSidebarSearchStore.getState().runSearch();
  };

  const replaceAllSelected = () => {
    if (!current) return;
    const opts = getOptions();
    const q = query.trim();
    if (!q) return;

    const editor = useEditorBridge.getState().editor;
    const activeTab = useEditorStore.getState().tabs[current.fileId];
    const isActive =
      useEditorStore.getState().groups[activeGroupId]?.activeTabId === current.fileId;

    if (editor && activeTab && isActive) {
      const text = editor.state.doc.textContent;
      const matches = searchText(text, q, opts);
      const pairs = matches.map((m) =>
        docPositionsForCharOffsets(editor.state.doc, [m.offset, m.offset + (m.matchEnd - m.matchStart)])
      );
      for (let i = pairs.length - 1; i >= 0; i--) {
        const [from, to] = pairs[i];
        if (to > from) editor.chain().focus().deleteRange({ from, to }).insertContent(replaceText).run();
      }
      setReplaceMessage(`Replaced ${pairs.length} occurrences`);
      useSidebarSearchStore.getState().runSearch();
      return;
    }

    const el = getPlainTarget(current.fileId);
    if (el) {
      const { text: newText, count } = replaceAllMatches(el.value, q, opts, replaceText);
      if (count > 0) {
        el.setRangeText("", 0, 0, "select");
        useEditorStore.getState().updateContent(current.fileId, newText);
        setReplaceMessage(`Replaced ${count} occurrences`);
        useSidebarSearchStore.getState().runSearch();
      }
      return;
    }

    const { text: newText, count } = replaceAllMatches(current.sourceText, q, opts, replaceText);
    if (count > 0) {
      useEditorStore.getState().updateContent(current.fileId, newText);
      setReplaceMessage(`Replaced ${count} occurrences`);
      useSidebarSearchStore.getState().runSearch();
    }
  };

  const inputFocused = showHistory && query.length === 0 && history.length > 0;

  return (
    <div className="flex h-full flex-col min-h-0">
      <div className="border-b border-border px-3 py-2 shrink-0 space-y-1.5">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitHistory();
            }}
            placeholder="Search documents..."
            className="h-7 w-full rounded-md border border-input bg-background pl-7 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Toggle size="sm" variant="outline" pressed={caseSensitive} onPressedChange={setCaseSensitive} aria-label="Case Sensitive" className="h-5 text-[10px]">Aa</Toggle>
          <Toggle size="sm" variant="outline" pressed={wholeWord} onPressedChange={setWholeWord} aria-label="Whole Word" className="h-5 text-[10px]">W</Toggle>
          <Toggle size="sm" variant="outline" pressed={isRegex} onPressedChange={setIsRegex} aria-label="Regex" className="h-5 text-[10px]">.*</Toggle>
          <div className="ml-auto flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setShowReplace((v) => !v);
                    setReplaceMessage(null);
                  }}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-md transition-colors",
                    showReplace ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-label="Replace"
                >
                  <Replace size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Replace</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setShowHistory((v) => !v);
                    if (!showHistory) inputRef.current?.focus();
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Search history"
                >
                  <History size={12} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">History</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {showReplace && (
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Replace size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replace with..."
                className="h-6 w-full rounded-md border border-input bg-background pl-6 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={replaceSelected}
              disabled={!current}
              className="h-6 rounded-md border border-border px-2 text-[11px] text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              Replace
            </button>
            <button
              onClick={replaceAllSelected}
              disabled={!current}
              className="h-6 rounded-md border border-border px-2 text-[11px] text-foreground transition-colors hover:bg-muted disabled:opacity-40"
            >
              All
            </button>
          </div>
        )}
        {replaceMessage && (
          <p className="text-[10px] text-muted-foreground">{replaceMessage}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {inputFocused || showHistory ? (
          <div className="space-y-0.5 px-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Searches
              </span>
              <button
                onClick={clearHistory}
                className="text-[10px] text-muted-foreground hover:text-danger"
              >
                Clear
              </button>
            </div>
            {history.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No search history yet</p>
            )}
            {history.map((h) => (
              <button
                key={h}
                onClick={() => {
                  setQuery(h);
                  setShowHistory(false);
                  commitHistory();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-foreground/80 hover:bg-muted/60 transition-colors"
              >
                <History size={11} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{h}</span>
              </button>
            ))}
          </div>
        ) : !query.trim() ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
            <Search size={32} strokeWidth={1.5} />
            <p className="text-sm">Search all documents</p>
            <p className="text-xs text-muted-foreground/70">Type to search the current document, open tabs and saved documents.</p>
          </div>
        ) : isSearching ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Searching…
          </div>
        ) : results.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
            <FileText size={24} strokeWidth={1.5} />
            <p className="text-sm">No Results Found</p>
            <p className="text-xs text-muted-foreground/70">Try different keywords or adjust the search options.</p>
          </div>
        ) : (
          <div className="space-y-1 px-2">
            {groups.map(([fileId, matches]) => (
              <div key={fileId} className="space-y-0.5">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {matches[0]?.match.title ?? "Untitled"}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{matches.length}</span>
                </div>
                {matches.map(({ idx, match: m }) => {
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={`${fileId}-${m.ordinal}`}
                      onClick={() => {
                        commitHistory();
                        goToIndex(idx);
                      }}
                      className={cn(
                        "group flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                        isCurrent ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted/60"
                      )}
                    >
                      <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted-foreground">
                        Ln {m.line}
                      </span>
                      <span className="min-w-0 flex-1">
                        <HighlightPreview match={m} />
                      </span>
                      <CornerDownRight size={10} className="mt-1 shrink-0 opacity-0 text-muted-foreground transition-opacity group-hover:opacity-100" />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {results.length > 0 ? `${currentIndex + 1}/${totalMatches} match${totalMatches === 1 ? "" : "es"}` : "0 matches"}
          {matchedDocs > 0 && <span className="ml-1 text-muted-foreground/60">in {matchedDocs} doc{matchedDocs === 1 ? "" : "s"}</span>}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => goToIndex(currentIndex - 1)}
            disabled={results.length === 0}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            aria-label="Previous match"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={() => goToIndex(currentIndex + 1)}
            disabled={results.length === 0}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            aria-label="Next match"
          >
            <ChevronDown size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}