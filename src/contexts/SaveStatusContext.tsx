import React, { createContext, useContext, useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface SaveStatusValue {
  status: SaveStatus;
}

const SaveStatusContext = createContext<SaveStatusValue>({ status: "idle" });

// ── localStorage interceptor (runs once per page load) ────────────────────────
// We patch window.localStorage.setItem so that any write to a clb:p:* key
// automatically fires a custom DOM event. This means every page and hook gets
// save tracking for free — no refactoring required.
// We mark the patched function so HMR re-evaluation never double-wraps it.
type PatchedSetItem = typeof localStorage.setItem & { __clb?: true };

function patchLocalStorage() {
  if (typeof window === "undefined") return;
  const current = window.localStorage.setItem as PatchedSetItem;
  if (current.__clb) return; // already patched

  const orig = current.bind(window.localStorage);

  const patched: PatchedSetItem = function(key: string, value: string) {
    if (key.startsWith("clb:p:")) {
      try {
        orig(key, value);
        window.dispatchEvent(new CustomEvent("clb:write"));
      } catch {
        window.dispatchEvent(new CustomEvent("clb:write:error"));
      }
    } else {
      orig(key, value);
    }
  };
  patched.__clb = true;
  window.localStorage.setItem = patched;
}

patchLocalStorage();

// ── Provider ──────────────────────────────────────────────────────────────────
export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus]   = useState<SaveStatus>("idle");
  const saveTimer  = useRef<ReturnType<typeof setTimeout>>();
  const idleTimer  = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function onWrite() {
      setStatus("saving");

      // Reset both timers on every write so we debounce bursts
      clearTimeout(saveTimer.current);
      clearTimeout(idleTimer.current);

      // After 800ms of silence → mark as saved
      saveTimer.current = setTimeout(() => {
        setStatus("saved");

        // Auto-hide after 2.5s of "saved"
        idleTimer.current = setTimeout(() => setStatus("idle"), 2500);
      }, 800);
    }

    function onWriteError() {
      setStatus("error");
      clearTimeout(saveTimer.current);
      clearTimeout(idleTimer.current);

      // Auto-retry / reset after 5s
      idleTimer.current = setTimeout(() => setStatus("idle"), 5000);
    }

    window.addEventListener("clb:write",       onWrite);
    window.addEventListener("clb:write:error", onWriteError);

    return () => {
      window.removeEventListener("clb:write",       onWrite);
      window.removeEventListener("clb:write:error", onWriteError);
      clearTimeout(saveTimer.current);
      clearTimeout(idleTimer.current);
    };
  }, []);

  return (
    <SaveStatusContext.Provider value={{ status }}>
      {children}
    </SaveStatusContext.Provider>
  );
}

export function useSaveStatus(): SaveStatusValue {
  return useContext(SaveStatusContext);
}
