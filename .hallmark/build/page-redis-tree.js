  // Redis tree: Expiring only keeps the keys that have a TTL, out of the keys read so far, with their folders opened.
  // The TTLs came with the scan (one TTL per key, pipelined with TYPE); toggling sends nothing.
  // It runs after the shared tree layout (filter typing, folder clicks), so the two filters combine.
  {
    const btn = $("#ttl-only"), filter = $("#tree-filter"), rows = $$("#tree .row[data-path]"), n = $("#scan-n");
    const on = () => btn.getAttribute("aria-pressed") === "true";
    const apply = () => {
      n.textContent = on() ? n.dataset.ttl : n.dataset.all;
      // folders show open while the mode opens them, and go back to their own state after
      $$("#tree [data-group]").forEach((g) => { $("use", g).setAttribute("href", on() || g.getAttribute("aria-expanded") === "true" ? "#i-chevron-down" : "#i-chevron-right"); });
      if (!on()) return;
      const q = filter.value.trim().toLowerCase();
      const hit = (r) => r.hasAttribute("data-ttl") && (!q || $(".name", r).textContent.toLowerCase().includes(q));
      rows.forEach((r) => {
        const leaf = !$(".row-main", r).hasAttribute("aria-expanded");
        r.hidden = leaf ? !hit(r) : !rows.some((x) => x.dataset.path.startsWith(r.dataset.path + "/") && hit(x));
      });
      $("#tree-empty").hidden = rows.some((r) => r.hasAttribute("data-ttl") && !r.hidden);
    };
    window.rTtlOnly = (v) => {
      btn.setAttribute("aria-pressed", String(v));
      btn.title = v ? "Show every key" : "Show only keys that expire";
      filter.dispatchEvent(new Event("input"));
    };
    btn.addEventListener("click", () => window.rTtlOnly(!on()));
    filter.addEventListener("input", apply);
    $$("#tree [data-group]").forEach((g) => g.addEventListener("click", apply));
  }
