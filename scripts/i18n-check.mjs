import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
});

try {
  const mod = await server.ssrLoadModule("/src/i18n/index.ts");
  const { missing, extra } = mod.validateTranslations();
  let ok = true;

  for (const [code, keys] of Object.entries(missing)) {
    ok = false;
    console.log(`[${code}] MISSING ${keys.length} key(s):`);
    for (const k of keys) console.log(`   ${k}`);
  }

  if (extra.length > 0) {
    ok = false;
    console.log(`EXTRA key(s) not present in english dictionary (${extra.length}):`);
    for (const k of extra) console.log(`   ${k}`);
  }

  if (ok) {
    console.log("i18n:check OK — all 16 locales match the english key set.");
  }
  process.exit(ok ? 0 : 1);
} finally {
  await server.close();
}