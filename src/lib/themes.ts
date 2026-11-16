/**
 * Colour schemes imported from Ghostty's theme files, turned into the colour tokens of tokens.css.
 * Any scheme can sit in either the light or the dark slot; nothing checks that a "light" pick is light.
 * Mirror: .hallmark/preview/themes.js. Keep the two in step. Taken from voidHTTP; ypacapy ships the Ayu and Atom One families.
 */

/** A Ghostty theme, verbatim: background, foreground and palette 0..15. */
interface Ghostty {
  bg: string;
  fg: string;
  p: string[];
}

export interface Scheme {
  id: string;
  name: string;
  family: string;
  g: Ghostty;
}

const G = (bg: string, fg: string, p: string): Ghostty => ({ bg, fg, p: p.split(" ") });

export const SCHEMES: Scheme[] = [
  { id: "ayu", name: "Ayu", family: "Ayu", g: G("#0b0e14", "#bfbdb6", "#11151c #ea6c73 #7fd962 #f9af4f #53bdfa #cda1fa #90e1c6 #c7c7c7 #686868 #f07178 #aad94c #ffb454 #59c2ff #d2a6ff #95e6cb #ffffff") },
  { id: "ayu-light", name: "Ayu Light", family: "Ayu", g: G("#f8f9fa", "#5c6166", "#000000 #ea6c6d #6cbf43 #eca944 #3199e1 #9e75c7 #46ba94 #bababa #686868 #f07171 #86b300 #f2ae49 #399ee6 #a37acc #4cbf99 #d1d1d1") },
  { id: "ayu-mirage", name: "Ayu Mirage", family: "Ayu", g: G("#1f2430", "#cccac2", "#171b24 #ed8274 #87d96c #facc6e #6dcbfa #dabafa #90e1c6 #c7c7c7 #686868 #f28779 #d5ff80 #ffd173 #73d0ff #dfbfff #95e6cb #ffffff") },
  { id: "atom-one-light", name: "Atom One Light", family: "Atom", g: G("#f9f9f9", "#2a2c33", "#000000 #de3e35 #3f953a #d2b67c #2f5af3 #950095 #3f953a #bbbbbb #000000 #de3e35 #3f953a #d2b67c #2f5af3 #a00095 #3f953a #ffffff") },
  { id: "atom-one-dark", name: "Atom One Dark", family: "Atom", g: G("#21252b", "#abb2bf", "#21252b #e06c75 #98c379 #e5c07b #61afef #c678dd #56b6c2 #abb2bf #767676 #e06c75 #98c379 #e5c07b #61afef #c678dd #56b6c2 #abb2bf") },
  
];

/** The two built-in schemes: tokens.css itself, light and dark. */
export const BUILTIN = {
  "ypacapy-light": { name: "ypacapy Light", dark: false, swatch: ["#ffffff", "#01804a", "#c74200", "#2e67e5", "#d00000"] },
  "ypacapy-dark": { name: "ypacapy Dark", dark: true, swatch: ["#161b25", "#01bf71", "#ff7a33", "#4f85fc", "#ff5c5c"] },
} as const;
export type BuiltinId = keyof typeof BUILTIN;
export const DEFAULT_SCHEME = { light: "ypacapy-light", dark: "ypacapy-dark" } as const;

export const findScheme = (id: string | undefined) => SCHEMES.find((s) => s.id === id);

type RGB = [number, number, number];
const rgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const hex = (c: number[]) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");
/** a weighted toward b by t (0..1), in sRGB */
const mix = (a: string, b: string, t: number) => {
  const y = rgb(b);
  return hex(rgb(a).map((v, i) => v + (y[i] - v) * t));
};
const lum = (h: string) => {
  const [r, g, b] = rgb(h).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const x = lum(a);
  const y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
/** the scheme's own hue, pushed toward black or white only as far as it takes to read on bg */
const fit = (c: string, bg: string, min = 4.5) => {
  const to = lum(bg) > 0.18 ? "#000000" : "#ffffff";
  for (let t = 0; t <= 1; t += 0.04) {
    const x = mix(c, to, t);
    if (contrast(x, bg) >= min) return x;
  }
  return to;
};
/** of the normal and bright slot of one hue, the one that reads better on bg */
const pick = (p: string[], n: number, bg: string) => (contrast(p[n + 8], bg) > contrast(p[n], bg) ? p[n + 8] : p[n]);
const alpha = (h: string, a: number) => `rgb(${rgb(h).join(" ")} / ${a})`;

/** Whether a scheme renders dark (its background is darker than its text), whatever slot it sits in. */
export const isDark = (s: Scheme) => lum(s.g.bg) < lum(s.g.fg);

/** Every colour token tokens.css defines, derived from one Ghostty scheme. Text colours are fitted to 4.5:1. */
export function schemeTokens(s: Scheme): Record<string, string> {
  const { bg: B, fg: F, p } = s.g;
  const dark = isDark(s);
  const red = pick(p, 1, B), green = pick(p, 2, B), yellow = pick(p, 3, B), blue = pick(p, 4, B), magenta = pick(p, 5, B), cyan = pick(p, 6, B);
  // terminal palettes carry no orange; POST and numbers take the midpoint of the scheme's red and yellow
  const orange = mix(red, yellow, 0.5);
  const txt = (c: string) => fit(c, B);
  // light schemes keep white button text: their blue is darkened just enough for white to read (3:1)
  const accent = dark ? p[4] : fit(p[4], "#ffffff", 3);
  // white on the accent, as the built-in themes do; a dark ink only when the accent is too pale for white (under 3:1)
  const accentInk = contrast("#ffffff", accent) >= 3 ? "#ffffff" : [B, F, "#ffffff", "#000000"].reduce((best, c) => (contrast(c, accent) > contrast(best, accent) ? c : best));
  const muted = fit(mix(F, B, 0.35), B);
  const t: Record<string, string> = {
    "--color-canvas": dark ? mix(B, "#000000", 0.3) : mix(B, F, 0.05),
    "--color-paper": B,
    "--color-paper-2": mix(B, F, 0.08),
    "--color-paper-3": mix(B, F, 0.04),
    "--color-thumb": dark ? mix(B, F, 0.16) : B,
    "--color-ink": txt(F),
    "--color-ink-2": txt(mix(F, B, 0.15)),
    "--color-muted": muted,
    "--color-placeholder": fit(mix(F, B, 0.4), B),
    "--color-rule": mix(B, F, 0.1),
    "--color-edge-soft": mix(B, F, 0.16),
    "--color-edge-aa": fit(mix(F, B, 0.5), B, 3),
    "--color-gutter": fit(blue, B, 3),
    "--color-guide": mix(B, F, 0.25),
    "--color-accent": accent,
    "--color-accent-ink": accentInk,
    "--color-accent-soft": mix(B, accent, 0.14),
    "--color-link": txt(blue),
    "--color-focus": fit(blue, B, 3),
    "--color-bar": accent,
    "--color-ok": txt(green),
    "--color-redir": txt(cyan),
    "--color-error": txt(red),
    "--color-warn": txt(yellow),
    "--color-hit": alpha(yellow, dark ? 0.22 : 0.3),
    "--color-hit-cur": alpha(yellow, dark ? 0.5 : 0.6),
    "--color-hit-edge": fit(yellow, B, 3),
    "--color-overlay": dark ? "rgb(0 0 0 / 0.55)" : alpha(F, 0.32),
    "--color-shadow": dark ? "rgb(0 0 0 / 0.3)" : alpha(F, 0.08),
    "--m-get": txt(green),
    "--m-post": txt(orange),
    "--m-put": txt(blue),
    "--m-patch": txt(magenta),
    "--m-delete": txt(red),
    "--m-head": txt(yellow),
    "--m-options": txt(mix(magenta, red, 0.5)),
    "--m-other": muted,
    // GraphQL keeps its own pink in every scheme: only its lightness follows the background
    "--m-gql": dark ? "#ff4fb8" : "#c4007f",
    // Kafka keeps its black and white in every scheme: asphalt on light backgrounds, clouds on dark
    "--m-kafka": dark ? "var(--tag-clouds)" : "var(--tag-asphalt)",
    "--j-key": txt(red),
    "--j-str": txt(green),
    "--j-num": txt(orange),
    "--j-bool": txt(magenta),
    "--j-punct": muted,
    "color-scheme": dark ? "dark" : "light",
  };
  [blue, green, orange, magenta, cyan, red].forEach((c, i) => {
    const bg = mix(B, c, dark ? 0.18 : 0.12);
    t[`--proj-${i + 1}-fg`] = fit(c, bg);
    t[`--proj-${i + 1}-bg`] = bg;
  });
  return t;
}

/** Five colours for the picker chip: the background, then green, yellow, blue, red. */
export function schemeSwatch(id: string): readonly string[] {
  if (id in BUILTIN) return BUILTIN[id as BuiltinId].swatch;
  const s = findScheme(id);
  if (!s) return BUILTIN["ypacapy-light"].swatch;
  return [s.g.bg, ...[2, 3, 4, 1].map((n) => pick(s.g.p, n, s.g.bg))];
}

/** Families in order, for the grouped dropdown. */
export const FAMILIES = [...new Set(SCHEMES.map((s) => s.family))];
