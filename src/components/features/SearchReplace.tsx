import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronUp, ChevronDown, Replace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useSearchStore } from "@/store/useSearchStore";
import { useEditorBridge } from "@/store/useEditorBridge";

export function SearchReplace() {
  const {
    query, replaceText, isRegex, caseSensitive, wholeWord,
    isVisible, results, currentIndex,
    setQuery, setReplaceText, setIsRegex, setCaseSensitive,
    setWholeWord, setIsVisible, setCurrentIndex
  } = useSearchStore();
  const editor = useEditorBridge((s) => s.editor);
  const [showReplace, setShowReplace] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsVisible(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "h") {
        e.preventDefault();
        setIsVisible(true);
        setShowReplace(true);
      }
      if (e.key === "Escape" && isVisible) {
        setIsVisible(false);
        setShowReplace(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, setIsVisible]);

  const performSearch = useCallback((text: string) => {
    if (!text.trim() || !editor) {
      useSearchStore.getState().setResults([]);
      return;
    }
    const doc = editor.state.doc;
    const fullText = doc.textContent;
    const lines = fullText.split("\n");
    const resultList: { line: number; content: string; matchStart: number; matchEnd: number }[] = [];

    let flags = "g";
    if (!caseSensitive) flags += "i";

    lines.forEach((line, lineIdx) => {
      let searchPattern: RegExp;
      try {
        const pattern = isRegex ? text : text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        searchPattern = new RegExp(pattern, flags);
      } catch { return; }

      let match;
      while ((match = searchPattern.exec(line)) !== null) {
        if (wholeWord) {
          const before = match.index > 0 ? line[match.index - 1] : " ";
          const after = match.index + match[0].length < line.length ? line[match.index + match[0].length] : " ";
          if (/\w/.test(before) || /\w/.test(after)) continue;
        }
        resultList.push({ line: lineIdx + 1, content: line, matchStart: match.index, matchEnd: match.index + match[0].length });
        if (resultList.length >= 200) break;
      }
    });

    useSearchStore.getState().setResults(resultList);
  }, [editor, caseSensitive, isRegex, wholeWord]);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  const replaceCurrent = useCallback(() => {
    if (!editor || results.length === 0) return;
    const text = editor.state.doc.textContent;
    const result = results[currentIndex];
    let pos = 0;
    let targetFrom = 0, targetTo = 0;
    const lines = text.split("\n");
    for (let i = 0; i < result.line - 1; i++) pos += lines[i].length + 1;
    targetFrom = pos + result.matchStart;
    targetTo = pos + result.matchEnd;
    editor.chain().focus().deleteRange({ from: targetFrom, to: targetTo }).insertContent(replaceText).run();
    useSearchStore.getState().setCurrentIndex(Math.min(currentIndex, results.length - 2));
    setTimeout(() => performSearch(query), 100);
  }, [editor, results, currentIndex, replaceText, query, performSearch]);

  const replaceAll = useCallback(() => {
    if (!editor || results.length === 0) return;
    const fullText = editor.state.doc.textContent;
    let flags = "g";
    if (!caseSensitive) flags += "i";
    let pattern: RegExp;
    try { pattern = isRegex ? new RegExp(query, flags) : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags); } catch { return; }
    const newText = fullText.replace(pattern, replaceText);
    editor.commands.setContent(`<p>${newText.replace(/\n/g, "<br>")}</p>`);
    useSearchStore.getState().setResults([]);
  }, [editor, results, query, replaceText, caseSensitive, isRegex]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute top-0 left-0 right-0 z-20 border-b border-border overflow-hidden shadow-panel"
        >
          <div className="flex items-start gap-2 p-3 glass-panel rounded-none border-0">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find..."
                    className="w-full h-8 rounded-md border border-input bg-background pl-8 pr-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Toggle size="sm" variant="outline" pressed={caseSensitive} onPressedChange={setCaseSensitive} aria-label="Case Sensitive">Aa</Toggle>
                  <Toggle size="sm" variant="outline" pressed={wholeWord} onPressedChange={setWholeWord} aria-label="Whole Word">W</Toggle>
                  <Toggle size="sm" variant="outline" pressed={isRegex} onPressedChange={setIsRegex} aria-label="Regex">.*</Toggle>
                </div>
              </div>
              {showReplace && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Replace size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      placeholder="Replace with..."
                      className="w-full h-8 rounded-md border border-input bg-background pl-8 pr-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={replaceCurrent} className="h-8">Replace</Button>
                  <Button variant="outline" size="sm" onClick={replaceAll} className="h-8">All</Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {results.length > 0 ? `${currentIndex + 1}/${results.length}` : "0/0"}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={results.length === 0}>
                <ChevronUp size={14} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentIndex(Math.min(results.length - 1, currentIndex + 1))} disabled={results.length === 0}>
                <ChevronDown size={14} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowReplace(!showReplace)}>
                <Replace size={14} />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setIsVisible(false); setShowReplace(false); }}>
                <X size={14} />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
