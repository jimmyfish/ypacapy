const DAY = 86_400_000;

/** "just now", "5 min ago", "3 h ago", "yesterday" (as voidHTTP; Settings > Updates and About) */
export function ago(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d} days ago`;
  return new Date(ts).toLocaleDateString();
}

export const startOfDay = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const clock = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

/** "today at 09:41", "yesterday at 16:40", "on 3 Nov at 10:12" */
export function when(t: number): string {
  const today = startOfDay(Date.now());
  if (t >= today) return `today at ${clock(t)}`;
  if (t >= today - DAY) return `yesterday at ${clock(t)}`;
  return `on ${new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" })} at ${clock(t)}`;
}

/** "Today", "Yesterday", "Monday 3 November" */
export function dayLabel(t: number): string {
  const today = startOfDay(Date.now());
  if (t >= today) return "Today";
  if (t >= today - DAY) return "Yesterday";
  return new Date(t).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export const clockOf = clock;

/** 38 ms, 1.2 s, 2 min 5 s */
export function duration(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  return `${m} min ${Math.round((ms % 60_000) / 1000)} s`;
}
