import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Monitor, Palette, Type, Edit3, Keyboard, DatabaseBackup } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useBackupStore } from "@/store/useBackupStore";
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
  { id: "backup", label: "Backup", icon: DatabaseBackup },
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
  const themeMode = useThemeStore((s) => s.themeMode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);

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
                      <SettingsRow label="Status Bar" description="Show status bar">
                        <Switch checked={appearance.showStatusBar} onCheckedChange={(c) => setAppearance({ showStatusBar: c })} />
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

                {activeSection === "backup" && <BackupSettingsSection />}

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

                {activeSection === "themes" && (
                  <div className="space-y-4">
                    <SettingsSection title="Theme Mode">
                      <div className="flex gap-2">
                        {THEME_MODES.map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => { setThemeMode(mode.id); setAppearance({ themeMode: mode.id }); }}
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
                  </div>
                )}

                {activeSection === "fonts" && (
                  <div className="space-y-4">
                    <SettingsSection title="UI Font">
                      <SettingsRow label="UI Font" description="Interface font family">
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground max-w-[200px]" value={appearance.uiFont} onChange={(e) => setAppearance({ uiFont: e.target.value })}>
                          <option value="Segoe UI Variable">Segoe UI Variable</option>
                          <option value="Segoe UI">Segoe UI</option>
                          <option value="System UI">System UI</option>
                          <option value="Inter">Inter</option>
                          <option value="Roboto">Roboto</option>
                          <option value="-apple-system">-apple-system</option>
                        </select>
                      </SettingsRow>
                      </SettingsSection>
                    <SettingsSection title="Editor Font">
                      <SettingsRow label="Editor Font" description="Font used in the editor">
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground max-w-[200px]" value={appearance.editorFont} onChange={(e) => setAppearance({ editorFont: e.target.value })}>
                          <option value="Segoe UI Variable Text">Segoe UI Variable Text</option>
                          <option value="Segoe UI">Segoe UI</option>
                          <option value="Inter">Inter</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Lexend">Lexend</option>
                          <option value="Open Sans">Open Sans</option>
                        </select>
                      </SettingsRow>
                      <SettingsRow label="Font Size" description="Editor text size">
                        <input type="range" min="10" max="32" value={editor.fontSize} onChange={(e) => setEditor({ fontSize: parseInt(e.target.value) })} className="w-24" />
                        <span className="ml-2 text-xs tabular-nums text-muted-foreground min-w-[2ch]">{editor.fontSize}px</span>
                      </SettingsRow>
                      <SettingsRow label="Line Height" description="Editor line spacing">
                        <input type="range" min="1.0" max="2.5" step="0.1" value={editor.lineHeight} onChange={(e) => setEditor({ lineHeight: parseFloat(e.target.value) })} className="w-24" />
                        <span className="ml-2 text-xs tabular-nums text-muted-foreground min-w-[3ch]">{editor.lineHeight.toFixed(1)}</span>
                      </SettingsRow>
                      <SettingsRow label="Letter Spacing" description="Space between characters">
                        <input type="range" min="0" max="4" step="0.5" value={editor.letterSpacing} onChange={(e) => setEditor({ letterSpacing: parseFloat(e.target.value) })} className="w-24" />
                        <span className="ml-2 text-xs tabular-nums text-muted-foreground min-w-[2ch]">{editor.letterSpacing}px</span>
                      </SettingsRow>
                    </SettingsSection>
                    <SettingsSection title="Monospace Font">
                      <SettingsRow label="Mono Font" description="Font for code blocks">
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground max-w-[200px]" value={appearance.monoFont} onChange={(e) => setAppearance({ monoFont: e.target.value })}>
                          <option value="Cascadia Code">Cascadia Code</option>
                          <option value="JetBrains Mono">JetBrains Mono</option>
                          <option value="Fira Code">Fira Code</option>
                          <option value="Source Code Pro">Source Code Pro</option>
                          <option value="Consolas">Consolas</option>
                          <option value="Courier New">Courier New</option>
                        </select>
                      </SettingsRow>
                    </SettingsSection>
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

function BackupSettingsSection() {
  const settings = useBackupStore((s) => s.settings);
  const setSettings = useBackupStore((s) => s.setSettings);
  const runBackup = useBackupStore((s) => s.runBackup);
  const lastBackupAt = useBackupStore((s) => s.lastBackupAt);

  return (
    <div className="space-y-4">
      <SettingsSection title="Auto Backup">
        <SettingsRow label="Auto Backup" description="Back up document states locally on an interval">
          <Switch checked={settings.enabled} onCheckedChange={(c) => setSettings({ enabled: c })} />
        </SettingsRow>
        {settings.enabled && (
          <SettingsRow label="Backup Interval" description="How often backups run">
            <select
              className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
              value={settings.intervalMinutes}
              onChange={(e) => setSettings({ intervalMinutes: parseInt(e.target.value) })}
              aria-label="Backup interval"
            >
              <option value={5}>Every 5 minutes</option>
              <option value={15}>Every 15 minutes</option>
              <option value={30}>Every 30 minutes</option>
              <option value={60}>Every 60 minutes</option>
            </select>
          </SettingsRow>
        )}
        <SettingsRow
          label="Last backup"
          description={lastBackupAt ? new Date(lastBackupAt).toLocaleString() : "No backup created yet"}
        >
          <button
            onClick={runBackup}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <DatabaseBackup size={14} />
            Back Up Now
          </button>
        </SettingsRow>
      </SettingsSection>
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        Backups are stored locally on this device only. They are never uploaded anywhere. Use Tools &rarr; Backup / Recovery to view and recover backups.
      </div>
    </div>
  );
}
