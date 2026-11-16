const DAY = 86_400_000;

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
