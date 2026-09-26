import tauriConf from "../../src-tauri/tauri.conf.json";
import { invoke } from "@tauri-apps/api/core";

export const APP_NAME = "LinkDit Pad";

export const APP_VERSION = `v${tauriConf.version}`;

export const WEBSITE_URL = "https://www.linkdit.online";
export const WEBSITE_RELEASE_NOTES = `${WEBSITE_URL}/release-notes`;
export const WEBSITE_LICENSE = `${WEBSITE_URL}/license`;
export const WEBSITE_PRIVACY = `${WEBSITE_URL}/privacy`;
export const WEBSITE_TERMS = `${WEBSITE_URL}/terms`;
export const WEBSITE_EULA = `${WEBSITE_URL}/eula`;

/**
 * Open an external URL in the system browser. Prefers the Tauri opener
 * plugin when available (desktop shell), and falls back to a regular
 * new-window open (browser dev mode).
 */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    await invoke("plugin:opener|open_url", { url });
    return;
  } catch {
    // plugin not registered — fall back below
  }
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (win) win.opener = null;
}