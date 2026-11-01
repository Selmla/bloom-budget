"use client";

import { useEffect, useRef, useState } from "react";
import { AppState, DEFAULT_STATE } from "./types";
import { restoreState } from "./storage";

const STORAGE_KEY = "bloom-budget-state";

// Everything lives in this browser's localStorage only. Nothing is sent anywhere —
// there is no server, no account, and no sync between devices. Each person who installs
// the app gets their own private copy on their own device.
export function useAppState() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const loadedOnce = useRef(false);
  const unreadableRaw = useRef<string | null>(null);
  const [storageError, setStorageError] = useState("");
  const [undoState, setUndoState] = useState<{
    state: AppState;
    label: string;
  } | null>(null);
  const currentState = useRef(state);
  currentState.current = state;

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        unreadableRaw.current = raw;
        const parsed = JSON.parse(raw);
        setState(restoreState(parsed));
        unreadableRaw.current = null;
      }
    } catch (e) {
      setStorageError(
        "Sparad data kunde inte läsas. Originalet finns kvar i webbläsaren. Importera en giltig backup innan du fortsätter.",
      );
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || storageError) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        setStorageError(
          "Det gick inte att spara på enheten. Exportera en backup innan du stänger appen.",
        );
      }
    }, 300);
    return () => clearTimeout(t);
  }, [state, ready, storageError]);

  useEffect(() => {
    if (!ready) return;
    function flush(event: Event) {
      if (unreadableRaw.current || storageError) {
        event.preventDefault();
        return;
      }
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(currentState.current),
        );
      } catch {
        event.preventDefault();
        setStorageError(
          "Det gick inte att spara. Uppdateringen väntar. Exportera en backup innan du stänger appen.",
        );
      }
    }
    window.addEventListener("bloom-before-update", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("bloom-before-update", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, [ready, storageError]);

  function update(
    patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>),
    undoLabel?: string,
  ) {
    if (undoLabel) setUndoState({ state, label: undoLabel });
    else setUndoState(null);
    setState((prev) => ({
      ...prev,
      ...(typeof patch === "function" ? patch(prev) : patch),
    }));
  }
  function undo() {
    if (undoState) {
      setState(undoState.state);
      setUndoState(null);
    }
  }

  function reset() {
    setState(DEFAULT_STATE);
    setStorageError("");
    unreadableRaw.current = null;
    setUndoState(null);
  }

  function exportBackup() {
    const json = unreadableRaw.current ?? JSON.stringify(state, null, 2);
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
          setState(restoreState(parsed));
          setStorageError("");
          unreadableRaw.current = null;
          setUndoState(null);
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }

  return {
    state,
    ready,
    update,
    reset,
    exportBackup,
    importBackup,
    storageError,
    undoLabel: undoState?.label,
    undo,
  };
}
