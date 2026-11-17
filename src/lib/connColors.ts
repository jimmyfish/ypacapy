/**
 * Connection colours: the Flat UI convention (the --tag-* fills in tokens.css), fixed in every theme and scheme.
 * `id` is what a connection stores. Ids 1..6 keep the hue they had before the convention
 * (Blue, Green, Orange, Violet, Teal, Pink), so saved connections need no migration.
 * The tile tokens --proj-<id>-fg/-bg are this hex fitted to each background: tokens.css for the built-in themes,
 * schemeTokens() in themes.ts for the others.
 */
export interface ConnColor {
  id: number;
  name: string;
  /** the plain colour word it stands in for */
  alias?: string;
  hex: string;
}

/** Picker order: the convention's own order. */
export const CONN_COLORS: readonly ConnColor[] = [
  { id: 5, name: "Turquoise", hex: "#1abc9c" },
  { id: 2, name: "Emerald", alias: "green", hex: "#2ecc71" },
  { id: 7, name: "Sunflower", alias: "yellow", hex: "#f1c40f" },
  { id: 3, name: "Carrot", alias: "orange", hex: "#e67e22" },
  { id: 6, name: "Alizarin", alias: "red", hex: "#e74c3c" },
  { id: 1, name: "River", alias: "blue", hex: "#3498db" },
  { id: 8, name: "Asphalt", alias: "blackish", hex: "#34495e" },
  { id: 4, name: "Amethyst", alias: "purple", hex: "#9b59b6" },
];

export const CONN_COLOR_COUNT = CONN_COLORS.length;

/** A stored colour id, clamped to one that exists (unknown or 0 falls back to River). */
export const connColorId = (n: number | undefined) => (n && n >= 1 && n <= CONN_COLOR_COUNT ? Math.round(n) : 1);

export const connColor = (n: number | undefined) => CONN_COLORS.find((c) => c.id === connColorId(n))!;

/** Hex by id, index 0 = id 1: what themes.ts walks to build --proj-<id>-fg/-bg. */
export const CONN_HEX_BY_ID: readonly string[] = [...CONN_COLORS].sort((a, b) => a.id - b.id).map((c) => c.hex);
