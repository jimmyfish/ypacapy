// Empty states gallery: the bar's states show one group, or all of them; the side list follows.
// Everything is drawn at rest. Links and buttons do nothing here; a click only moves focus.
window.pvShow = (k) => {
  $$(".mg-group").forEach((g) => { g.hidden = k !== "all" && g.dataset.group !== k; });
  $$("[data-toc]").forEach((t) => { t.hidden = k !== "all" && t.dataset.toc !== k; });
  $(".mg-main")?.scrollTo({ top: 0 });
};
// the side list marks the card in view
{
  const links = new Map($$(".mg-toc a").map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => a.removeAttribute("aria-current"));
    links.get(e.target.id)?.setAttribute("aria-current", "true");
  }), { root: $(".mg-main"), rootMargin: "-20% 0px -70% 0px" });
  $$(".mg-item").forEach((i) => io.observe(i));
}
// Redesign or Current: every card swaps its stage; the pick rides in the URL as ?v=cur
{
  const set = (v) => {
    $$("[data-ver]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ver === v)));
    $$(".eg-v").forEach((s) => { s.hidden = s.dataset.v !== v; });
    const u = new URL(location);
    if (v === "cur") u.searchParams.set("v", "cur"); else u.searchParams.delete("v");
    history.replaceState(null, "", u);
  };
  $$("[data-ver]").forEach((b) => b.addEventListener("click", () => set(b.dataset.ver)));
  if (new URLSearchParams(location.search).get("v") === "cur") set("cur");
}
