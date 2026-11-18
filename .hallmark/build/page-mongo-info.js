  // Info: a collection's "…" menu opens it. The app reads $collStats once on open and on Refresh; the preview shows
  // a short "reading" state, then the sample numbers.
  {
    const dlg = $("#info-dlg");
    let timer;
    const show = (st) => $$("[data-info-state]", dlg).forEach((b) => { b.hidden = b.dataset.infoState !== st; });
    const read = () => { clearTimeout(timer); show("loading"); $("#info-refresh").disabled = true; timer = setTimeout(() => { show("ready"); $("#info-refresh").disabled = false; }, 600); };
    const open = (name, loading) => {
      $("#info-name").textContent = name; $$("[data-info-name]", dlg).forEach((x) => { x.textContent = name; });
      dlg.hidden = false;
      if (loading) { clearTimeout(timer); show("loading"); $("#info-refresh").disabled = true; } else read();
      $("[data-info-close]", dlg).focus();
    };
    const close = () => { clearTimeout(timer); dlg.hidden = true; };
    $("[data-info]")?.addEventListener("click", (e) => {
      const row = e.target.closest(".row"), m = $("#row-menu");
      m.hidden = true; row?.classList.remove("menu-open");
      open(row ? $(".name", row).textContent : "orders");
    });
    $("#info-refresh").addEventListener("click", read);
    $("[data-info-close]", dlg).addEventListener("click", close);
    dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !dlg.hidden) close(); });
    // preview states: Info open on orders, ready or still reading
    window.mInfo = (k) => {
      close();
      if (k === "info") { open("orders"); clearTimeout(timer); show("ready"); $("#info-refresh").disabled = false; }
      if (k === "info-loading") open("orders", true);
    };
  }
