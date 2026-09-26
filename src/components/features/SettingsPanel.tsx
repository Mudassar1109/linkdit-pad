import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Monitor, Palette, Type, Edit3, Keyboard, DatabaseBackup, Sun, Moon, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useBackupStore } from "@/store/useBackupStore";
import { useThemeStore } from "@/store/useThemeStore";
import { useI18n, useI18nStore } from "@/store/useI18nStore";
import { LANGUAGES } from "@/i18n/languages";
import { THEMES, ACCENTS, getAccentById } from "@/features/theme/themes";
import { cn } from "@/lib/utils";

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const SECTIONS = [
  { id: "general", labelKey: "settings.nav.general", icon: Monitor },
  { id: "appearance", labelKey: "settings.nav.appearance", icon: Palette },
  { id: "themes", labelKey: "settings.nav.themes", icon: Palette },
  { id: "fonts", labelKey: "settings.nav.fonts", icon: Type },
  { id: "editor", labelKey: "settings.nav.editor", icon: Edit3 },
  { id: "backup", labelKey: "settings.nav.backup", icon: DatabaseBackup },
  { id: "shortcuts", labelKey: "settings.nav.shortcuts", icon: Keyboard },
];

const THEME_MODES = [
  { id: "light" as const, labelKey: "settings.appearance.modeLight", icon: Sun },
  { id: "dark" as const, labelKey: "settings.appearance.modeDark", icon: Moon },
  { id: "system" as const, labelKey: "settings.appearance.modeSystem", icon: Monitor },
];

export function SettingsPanel({ isOpen, onClose }: SettingsDialogProps) {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState("general");
  const { general, appearance, editor, setGeneral, setAppearance, setEditor } = useSettingsStore();
  const themeMode = useThemeStore((s) => s.themeMode);
  const themeId = useThemeStore((s) => s.themeId);
  const accentId = useThemeStore((s) => s.accentId);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAccent = useThemeStore((s) => s.setAccent);

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
              aria-label={t("settings.ariaLabel")}
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
                  {t(section.labelKey)}
                </button>
              ))}
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {t(SECTIONS.find((s) => s.id === activeSection)?.labelKey ?? "settings.ariaLabel")}
                </h2>
                <button
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label={t("settings.close")}
                >
                  <X size={16} />
                </button>
              </div>
              <ScrollArea className="flex-1 p-4">
                {activeSection === "general" && (
                  <div className="space-y-4">
                    <SettingsSection title={t("settings.general.title")}>
                      <SettingsRow label={t("settings.general.language")} description={t("settings.general.languageDesc")}>
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={general.language} onChange={(e) => useI18nStore.getState().setLanguage(e.target.value)}>
                          {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>{lang.nativeName} ({lang.name})</option>
                          ))}
                        </select>
                      </SettingsRow>
                      <SettingsRow label={t("settings.general.autoUpdate")} description={t("settings.general.autoUpdateDesc")}>
                        <Switch checked={general.autoUpdate} onCheckedChange={(c) => setGeneral({ autoUpdate: c })} />
                      </SettingsRow>
                      <SettingsRow label={t("settings.general.telemetry")} description={t("settings.general.telemetryDesc")}>
                        <Switch checked={general.telemetry} onCheckedChange={(c) => setGeneral({ telemetry: c })} />
                      </SettingsRow>
                      <SettingsRow label={t("settings.general.startup")} description={t("settings.general.startupDesc")}>
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={general.startupBehavior} onChange={(e) => setGeneral({ startupBehavior: e.target.value as "new-document" | "restore" | "blank" })}>
                          <option value="new-document">{t("settings.general.newDocument")}</option>
                          <option value="restore">{t("settings.general.restoreLastSession")}</option>
                          <option value="blank">{t("settings.general.blank")}</option>
                        </select>
                      </SettingsRow>
                    </SettingsSection>
                  </div>
                )}

                {activeSection === "appearance" && (
                  <div className="space-y-4">
                    <SettingsSection title={t("settings.appearance.window")}>
                      <SettingsRow label={t("settings.appearance.cornerRadius")} description={t("settings.appearance.cornerRadiusDesc")}>
                        <input type="range" min="4" max="24" value={appearance.cornerRadius} onChange={(e) => setAppearance({ cornerRadius: parseInt(e.target.value) })} className="w-24" />
                      </SettingsRow>
                      <SettingsRow label={t("settings.appearance.animationSpeed")} description={t("settings.appearance.animationSpeedDesc")}>
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={appearance.animationSpeed} onChange={(e) => setAppearance({ animationSpeed: e.target.value as "off" | "reduced" | "normal" | "fast" })}>
                          <option value="off">{t("settings.appearance.off")}</option>
                          <option value="reduced">{t("settings.appearance.reduced")}</option>
                          <option value="normal">{t("settings.appearance.normal")}</option>
                          <option value="fast">{t("settings.appearance.fast")}</option>
                        </select>
                      </SettingsRow>
                      <SettingsRow label={t("settings.appearance.statusBar")} description={t("settings.appearance.showStatusBarDesc")}>
                        <Switch checked={appearance.showStatusBar} onCheckedChange={(c) => setAppearance({ showStatusBar: c })} />
                      </SettingsRow>
                    </SettingsSection>
                  </div>
                )}

                {activeSection === "editor" && (
                  <div className="space-y-4">
                    <SettingsSection title={t("settings.editor.behaviorTitle")}>
                      <SettingsRow label={t("settings.editor.tabSize")} description={t("settings.editor.tabSizeDesc")}>
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={editor.tabSize} onChange={(e) => setEditor({ tabSize: parseInt(e.target.value) })}>
                          {[2, 4, 6, 8].map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </SettingsRow>
                      <SettingsRow label={t("settings.editor.wordWrap")} description={t("settings.editor.wordWrapDesc")}>
                        <Switch checked={editor.wordWrap} onCheckedChange={(c) => setEditor({ wordWrap: c })} />
                      </SettingsRow>
                      <SettingsRow label={t("settings.editor.lineNumbers")} description={t("settings.editor.lineNumbersDesc")}>
                        <Switch checked={editor.lineNumbers} onCheckedChange={(c) => setEditor({ lineNumbers: c })} />
                      </SettingsRow>
                      <SettingsRow label={t("settings.editor.minimap")} description={t("settings.editor.minimapDesc")}>
                        <Switch checked={editor.minimap} onCheckedChange={(c) => setEditor({ minimap: c })} />
                      </SettingsRow>
                      <SettingsRow label={t("settings.editor.spellCheck")} description={t("settings.editor.spellCheckDesc")}>
                        <Switch checked={editor.spellCheck} onCheckedChange={(c) => setEditor({ spellCheck: c })} />
                      </SettingsRow>
                    </SettingsSection>
                    <SettingsSection title={t("settings.editor.saveTitle")}>
                      <SettingsRow label={t("settings.editor.autoSave")} description={t("settings.editor.autoSaveDesc")}>
                        <Switch checked={editor.autoSave} onCheckedChange={(c) => setEditor({ autoSave: c })} />
                      </SettingsRow>
                      {editor.autoSave && (
                        <SettingsRow label={t("settings.editor.autoSaveDelay")} description={t("settings.editor.autoSaveDelayDesc")}>
                          <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground" value={editor.autoSaveDelay} onChange={(e) => setEditor({ autoSaveDelay: parseInt(e.target.value) })}>
                            <option value={1000}>{t("settings.editor.autoSaveDelayValue", { count: 1 })}</option>
                            <option value={3000}>{t("settings.editor.autoSaveDelayValue", { count: 3 })}</option>
                            <option value={5000}>{t("settings.editor.autoSaveDelayValue", { count: 5 })}</option>
                            <option value={10000}>{t("settings.editor.autoSaveDelayValue", { count: 10 })}</option>
                          </select>
                        </SettingsRow>
                      )}
                    </SettingsSection>
                  </div>
                )}

                {activeSection === "backup" && <BackupSettingsSection />}

                {activeSection === "shortcuts" && (
                  <div className="space-y-4">
                    <SettingsSection title={t("settings.shortcuts.title")}>
                      {useSettingsStore.getState().shortcuts.map((sc, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1">
                          <span className="text-sm text-foreground">{sc.labelKey ? t(sc.labelKey) : sc.label}</span>
                          <kbd className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                            {[sc.ctrl && "Ctrl", sc.shift && "Shift", sc.alt && "Alt", sc.key].filter(Boolean).join("+")}
                          </kbd>
                        </div>
                      ))}
                    </SettingsSection>
                  </div>
                )}

                {activeSection === "themes" && (
                  <div className="space-y-5">
                    <SettingsSection title={t("settings.themes.mode")} description={t("settings.themes.modeDesc")}>
                      <div className="grid grid-cols-3 gap-2">
                        {THEME_MODES.map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => { setThemeMode(mode.id); setAppearance({ themeMode: mode.id }); }}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-3 transition-all",
                              themeMode === mode.id ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/30"
                            )}
                          >
                            <mode.icon size={16} className={themeMode === mode.id ? "text-primary" : "text-muted-foreground"} />
                            <span className="text-xs font-medium">{t(mode.labelKey)}</span>
                          </button>
                        ))}
                      </div>
                    </SettingsSection>
                    <SettingsSection title={t("settings.themes.palette")} description={t("settings.themes.paletteDesc")}>
                      <div className="grid grid-cols-2 gap-2">
                        {THEMES.map((theme) => {
                          const isDark = theme.previewMode === "dark";
                          const p = theme.palette[theme.previewMode];
                          const tone = isDark ? getAccentById(accentId).dark : getAccentById(accentId).light;
                          const selected = themeId === theme.id;
                          return (
                            <button
                              key={theme.id}
                              onClick={() => setTheme(theme.id)}
                              className={cn(
                                "flex flex-col gap-1.5 rounded-lg border-2 p-2 transition-all",
                                selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"
                              )}
                            >
                              <div
                                className="pointer-events-none relative h-16 overflow-hidden rounded-md border border-border/70"
                                style={{ background: `hsl(${p.background})` }}
                              >
                                <div className="absolute inset-y-0 left-0 w-6" style={{ background: `hsl(${p.sidebar})` }} />
                                <div className="absolute left-6 right-0 top-0 h-3.5" style={{ background: `hsl(${p.toolbar})`, boxShadow: "inset 0 -1px 0 hsla(0,0%,0%,0.08)" }} />
                                <div
                                  className="absolute left-8 right-1 bottom-1 top-5 rounded-[4px] px-2 pb-1.5 pt-2"
                                  style={{ background: `hsl(${p.surface})`, boxShadow: "0 1px 3px hsla(0,0%,0%,0.18)" }}
                                >
                                  <div className="h-1.5 rounded-full" style={{ background: `hsl(${tone.primary})`, width: "34%" }} />
                                  <div className="mt-1.5 h-1 rounded-full" style={{ background: `hsl(${p.foreground})`, opacity: 0.28 }} />
                                  <div className="mt-1 h-1 rounded-full" style={{ background: `hsl(${p.foreground})`, opacity: 0.16, width: "62%" }} />
                                  <div className="mt-1 h-1 rounded-full" style={{ background: `hsl(${p.foreground})`, opacity: 0.16, width: "48%" }} />
                                </div>
                              </div>
                              <span className="flex items-center justify-between text-sm font-medium">
                                {t(`settings.themes.name.${theme.id}`)}
                                {selected && <Check size={14} className="text-primary" />}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t(`settings.themes.desc.${theme.id}`)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </SettingsSection>
                    <SettingsSection title={t("settings.themes.accent")} description={t("settings.themes.accentDesc")}>
                      <div className="flex flex-wrap gap-3">
                        {ACCENTS.map((accent) => (
                          <button
                            key={accent.id}
                            onClick={() => { setAccent(accent.id); setAppearance({ accentColor: accent.hex }); }}
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                              accentId === accent.id ? "ring-2 ring-offset-2 ring-offset-card ring-primary scale-110" : "hover:scale-110"
                            )}
                            style={{ backgroundColor: accent.hex }}
                            aria-label={t(`settings.appearance.colors.${accent.id}`)}
                            title={t(`settings.appearance.colors.${accent.id}`)}
                          >
                            {accentId === accent.id && <Check size={16} className="text-white drop-shadow" />}
                          </button>
                        ))}
                      </div>
                    </SettingsSection>
                  </div>
                )}

                {activeSection === "fonts" && (
                  <div className="space-y-4">
                    <SettingsSection title={t("settings.fonts.uiFont")}>
                      <SettingsRow label={t("settings.fonts.uiFont")} description={t("settings.fonts.uiFontDesc")}>
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
                    <SettingsSection title={t("settings.fonts.editorFont")}>
                      <SettingsRow label={t("settings.fonts.editorFont")} description={t("settings.fonts.editorFontDesc")}>
                        <select className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground max-w-[200px]" value={appearance.editorFont} onChange={(e) => setAppearance({ editorFont: e.target.value })}>
                          <option value="Segoe UI Variable Text">Segoe UI Variable Text</option>
                          <option value="Segoe UI">Segoe UI</option>
                          <option value="Inter">Inter</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Lexend">Lexend</option>
                          <option value="Open Sans">Open Sans</option>
                        </select>
                      </SettingsRow>
                      <SettingsRow label={t("settings.fonts.fontSize")} description={t("settings.fonts.fontSizeDesc")}>
                        <input type="range" min="10" max="32" value={editor.fontSize} onChange={(e) => setEditor({ fontSize: parseInt(e.target.value) })} className="w-24" />
                        <span className="ml-2 text-xs tabular-nums text-muted-foreground min-w-[2ch]">{editor.fontSize}px</span>
                      </SettingsRow>
                      <SettingsRow label={t("settings.fonts.lineHeight")} description={t("settings.fonts.lineHeightDesc")}>
                        <input type="range" min="1.0" max="2.5" step="0.1" value={editor.lineHeight} onChange={(e) => setEditor({ lineHeight: parseFloat(e.target.value) })} className="w-24" />
                        <span className="ml-2 text-xs tabular-nums text-muted-foreground min-w-[3ch]">{editor.lineHeight.toFixed(1)}</span>
                      </SettingsRow>
                      <SettingsRow label={t("settings.fonts.letterSpacing")} description={t("settings.fonts.letterSpacingDesc")}>
                        <input type="range" min="0" max="4" step="0.5" value={editor.letterSpacing} onChange={(e) => setEditor({ letterSpacing: parseFloat(e.target.value) })} className="w-24" />
                        <span className="ml-2 text-xs tabular-nums text-muted-foreground min-w-[2ch]">{editor.letterSpacing}px</span>
                      </SettingsRow>
                    </SettingsSection>
                    <SettingsSection title={t("settings.fonts.monoSection")}>
                      <SettingsRow label={t("settings.fonts.monoFont")} description={t("settings.fonts.monoFontDesc")}>
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

function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-muted-foreground/80">{description}</p>}
      </div>
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
  const { t } = useI18n();
  const settings = useBackupStore((s) => s.settings);
  const setSettings = useBackupStore((s) => s.setSettings);
  const runBackup = useBackupStore((s) => s.runBackup);
  const lastBackupAt = useBackupStore((s) => s.lastBackupAt);

  return (
    <div className="space-y-4">
      <SettingsSection title={t("settings.backup.title")}>
        <SettingsRow label={t("settings.backup.autoBackup")} description={t("settings.backup.autoBackupDesc")}>
          <Switch checked={settings.enabled} onCheckedChange={(c) => setSettings({ enabled: c })} />
        </SettingsRow>
        {settings.enabled && (
          <SettingsRow label={t("settings.backup.interval")} description={t("settings.backup.intervalDesc")}>
            <select
              className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
              value={settings.intervalMinutes}
              onChange={(e) => setSettings({ intervalMinutes: parseInt(e.target.value) })}
              aria-label={t("settings.backup.interval")}
            >
              <option value={5}>{t("settings.backup.intervalValue", { count: 5 })}</option>
              <option value={15}>{t("settings.backup.intervalValue", { count: 15 })}</option>
              <option value={30}>{t("settings.backup.intervalValue", { count: 30 })}</option>
              <option value={60}>{t("settings.backup.intervalValue", { count: 60 })}</option>
            </select>
          </SettingsRow>
        )}
        <SettingsRow
          label={t("settings.backup.lastBackup")}
          description={lastBackupAt ? new Date(lastBackupAt).toLocaleString() : t("settings.backup.noBackupYet")}
        >
          <button
            onClick={runBackup}
            className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <DatabaseBackup size={14} />
            {t("settings.backup.backUpNow")}
          </button>
        </SettingsRow>
      </SettingsSection>
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {t("settings.backup.note")}
      </div>
    </div>
  );
}
