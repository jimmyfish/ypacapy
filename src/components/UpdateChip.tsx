import "./UpdateChip.css";
import { useEffect, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useUpdates } from "../updates";
import { RELEASES_URL, mb, noteLines, releaseDate } from "../lib/updater";
import { CircleArrowDown, CircleCheck, ExternalLink, LoaderCircle, RefreshCw, TriangleAlert, ico } from "./Icon";

/**
 * Title-strip chip beside the Settings gear, shown only while there is an update to act on:
 * available, downloading, ready to restart, or a failed install. Its popover carries each step.
 * A failed check shows nothing here; Settings > Updates reports it.
 */
export function UpdateChip() {
  const state = useUpdates((u) => u.state);
  const failed = useUpdates((u) => u.failed);
  const target = useUpdates((u) => u.target);
  const version = useUpdates((u) => u.version);
  const open = useUpdates((u) => u.popover);
  const { setPopover, install, restart } = useUpdates.getState();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPopover(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setPopover(false);
    window.addEventListener("mousedown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", down);
      window.removeEventListener("keydown", key);
    };
  }, [open, setPopover]);

  const installFailed = state.kind === "error" && failed === "install";
  if (!(state.kind === "available" || state.kind === "downloading" || state.kind === "installing" || state.kind === "ready" || installFailed)) return null;

  const toggle = () => setPopover(!open);
  const pct = state.kind === "downloading" && state.total ? Math.floor((state.received / state.total) * 100) : undefined;

  let chip;
  if (state.kind === "available") {
    chip = (
      <>
        <CircleArrowDown {...ico} />
        Update {state.version}
      </>
    );
  } else if (state.kind === "downloading" || state.kind === "installing") {
    chip = (
      <>
        <LoaderCircle {...ico} className="ico upd-spin" />
        {state.kind === "installing" ? "Installing" : pct !== undefined ? `Downloading ${pct}%` : "Downloading"}
      </>
    );
  } else if (state.kind === "ready") {
    chip = (
      <>
        <RefreshCw {...ico} />
        Restart to update
      </>
    );
  } else {
    chip = (
      <>
        <TriangleAlert {...ico} />
        Update failed
      </>
    );
  }

  return (
    <div className="upd-anchor" ref={ref}>
      <button
        type="button"
        className={`upd-chip${state.kind === "ready" ? " upd-chip--ready" : ""}${installFailed ? " upd-chip--error" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
      >
        {chip}
      </button>

      {open && state.kind === "available" && (
        <div className="upd-pop" role="dialog" aria-label="Update available">
          <div className="upd-head">
            <p className="upd-title">ypacapy {state.version} is available</p>
            <span className="upd-sub">
              You have {state.current}
              {releaseDate(state.date) ? ` · released ${releaseDate(state.date)}` : ""}
            </span>
          </div>
          <Notes notes={state.notes} version={state.version} />
          <div className="upd-actions">
            <button type="button" className="btn btn--quiet" onClick={() => setPopover(false)}>
              Later
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void install()}>
              Install update
            </button>
          </div>
        </div>
      )}

      {open && (state.kind === "downloading" || state.kind === "installing") && (
        <div className="upd-pop" role="dialog" aria-label="Downloading update">
          <div className="upd-head">
            <p className="upd-title">{state.kind === "installing" ? `Installing ${state.version}` : `Downloading ${state.version}`}</p>
            <span className="upd-sub">You can keep working while it {state.kind === "installing" ? "installs" : "downloads"}.</span>
          </div>
          <div
            className="upd-bar"
            role="progressbar"
            aria-label="Download progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={state.kind === "installing" ? 100 : pct}
          >
            <i style={{ width: `${state.kind === "installing" ? 100 : (pct ?? 0)}%` }} />
          </div>
          {state.kind === "downloading" && (
            <div className="upd-row">
              <span>{state.total ? `${mb(state.received)} of ${mb(state.total)} MB` : `${mb(state.received)} MB`}</span>
              {pct !== undefined && <span>{pct}%</span>}
            </div>
          )}
        </div>
      )}

      {open && state.kind === "ready" && (
        <div className="upd-pop" role="dialog" aria-label="Update ready">
          <div className="upd-head">
            <p className="upd-title">
              <CircleCheck {...ico} className="ico ok" />
              {state.version} is installed
            </p>
            <span className="upd-sub">Restart ypacapy to start using it.</span>
          </div>
          <div className="upd-actions">
            <button type="button" className="btn btn--quiet" onClick={() => setPopover(false)}>
              Later
            </button>
            <button type="button" className="btn btn--primary" onClick={() => void restart()}>
              Restart now
            </button>
          </div>
        </div>
      )}

      {open && state.kind === "error" && (
        <div className="upd-pop" role="dialog" aria-label="Update failed">
          <div className="upd-head">
            <p className="upd-title">
              <TriangleAlert {...ico} className="ico bad" />
              Couldn't install {target ?? "the update"}
            </p>
            {version && <span className="upd-sub">ypacapy {version} is unchanged.</span>}
          </div>
          <p className="upd-err">{state.message}</p>
          <div className="upd-actions">
            <button type="button" className="upd-link" onClick={() => void openUrl(`${RELEASES_URL}/latest`)}>
              Download from GitHub
              <ExternalLink {...ico} />
            </button>
            <button type="button" className="btn" onClick={() => void install()}>
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Notes({ notes, version }: { notes?: string; version: string }) {
  const lines = noteLines(notes);
  if (!lines.length) {
    return (
      <button type="button" className="upd-link" onClick={() => void openUrl(`${RELEASES_URL}/tag/v${version}`)}>
        See what's new on GitHub
        <ExternalLink {...ico} />
      </button>
    );
  }
  return (
    <ul className="upd-notes">
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
}
