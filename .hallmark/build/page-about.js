  // About: one update card per updater state, or the build card in a dev build
  const cards = $$("[data-about]");
  const step = (k) => {
    cards.forEach((c) => { c.hidden = c.dataset.about !== k; });
    const dev = k === "dev";
    $("[data-about-dev]").hidden = !dev;
    $("[data-ver]").textContent = dev ? "v0.0.1-4-g1a19d06+" : "v0.0.1";
  };
  $$("[data-about-go]").forEach((b) => b.addEventListener("click", () => step(b.dataset.aboutGo)));
  // release notes: the first 3, the rest behind "Show all"
  const more = $("[data-more-btn]");
  more.addEventListener("click", () => {
    const open = more.getAttribute("aria-expanded") !== "true";
    more.setAttribute("aria-expanded", String(open));
    $("[data-more]").hidden = !open;
    more.closest(".about-notes").toggleAttribute("data-open", open);
    more.firstChild.textContent = open ? "Show less" : `Show all ${$$(".about-notes li").length} changes`;
  });
  // version: one click copies it for a bug report
  const ver = $(".about-ver");
  ver.addEventListener("click", () => {
    const text = $("[data-ver]").textContent;
    navigator.clipboard?.writeText(`ypacapy ${text}`).catch(() => {});
    ver.setAttribute("data-copied", ""); $("[data-ver]").textContent = "Copied";
    setTimeout(() => { ver.removeAttribute("data-copied"); $("[data-ver]").textContent = text; }, 1400);
  });
  // a click on the icon drops it back into the water: the rings restart from the middle
  const onsen = $(".about-onsen");
  onsen.addEventListener("click", () => { onsen.classList.remove("ping"); void onsen.offsetWidth; onsen.classList.add("ping"); });
  window.pvShow = step;
