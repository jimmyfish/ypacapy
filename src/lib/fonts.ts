import { invoke } from "@tauri-apps/api/core";

export interface FontList {
  /** Every installed family, sorted. */
  all: string[];
  /** Families with a monospaced face, sorted. */
  mono: string[];
}

let cached: Promise<FontList> | undefined;

/** Installed font families from the OS, scanned once per app run. Empty lists outside Tauri or on failure. */
export function systemFonts(): Promise<FontList> {
  cached ??= invoke<FontList>("list_fonts").catch(() => {
    cached = undefined; // allow a retry next time
    return { all: [], mono: [] };
  });
  return cached;
}
