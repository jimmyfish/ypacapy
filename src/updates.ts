// Update flow state (ported from voidHTTP), for the title-strip chip, its popover and Settings > Updates.
import { create } from "zustand";
import { getVersion } from "@tauri-apps/api/app";
import { checkForUpdate, hasPendingUpdate, installUpdate, restartToUpdate, type UpdateState } from "./lib/updater";
import { DEV_BUILD } from "./build";

interface Updates {
  state: UpdateState;
  /** the running version, from tauri.conf.json */
  version: string;
  checkedAt?: number;
  /** which step the error came from, so "Try again" repeats that step */
  failed?: "check" | "install";
  /** the version an install was for, kept for the error copy */
  target?: string;
  popover: boolean;
  setPopover(open: boolean): void;
  /** quiet: a failed check (offline, GitHub down) leaves no error behind; used for the launch check */
  check(opts?: { quiet?: boolean }): Promise<UpdateState>;
  install(): Promise<void>;
  restart(): Promise<void>;
}

const busy = (s: UpdateState) => s.kind === "checking" || s.kind === "downloading" || s.kind === "installing";

export const useUpdates = create<Updates>((set, get) => ({
  state: { kind: "idle" },
  version: "",
  popover: false,

  setPopover(open) {
    set({ popover: open });
  },

  async check({ quiet = false } = {}) {
    const prev = get().state;
    // a dev build never checks: an update would replace it with the release from GitHub
    if (DEV_BUILD) return prev;
    // a found or installed update stays until the app restarts
    if (busy(prev) || prev.kind === "ready") return prev;
    set({ state: { kind: "checking" } });
    const next = await checkForUpdate();
    if (next.kind === "error" && quiet) {
      set({ state: prev });
      return next;
    }
    set({ state: next, checkedAt: Date.now(), failed: next.kind === "error" ? "check" : undefined });
    return next;
  },

  async install() {
    if (DEV_BUILD) return;
    const s = get().state;
    if (busy(s) || s.kind === "ready") return;
    if (!hasPendingUpdate()) {
      await get().check();
      if (get().state.kind !== "available") return;
    }
    const target = (get().state as { version?: string }).version ?? get().target;
    set({ target, failed: undefined });
    let step = -1;
    const result = await installUpdate((p) => {
      // one store write per whole percent, not one per network chunk
      if (p.kind === "downloading" && p.total) {
        const pct = Math.floor((p.received / p.total) * 100);
        if (pct === step) return;
        step = pct;
      }
      set({ state: p });
    });
    set({ state: result, failed: result.kind === "error" ? "install" : undefined });
  },

  restart() {
    return restartToUpdate();
  },
}));

getVersion()
  .then((version) => useUpdates.setState({ version }))
  .catch(() => {});
