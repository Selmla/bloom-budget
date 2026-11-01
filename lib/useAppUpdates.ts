"use client";
import { useEffect, useState } from "react";

export function useAppUpdates(ready: boolean) {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    if (!ready) return;
    let registration: ServiceWorkerRegistration | undefined;
    let pending = false;
    let reloading = false;
    let disposed = false;
    let hadController = !!navigator.serviceWorker?.controller;
    let version = process.env.NEXT_PUBLIC_BLOOM_BUILD;
    function pendingUpdate() {
      if (disposed) return;
      pending = true;
      setWaiting(true);
      safelyReload();
    }
    function safelyReload() {
      if (!pending || reloading || document.visibilityState !== "visible")
        return;
      if (
        document.querySelector('[role="dialog"], [data-bloom-editor]') ||
        document.activeElement?.matches(
          'input, select, textarea, [contenteditable="true"]',
        )
      )
        return;
      const save = new Event("bloom-before-update", { cancelable: true });
      if (!window.dispatchEvent(save)) return;
      reloading = true;
      window.location.reload();
    }
    function changed() {
      if (disposed) return;
      if (!hadController) {
        hadController = true;
        return;
      }
      pendingUpdate();
    }
    function check() {
      if (document.visibilityState !== "visible") return;
      registration?.update().catch(() => {});
      // Also works in browsers without service workers. Compare with the build
      // embedded in this client, not a fresh baseline from an already-new server.
      fetch("/build-version.js", { cache: "no-store" })
        .then((response) => (response.ok ? response.text() : ""))
        .then((source) => {
          const latest = source.match(/"([^"]+)"/)?.[1];
          if (!latest || disposed) return;
          if (version && version !== "development" && latest !== version)
            pendingUpdate();
          else version = latest;
        })
        .catch(() => {});
      safelyReload();
    }
    navigator.serviceWorker?.addEventListener("controllerchange", changed);
    navigator.serviceWorker
      ?.register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        if (disposed) return;
        registration = reg;
        reg.update().catch(() => {});
      })
      .catch(() => {});
    check();
    const timer = window.setInterval(check, 60000);
    // A small observer lets a postponed update proceed as soon as a form closes.
    const observer = new MutationObserver(safelyReload);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    window.addEventListener("bloom-check-update", check);
    return () => {
      disposed = true;
      navigator.serviceWorker?.removeEventListener("controllerchange", changed);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
      window.removeEventListener("bloom-check-update", check);
      window.clearInterval(timer);
      observer.disconnect();
    };
  }, [ready]);
  return waiting;
}
