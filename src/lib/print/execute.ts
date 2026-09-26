/**
 * Print execution (execute.ts).
 *
 * Opens the native Windows print dialog from a SELF-CONTAINED same-origin
 * iframe document. The iframe contains ONLY the print HTML + its stylesheet —
 * never the application chrome — which fixes the original bug where window
 * shopping printed the app UI because `@media print` sibling-hiding rules
 * leaked.
 *
 * `window.print()` is blocking while the native dialog is open, so everything
 * that must be ready (fonts, images) is settled before it is called.
 */

export function printDocumentHtml(docHtml: string, title: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.setAttribute("title", title);
    frame.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none;";

    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      frame.remove();
      if (error) reject(error);
      else resolve();
    };

    const fail = (e: unknown) => {
      if (settled) return;
      console.error("[print] iframe print failed", e);
      finish(e);
    };

    frame.onload = () => {
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!win || !doc) {
        fail(new Error("iframe content unavailable"));
        return;
      }
      const ready = Promise.resolve()
        .then(async () => {
          try {
            if (doc.fonts?.ready) await doc.fonts.ready;
          } catch {
            /* best effort */
          }
          const imgs = Array.from(doc.querySelectorAll("img"));
          await Promise.all(
            imgs.map((img) =>
              img.decode?.().catch(() => img.complete).catch(() => undefined),
            ),
          );
        })
        .then(() => {
          try {
            win.focus();
            win.print();
          } catch (e) {
            fail(e);
            return;
          }
          finish();
        });
      ready.catch(fail);
    };

    frame.onerror = () => fail(new Error("iframe load failed"));
    frame.srcdoc = docHtml;
    document.body.appendChild(frame);

    // Safety net in case the print dialog is dismissed without firing events.
    const guard = setTimeout(() => {
      if (settled) return;
      // print() returning normally resolves via finish(); reaching this guard
      // means print() threw or the window became unresponsive.
      if (!settled && frame.contentWindow === null) fail(new Error("print window closed"));
    }, 120000);
    guard.unref?.();
  });
}