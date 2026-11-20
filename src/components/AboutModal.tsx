import "./AboutModal.css";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useUpdates } from "../updates";
import { RELEASES_URL, REPO_URL, mb, noteLines, releaseDate } from "../lib/updater";
import { ago } from "../lib/time";
import { DEV_BUILD, type DevBuild } from "../build";
import { ChevronDown, CircleArrowDown, CircleDot, Copy, ExternalLink, Github, LoaderCircle, RefreshCw, X, ico } from "./Icon";

/** Notes longer than this fold behind "Show all n changes". */
const NOTES_SHOWN = 3;

/**
 * About ypacapy (ported from voidHTTP's AboutModal, preview .hallmark/preview/about.html), opened from the app menu
 * in place of the native macOS panel. voidHTTP draws its update card as a request; ypacapy draws it as a query,
 * since that is what ypacapy shows all day. The capybara icon soaks in an onsen: water rings under it, steam above.
 * The update card reads the same store as the title-strip chip and Settings > Updates.
 */
export function AboutModal({ onClose }: { onClose: () => void }) {
  const version = useUpdates((u) => u.version);
  const kind = useUpdates((u) => u.state.kind);
  const onsen = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // opening About is a good moment to look: check once if nothing has been checked yet
  useEffect(() => {
    if (kind === "idle") void useUpdates.getState().check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);

  // a dev build shows the commit it runs from (v0.0.1-4-g1a19d06+), not the tauri.conf.json version
  const shown = DEV_BUILD?.describe || (version && `v${version}`);
  const copyVersion = () => {
    const text = DEV_BUILD
      ? `ypacapy ${version} dev (${[DEV_BUILD.describe, DEV_BUILD.branch && `branch ${DEV_BUILD.branch}`].filter(Boolean).join(", ")})`
      : `ypacapy ${version}`;
    void navigator.clipboard.writeText(text).then(() => setCopied(true));
  };

  // a click on the icon drops it back into the water: the rings restart from the middle
  const ping = () => {
    const el = onsen.current;
    if (!el) return;
    el.classList.remove("ping");
    void el.offsetWidth;
    el.classList.add("ping");
  };

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="about" role="dialog" aria-modal="true" aria-labelledby="about-name">
        <button type="button" className="icon-btn about-close" aria-label="Close" onClick={onClose}>
          <X {...ico} />
        </button>
        <header className="about-hero">
          <div className="about-onsen ping" ref={onsen} aria-hidden="true" onClick={ping}>
            <span className="steam">
              <b />
              <b />
              <b />
            </span>
            <i />
            <i />
            <i />
            <img src="/app-icon.png" alt="" />
          </div>
          <h2 className="about-name" id="about-name" title="Try reading it backwards">
            ypa<span>capy</span>
          </h2>
          <p className="about-tag">A hot spring for your databases.</p>
          {shown && (
            <div className="about-verline">
              {DEV_BUILD && <span className="build-tag">dev</span>}
              <button type="button" className="about-ver" title="Copy version" data-copied={copied || undefined} onClick={copyVersion}>
                {copied ? "Copied" : shown}
                <Copy {...ico} />
              </button>
            </div>
          )}
        </header>
        <div className="about-body">
          {DEV_BUILD ? <BuildCard b={DEV_BUILD} /> : <UpdateCard />}
          <nav className="about-links" aria-label="Links">
            <button type="button" className="btn btn--quiet" onClick={() => void openUrl(REPO_URL)}>
              <Github {...ico} />
              GitHub
            </button>
            <button type="button" className="btn btn--quiet" onClick={() => void openUrl(`${REPO_URL}/issues/new`)}>
              <CircleDot {...ico} />
              Report an issue
            </button>
          </nav>
          <p className="about-foot">ypacapy is a capy and its reflection in the onsen. Same both ways, calm both ways.</p>
        </div>
      </div>
    </div>
  );
}

const K = ({ children }: { children: ReactNode }) => <span className="q-k">{children}</span>;
const Tb = ({ children }: { children: ReactNode }) => <span className="q-tb">{children}</span>;
const Str = ({ children }: { children: ReactNode }) => <span className="q-s">'{children}'</span>;

/** select * from releases where version > '0.0.1' */
const CheckSql = ({ current }: { current: string }) => (
  <>
    <K>select</K> * <K>from</K> <Tb>releases</Tb> <K>where</K> version &gt; <Str>{current}</Str>
  </>
);
/** insert into app values ('0.0.2') */
const InstallSql = ({ version }: { version: string }) => (
  <>
    <K>insert into</K> <Tb>app</Tb> <K>values</K> (<Str>{version}</Str>)
  </>
);

/** One query line: the statement, its status on the right, optional progress along its bottom edge. */
function Line({ sql, status, progress }: { sql: ReactNode; status: ReactNode; progress?: number }) {
  return (
    <div className="about-res-line">
      <code className="about-sql">{sql}</code>
      {status}
      {progress !== undefined && <i className="about-prog" style={{ "--p": `${progress}%` } as CSSProperties} />}
    </div>
  );
}

const Wait = ({ label }: { label: string }) => (
  <span className="status wait">
    <LoaderCircle {...ico} className="ico upd-spin" />
    {label}
  </span>
);

/** A dev build in place of the update card: where it comes from, as a one-row result, and that updates are off. */
function BuildCard({ b }: { b: DevBuild }) {
  const at = new Date(b.at).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="about-res" aria-label="Build">
      <Line
        sql={
          <>
            <K>select</K> * <K>from</K> <Tb>build</Tb>
          </>
        }
        status={<span className="status">1 row</span>}
      />
      <dl>
        <dt>channel</dt>
        <dd>dev</dd>
        {b.describe && (
          <>
            <dt>version</dt>
            <dd>
              {b.describe}
              {b.tag && b.ahead > 0 && (
                <span className="muted">
                  {" "}
                  · {b.ahead} commit{b.ahead === 1 ? "" : "s"} after {b.tag}
                </span>
              )}
            </dd>
          </>
        )}
        {b.branch && (
          <>
            <dt>branch</dt>
            <dd>{b.branch}</dd>
          </>
        )}
        {b.sha && (
          <>
            <dt>commit</dt>
            <dd>
              {b.sha}
              {b.dirty && <span className="muted"> + uncommitted changes</span>}
            </dd>
          </>
        )}
        <dt>{b.serve ? "started" : "built"}</dt>
        <dd>{at}</dd>
        <dt>updates</dt>
        <dd className="warn">off in dev builds</dd>
      </dl>
    </div>
  );
}

/** Updates as a query: 0 rows when current, 1 row with notes when there is one, progress while downloading, awaiting commit to restart. */
function UpdateCard() {
  const u = useUpdates();
  const st = u.state;
  const current = u.version || "…";

  let line: ReactNode;
  let body: ReactNode;
  const checkAgain = (
    <button type="button" className="btn" disabled={st.kind === "checking"} onClick={() => void u.check()}>
      <RefreshCw {...ico} />
      Check again
    </button>
  );

  if (st.kind === "available") {
    line = <Line sql={<CheckSql current={st.current} />} status={<span className="status">1 row</span>} />;
    const date = releaseDate(st.date);
    body = (
      <>
        <div className="about-upd-row">
          <p className="about-upd-text">
            <strong>ypacapy {st.version} is out</strong>
            <span className="sub">
              You're on {st.current}
              {date ? ` · released ${date}` : ""}
            </span>
          </p>
        </div>
        <Notes notes={st.notes} />
        <div className="about-upd-row">
          <button type="button" className="upd-link" onClick={() => void openUrl(`${RELEASES_URL}/tag/v${st.version}`)}>
            Release notes
            <ExternalLink {...ico} />
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void u.install()}>
            <CircleArrowDown {...ico} />
            Install update
          </button>
        </div>
      </>
    );
  } else if (st.kind === "downloading") {
    const pct = st.total ? Math.floor((st.received / st.total) * 100) : undefined;
    line = <Line sql={<InstallSql version={st.version} />} status={<span className="status busy">{pct !== undefined ? `${pct}%` : "running"}</span>} progress={pct ?? 0} />;
    body = (
      <div className="about-upd-row">
        <p className="about-upd-text">
          Downloading {st.version}
          {pct !== undefined ? ` · ${pct}%` : "…"}
          <span className="sub">
            {st.total ? `${mb(st.received)} of ${mb(st.total)} MB` : `${mb(st.received)} MB`} · go on, keep working
          </span>
        </p>
      </div>
    );
  } else if (st.kind === "installing") {
    line = <Line sql={<InstallSql version={st.version} />} status={<Wait label="verifying" />} progress={100} />;
    body = (
      <div className="about-upd-row">
        <p className="about-upd-text">
          Installing {st.version}…<span className="sub">Downloaded, signature checks out</span>
        </p>
      </div>
    );
  } else if (st.kind === "ready") {
    line = <Line sql={<InstallSql version={st.version} />} status={<span className="status busy">awaiting commit</span>} />;
    body = (
      <div className="about-upd-row">
        <p className="about-upd-text">
          <strong>{st.version} is in</strong>
          <span className="sub">Restart ypacapy to commit it.</span>
        </p>
        <button type="button" className="btn btn--primary" onClick={() => void u.restart()}>
          <RefreshCw {...ico} />
          Restart now
        </button>
      </div>
    );
  } else if (st.kind === "error") {
    const install = u.failed === "install";
    line = install ? (
      <Line sql={<InstallSql version={u.target ?? "…"} />} status={<span className="status fail">rolled back</span>} />
    ) : (
      <Line sql={<CheckSql current={current} />} status={<span className="status fail">error</span>} />
    );
    body = (
      <>
        <p className="upd-err">{st.message}</p>
        <div className="about-upd-row">
          <button type="button" className="upd-link" onClick={() => void openUrl(`${RELEASES_URL}/latest`)}>
            Download from GitHub
            <ExternalLink {...ico} />
          </button>
          <button type="button" className="btn" onClick={() => void (install ? u.install() : u.check())}>
            Try again
          </button>
        </div>
      </>
    );
  } else if (st.kind === "current") {
    line = <Line sql={<CheckSql current={current} />} status={<span className="status redir">0 rows</span>} />;
    body = (
      <div className="about-upd-row">
        <p className="about-upd-text">
          You're on the latest. Back to soaking.
          {u.checkedAt && <span className="sub">Checked {ago(u.checkedAt)}</span>}
        </p>
        {checkAgain}
      </div>
    );
  } else {
    // checking, or idle for the moment before the first check starts
    line = <Line sql={<CheckSql current={current} />} status={<Wait label="running" />} />;
    body = (
      <div className="about-upd-row">
        <p className="about-upd-text">
          Asking GitHub what's new…<span className="sub">github.com/jimmyfish/ypacapy</span>
        </p>
        {checkAgain}
      </div>
    );
  }

  return (
    <div className="about-res about-upd" aria-label="Updates" aria-live="polite">
      {line}
      <div className="about-upd-body">{body}</div>
    </div>
  );
}

/** Release notes: the first few changes, the rest behind "Show all n changes" in a list that scrolls. */
function Notes({ notes }: { notes?: string }) {
  const lines = noteLines(notes);
  const [open, setOpen] = useState(false);
  if (!lines.length) return null;
  const more = lines.length > NOTES_SHOWN;
  return (
    <div className="about-notes" data-open={open || undefined}>
      <ul className="upd-notes">
        {(open ? lines : lines.slice(0, NOTES_SHOWN)).map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      {more && (
        <button type="button" className="upd-link about-notes-more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Show less" : `Show all ${lines.length} changes`}
          <ChevronDown {...ico} />
        </button>
      )}
    </div>
  );
}
