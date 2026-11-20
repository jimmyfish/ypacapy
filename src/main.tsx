/// <reference types="vite/client" />
import React from "react";
import ReactDOM from "react-dom/client";
// Shared kit first: each component then imports its own CSS, which must land after it in the bundle.
import "./styles.css";
import App from "./App";

// The webview's own menu (Reload, and Inspect in dev builds) is not an app menu. Keep the native menu
// only where it edits or copies text. Dev builds keep it everywhere, so Inspect Element stays reachable.
if (!import.meta.env.DEV)
  document.addEventListener("contextmenu", (e) => {
    if ((e.target as Element).closest?.("input, textarea, [contenteditable]")) return;
    if (!window.getSelection()?.isCollapsed) return;
    e.preventDefault();
  });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
