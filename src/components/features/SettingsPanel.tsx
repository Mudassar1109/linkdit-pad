import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Monitor, Palette, Type, Edit3, Keyboard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useThemeStore } from "@/store/useThemeStore";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: "general", label: "General", icon: Monitor },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "themes", label: "Themes", icon: Palette },
  { id: "fonts", label: "Fonts", icon: Type },
  { id: "editor", label: "Editor", icon: Edit3 },
  { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
];

const ACCENT_COLORS = [
  { id: "blue", name: "Blue", value: "#2563EB" },
  { id: "green", name: "Green", value: "#10B981" },
  { id: "purple", name: "Purple", value: "#8B5CF6" },
  { id: "orange", name: "Orange", value: "#F59E0B" },
  { id: "red", name: "Red", value: "#EF4444" },
  { id: "pink", name: "Pink", value: "#EC4899" },
  { id: "teal", name: "Teal", value: "#14B8A6" },
  { id: "cyan", name: "Cyan", value: "#06B6D4" },
];

const THEME_MODES = [
  { id: "light" as const, label: "Light", icon: "☀️" },
  { id: "dark" as const, label: "Dark", icon: "🌙" },
  { id: "system" as const, label: "System", icon: "💻" },
];

export function SettingsPanel({ isOpen, onClose }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState("general");
  const { general, appearance, editor, setGeneral, setAppearance, setEditor } = useSettingsStore();
  const { themeMode, setThemeMode } = useThemeStore();

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute inset-6 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              role="dialog"
              aria-modal="true"
              aria-label="Settings"
              className="pointer-events-auto flex rounded-xl border border-border bg-card shadow-panel overflow-hidden"
              style={{
                width: 700,
                height: "min(80vh, calc(100vh - 48px))",
                maxWidth: "calc(100vw - 48px)",
              }}
            >
            <div className="flex w-48 shrink-0 flex-col border-r border-border bg-muted/20 p-2">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    activeSection === section.id
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <section.icon size={16} />
                  {section.label}
                </button>
              ))}
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {SECTIONS.find((s) => s.id === activeSection)?.label || "Settings"}
                </h2>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Close settings"
                >
                  <X size={16} />
                </button>
              </div>
              <ScrollArea className="flex-1 p-4">
                {activeSection === "general" && (
                  <div className="space-y-4">
                    <SettingsSection title="General">
                      <SettingsRow label="Language" description="UI display language">
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={general.language} onChange={(e) => setGeneral({ language: e.target.value })}>
                          <option value="en">English</option>
                          <option value="ur">Urdu</option>
                        </select>
                      </SettingsRow>
                      <SettingsRow label="Auto Update" description="Automatically check for updates">
                        <Switch checked={general.autoUpdate} onCheckedChange={(c) => setGeneral({ autoUpdate: c })} />
                      </SettingsRow>
                      <SettingsRow label="Telemetry" description="Send anonymous usage data">
                        <Switch checked={general.telemetry} onCheckedChange={(c) => setGeneral({ telemetry: c })} />
                      </SettingsRow>
                      <SettingsRow label="Startup" description="What to show on startup">
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={general.startupBehavior} onChange={(e) => setGeneral({ startupBehavior: e.target.value as "new-document" | "restore" | "blank" })}>
                          <option value="new-document">New Document</option>
                          <option value="restore">Restore Last Session</option>
                          <option value="blank">Blank</option>
                        </select>
                      </SettingsRow>
                    </SettingsSection>
                  </div>
                )}

                {activeSection === "appearance" && (
                  <div className="space-y-4">
                    <SettingsSection title="Theme">
                      <div className="flex gap-2">
                        {THEME_MODES.map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setThemeMode(mode.id)}
                            className={cn(
                              "flex flex-col items-center gap-1 rounded-lg border-2 p-3 transition-all",
                              themeMode === mode.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/30"
                            )}
                          >
                            <span className="text-lg">{mode.icon}</span>
                            <span className="text-xs font-medium">{mode.label}</span>
                          </button>
                        ))}
                      </div>
                    </SettingsSection>
                    <SettingsSection title="Accent Color">
                      <div className="flex flex-wrap gap-2">
                        {ACCENT_COLORS.map((color) => (
                          <button
                            key={color.id}
                            onClick={() => setAppearance({ accentColor: color.value })}
                            className={cn(
                              "h-8 w-8 rounded-full transition-all",
                              appearance.accentColor === color.value && "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110"
                            )}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </SettingsSection>
                    <SettingsSection title="Window">
                      <SettingsRow label="Corner Radius" description="Window and panel corner roundness">
                        <input type="range" min="4" max="24" value={appearance.cornerRadius} onChange={(e) => setAppearance({ cornerRadius: parseInt(e.target.value) })} className="w-24" />
                      </SettingsRow>
                      <SettingsRow label="Animation Speed" description="UI animation speed">
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={appearance.animationSpeed} onChange={(e) => setAppearance({ animationSpeed: e.target.value as "off" | "reduced" | "normal" | "fast" })}>
                          <option value="off">Off</option>
                          <option value="reduced">Reduced</option>
                          <option value="normal">Normal</option>
                          <option value="fast">Fast</option>
                        </select>
                      </SettingsRow>
                    </SettingsSection>
                  </div>
                )}

                {activeSection === "editor" && (
                  <div className="space-y-4">
                    <SettingsSection title="Editor Behavior">
                      <SettingsRow label="Tab Size" description="Number of spaces for a tab">
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={editor.tabSize} onChange={(e) => setEditor({ tabSize: parseInt(e.target.value) })}>
                          {[2, 4, 6, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </SettingsRow>
                      <SettingsRow label="Word Wrap" description="Wrap lines at viewport edge">
                        <Switch checked={editor.wordWrap} onCheckedChange={(c) => setEditor({ wordWrap: c })} />
                      </SettingsRow>
                      <SettingsRow label="Line Numbers" description="Show line numbers gutter">
                        <Switch checked={editor.lineNumbers} onCheckedChange={(c) => setEditor({ lineNumbers: c })} />
                      </SettingsRow>
                      <SettingsRow label="Minimap" description="Show code minimap">
                        <Switch checked={editor.minimap} onCheckedChange={(c) => setEditor({ minimap: c })} />
                      </SettingsRow>
                      <SettingsRow label="Spell Check" description="Enable spell checking">
                        <Switch checked={editor.spellCheck} onCheckedChange={(c) => setEditor({ spellCheck: c })} />
                      </SettingsRow>
                    </SettingsSection>
                    <SettingsSection title="Save">
                      <SettingsRow label="Auto Save" description="Automatically save files">
                        <Switch checked={editor.autoSave} onCheckedChange={(c) => setEditor({ autoSave: c })} />
                      </SettingsRow>
                      {editor.autoSave && (
                        <SettingsRow label="Auto Save Delay" description="Delay before auto saving">
                          <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={editor.autoSaveDelay} onChange={(e) => setEditor({ autoSaveDelay: parseInt(e.target.value) })}>
                            <option value={1000}>1 second</option>
                            <option value={3000}>3 seconds</option>
                            <option value={5000}>5 seconds</option>
                            <option value={10000}>10 seconds</option>
                          </select>
                        </SettingsRow>
                      )}
                    </SettingsSection>
                  </div>
                )}

                {activeSection === "shortcuts" && (
                  <div className="space-y-4">
                    <SettingsSection title="Keyboard Shortcuts">
                      {useSettingsStore.getState().shortcuts.map((sc, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1">
                          <span className="text-sm text-foreground">{sc.label}</span>
                          <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                            {[sc.ctrl && "Ctrl", sc.shift && "Shift", sc.alt && "Alt", sc.key].filter(Boolean).join("+")}
                          </kbd>
                        </div>
                      ))}
                    </SettingsSection>
                  </div>
                )}

                {(activeSection === "fonts" || activeSection === "themes") && (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <p className="text-sm">Coming soon</p>
                    <p className="text-xs mt-1">This section will be available in the next update</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function SettingsRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2">
      <div className="flex-1">
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
