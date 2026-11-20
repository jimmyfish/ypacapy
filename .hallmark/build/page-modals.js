// Modals gallery: the bar's states show one group of dialogs, or all of them; the side list follows.
// The dialogs are drawn at rest. Nothing submits, nothing closes: a click only moves focus.
window.pvShow = (k) => {
  $$(".mg-group").forEach((g) => { g.hidden = k !== "all" && g.dataset.group !== k; });
  $$("[data-toc]").forEach((t) => { t.hidden = k !== "all" && t.dataset.toc !== k; });
  $(".mg-main")?.scrollTo({ top: 0 });
};
document.addEventListener("submit", (e) => e.preventDefault());
// the show/hide eye in the passphrase wells works, as in the app
$$("[data-auth-eye]").forEach((b) => b.addEventListener("click", () => {
  const input = b.parentElement.querySelector("input");
  const on = input.type === "password";
  input.type = on ? "text" : "password";
  b.setAttribute("aria-pressed", String(on));
  b.setAttribute("aria-label", on ? "Hide passphrase" : "Show passphrase");
  $("use", b)?.setAttribute("href", on ? "#i-eye-off" : "#i-eye");
}));
// the side list marks the dialog in view
{
  const links = new Map($$(".mg-toc a").map((a) => [a.getAttribute("href").slice(1), a]));
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    links.forEach((a) => a.removeAttribute("aria-current"));
    links.get(e.target.id)?.setAttribute("aria-current", "true");
  }), { root: $(".mg-main"), rootMargin: "-20% 0px -70% 0px" });
  $$(".mg-item").forEach((i) => io.observe(i));
}
