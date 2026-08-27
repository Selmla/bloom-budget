"use client";

import { useEffect, useRef, useState } from "react";
import { AppState, DEFAULT_STATE } from "./types";

const STORAGE_KEY = "bloom-budget-state";

// Everything lives in this browser's localStorage only. Nothing is sent anywhere —
// there is no server, no account, and no sync between devices. Each person who installs
// the app gets their own private copy on their own device.
export function useAppState() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({ ...DEFAULT_STATE, ...parsed });
      }
    } catch (e) {
      // corrupted or missing data — start fresh
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        // storage full or unavailable — fail silently, nothing else to do client-side
      }
    }, 300);
    return () => clearTimeout(t);
  }, [state, ready]);

  function update(patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) {
    setState((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
  }

  function reset() {
    setState(DEFAULT_STATE);
  }

  function exportBackup() {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bloom-budget-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importBackup(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(String(e.target?.result));
          setState({ ...DEFAULT_STATE, ...parsed });
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }

  return { state, ready, update, reset, exportBackup, importBackup };
}
