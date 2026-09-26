import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Info, Sparkles, ShieldCheck, Lock, Cpu, ScrollText, Globe, ExternalLink,
  FileType, PenLine, Columns2, LayoutGrid, Save, Palette, Search, Trash2,
  Image, Table2, Printer, Languages, Keyboard, HardDrive, FileText, Layers,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAboutStore } from "@/store/useAboutStore";
import { useI18n } from "@/store/useI18nStore";
import {
  APP_VERSION,
  WEBSITE_URL,
  WEBSITE_RELEASE_NOTES,
  WEBSITE_PRIVACY,
  WEBSITE_TERMS,
  WEBSITE_LICENSE,
  WEBSITE_EULA,
  openExternalUrl,
} from "@/lib/appInfo";
import appLogo from "../../../src-tauri/icons/32 × 32 px.png";

const FEATURES = [
  { key: "about.featureMarkdown", icon: FileType },
  { key: "about.featureRichText", icon: PenLine },
  { key: "about.featureSplit", icon: Columns2 },
  { key: "about.featureTabs", icon: LayoutGrid },
  { key: "about.featureAutoSave", icon: Save },
  { key: "about.featureThemes", icon: Palette },
  { key: "about.featureSearch", icon: Search },
  { key: "about.featureTrash", icon: Trash2 },
  { key: "about.featureLock", icon: Lock },
  { key: "about.featureImages", icon: Image },
  { key: "about.featureTables", icon: Table2 },
  { key: "about.featurePrint", icon: Printer },
  { key: "about.featureLanguages", icon: Languages },
  { key: "about.featureShortcuts", icon: Keyboard },
  { key: "about.featureLocal", icon: HardDrive },
];

const TECH = ["React", "TypeScript", "Tauri", "TipTap", "CodeMirror", "Tailwind CSS", "Vite", "Zustand"];

const RESOURCE_LINKS = [
  { key: "about.linkWebsite", icon: Globe, url: WEBSITE_URL },
  { key: "about.linkReleaseNotes", icon: Layers, url: WEBSITE_RELEASE_NOTES },
  { key: "about.linkPrivacy", icon: ShieldCheck, url: WEBSITE_PRIVACY },
  { key: "about.linkTerms", icon: ScrollText, url: WEBSITE_TERMS },
];

export function AboutDialog() {
  const { t } = useI18n();
  const isOpen = useAboutStore((s) => s.isOpen);
  const close = useAboutStore((s) => s.close);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={close}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              role="dialog"
              aria-modal="true"
              aria-label={t("about.title")}
              className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-panel"
              style={{
                width: 780,
                height: "min(88vh, calc(100vh - 48px))",
                maxWidth: "calc(100vw - 32px)",
              }}
            >
              <div className="relative shrink-0 overflow-hidden border-b border-border/80">
                <div
                  className="absolute inset-0 bg-gradient-to-r from-primary/15 via-accent/10 to-transparent"
                  aria-hidden
                />
                <div className="relative flex items-center gap-4 p-6">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow-sm ring-1 ring-white/10">
                    <img
                      src={appLogo}
                      alt=""
                      aria-hidden
                      draggable={false}
                      className="h-10 w-10 rounded-lg object-contain drop-shadow"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                      {t("titlebar.appName")}
                    </h2>
                    <p className="text-sm text-muted-foreground">{t("about.tagline")}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {t("about.version")} {APP_VERSION}
                      </span>
                      <button
                        onClick={() => openExternalUrl(WEBSITE_RELEASE_NOTES)}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Sparkles size={11} className="text-primary" />
                        {t("about.whatsNew")}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={close}
                    aria-label={t("about.close")}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-5 p-6">
                  <AboutSection icon={Info} title={t("about.aboutSection")}>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t("about.aboutText")}
                    </p>
                  </AboutSection>

                  <AboutSection icon={Sparkles} title={t("about.featuresSection")}>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {FEATURES.map((feature) => (
                        <div
                          key={feature.key}
                          className="flex items-center gap-2.5 rounded-lg border border-border bg-background/50 px-3 py-2"
                        >
                          <feature.icon size={14} className="shrink-0 text-primary" />
                          <span className="text-[13px] leading-snug text-foreground">
                            {t(feature.key)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </AboutSection>

                  <AboutSection icon={ShieldCheck} title={t("about.privacySection")}>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t("about.privacyText")}
                    </p>
                  </AboutSection>

                  <AboutSection icon={Lock} title={t("about.securitySection")}>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t("about.securityText")}
                    </p>
                  </AboutSection>

                  <AboutSection icon={Cpu} title={t("about.techSection")}>
                    <p className="text-xs text-muted-foreground/80">{t("about.techIntro")}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {TECH.map((name) => (
                        <span
                          key={name}
                          className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[11px] text-foreground/80"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </AboutSection>

                  <AboutSection icon={ScrollText} title={t("about.licenseSection")}>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t("about.licenseText")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <LinkChip icon={ScrollText} label={t("about.linkLicense")} url={WEBSITE_LICENSE} />
                      <LinkChip icon={FileText} label={t("about.linkEula")} url={WEBSITE_EULA} />
                    </div>
                  </AboutSection>

                  <AboutSection icon={Globe} title={t("about.linksSection")}>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {RESOURCE_LINKS.map((link) => (
                        <LinkRow key={link.key} icon={link.icon} label={t(link.key)} url={link.url} />
                      ))}
                    </div>
                  </AboutSection>

                  <div className="flex flex-col items-center gap-1 border-t border-border pt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      {t("about.copyright", { year: new Date().getFullYear() })}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70">
                      {t("titlebar.appName")} · {t("about.tagline")} · {APP_VERSION}
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function AboutSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface/50 p-4">
      <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={14} />
        </span>
        {title}
      </h3>
      <div className="pl-0 sm:pl-9">{children}</div>
    </section>
  );
}

function LinkRow({
  icon: Icon,
  label,
  url,
}: {
  icon: React.ElementType;
  label: string;
  url: string;
}) {
  return (
    <button
      onClick={() => openExternalUrl(url)}
      className="group flex items-center gap-2.5 rounded-lg border border-border bg-background/50 px-3 py-2 text-start transition-colors hover:border-primary/40 hover:bg-muted/60"
    >
      <Icon size={14} className="shrink-0 text-primary" />
      <span className="flex-1 text-[13px] font-medium text-foreground">{label}</span>
      <ExternalLink size={13} className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </button>
  );
}

function LinkChip({
  icon: Icon,
  label,
  url,
}: {
  icon: React.ElementType;
  label: string;
  url: string;
}) {
  return (
    <button
      onClick={() => openExternalUrl(url)}
      className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
    >
      <Icon size={12} className="text-primary" />
      {label}
      <ExternalLink size={11} className="text-muted-foreground transition-colors group-hover:text-primary" />
    </button>
  );
}