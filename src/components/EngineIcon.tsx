import type { CSSProperties } from "react";
import type { Engine } from "../types";

/**
 * Connection type icons, adopted from opengrip (src/ui/openidea/database/{postgres,mysql,sqlite}{,_dark}.svg):
 * a PostgreSQL elephant, a MySQL / MariaDB dolphin, an SQLite feather. 16x16, in their own brand colours.
 * The light and _dark files differ only in colour, so each fill is one light-dark() pair and follows the
 * color-scheme every theme and scheme sets (tokens.css, schemeTokens() in themes.ts).
 */
const ld = (light: string, dark: string) => `light-dark(${light}, ${dark})`;
const fill = (light: string, dark: string): CSSProperties => ({ fill: ld(light, dark) });
const stroke = (light: string, dark: string): CSSProperties => ({ stroke: ld(light, dark) });

function Postgres() {
  const line = stroke("#ffffff", "#e6eef5");
  return (
    <>
      <path
        d="M4.2 3C5.4 1.9 7.6 1.5 9.6 1.9C12.4 2.5 14 4.5 13.7 7.4C13.5 9.2 12.6 10.4 11.3 10.7L11.5 13.2C11.5 14 10.7 14.5 10 14L9.1 13.3V11C7.8 11.1 6.6 10.8 5.7 10.1C5.4 11.2 4.8 12.2 3.8 12.5C3 12.7 2.4 11.9 2.8 11.2C3.4 10.1 3.3 8.8 2.9 7.6C2.4 5.9 2.8 4.2 4.2 3Z"
        style={{ ...fill("#336791", "#4c82b5"), ...line }}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path d="M9.6 4.5C10.8 5.3 11.3 6.8 10.8 8.4" style={line} strokeWidth="0.8" strokeLinecap="round" />
      <circle cx="7.6" cy="5.4" r="0.8" style={fill("#ffffff", "#e6eef5")} />
    </>
  );
}

function Mysql() {
  return (
    <>
      <path d="M1.5 12C3.1 8.3 6.3 5.7 10.2 5.2C11 4.1 12.1 3.3 13.6 3.1C13.2 4 13.1 4.9 13.4 5.7C14.2 6.6 14.6 7.9 14.4 9.3C13.8 8.5 12.8 8 11.7 8C8.7 8 5.4 9.6 1.5 12Z" style={fill("#00758f", "#2a9bb5")} />
      <path d="M11.8 9.7C12.4 10.9 12.3 12.4 11.5 13.7C11.3 12.5 10.6 11.6 9.7 11.1" style={stroke("#f29111", "#f5a742")} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Sqlite() {
  return (
    <>
      <path d="M2 3.5C2 2.67 2.67 2 3.5 2H10.2L7.6 14H3.5C2.67 14 2 13.33 2 12.5V3.5Z" style={fill("#0f80cc", "#3d8fd1")} />
      <path d="M14.2 1.4C11.3 2.4 9.3 5.4 8.6 9.3L8 14H8.9L9.5 9.7C12.6 8.6 14.5 5.4 14.2 1.4Z" style={fill("#0b4f82", "#9ccbf0")} />
      <path d="M13.4 2.9C11.7 4.6 10.4 6.9 9.5 9.6" style={stroke("#bfe0f7", "#1e3a52")} strokeWidth="0.7" strokeLinecap="round" />
    </>
  );
}

const GLYPHS: Record<Engine, () => JSX.Element> = { postgres: Postgres, mysql: Mysql, sqlite: Sqlite };

export function EngineIcon({ engine, size = 16, className }: { engine: Engine; size?: number; className?: string }) {
  const Glyph = GLYPHS[engine];
  return (
    <svg className={`engine-ico${className ? " " + className : ""}`} width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <Glyph />
    </svg>
  );
}
