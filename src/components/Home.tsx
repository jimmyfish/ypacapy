import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "../store";
import { api, errText } from "../lib/api";
import { ENGINE_LABEL } from "../lib/sql";
import { when } from "../lib/time";
import type { Conn } from "../types";
import { ConnTile } from "./ConnTile";
import { FolderOpen, Pencil, Plus, X, ico } from "./Icon";

/** host or folder (gives way with an ellipsis) and the tail that always shows: port and database, or the file name */
function address(c: Conn): [string, string] {
  if (c.engine === "sqlite") {
    const f = c.file ?? "";
    const i = f.lastIndexOf("/");
    return i < 0 ? ["", f] : [f.slice(0, i + 1), f.slice(i + 1)];
  }
  const port = c.port ?? (c.engine === "mysql" ? 3306 : 5432);
  return [c.host || "localhost", `:${port}${c.database ? ` / ${c.database}` : ""}`];
}

/** Home: every connection on this Mac, and how to reach each one. */
export function Home() {
  const conns = useStore((s) => s.conns);
  const st = useStore.getState();
  const sorted = [...conns].sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0));

  /** Open SQLite file: a connection named after the file, opened in place, right away. */
  const openFile = async () => {
    const file = await open({ multiple: false, directory: false, title: "Open SQLite file" }).catch(() => null);
    if (typeof file !== "string") return;
    const name = file.split("/").pop() || "database";
    try {
      const color = (conns.length % 6) + 1;
      const c = await api.saveConnection({ id: "", name, engine: "sqlite", file, color, guard: "confirm" }, null);
      await st.refreshConns();
      await st.openConn(c.id);
    } catch (e) {
      st.showToast(errText(e));
    }
  };

  const remove = (c: Conn) =>
    st.openModal({
      kind: "confirm",
      title: `Remove ${c.name}?`,
      message: c.engine === "sqlite" ? "The connection goes from ypacapy. The database file stays where it is." : "The connection and its keychain password go from this Mac. The database is not touched.",
      confirmLabel: "Remove",
      onConfirm: () => void st.deleteConn(c.id),
    });

  return (
    <div className="home">
      <div className="home-inner">
        <div className="home-head">
          <div>
            <h1>Connections</h1>
            <p className="muted">Everything stays on this Mac, in ~/.config/ypacapy.</p>
          </div>
          <div className="home-actions">
            <button type="button" className="btn" onClick={openFile}>
              <FolderOpen {...ico} />
              Open SQLite file
            </button>
            <button type="button" className="btn btn--primary" onClick={() => st.openModal({ kind: "connect" })}>
              <Plus {...ico} />
              New connection
            </button>
          </div>
        </div>
        <section>
          <h2>On this Mac</h2>
          <div className="projects">
            {sorted.map((c) => {
              const [head, tail] = address(c);
              return (
                <div key={c.id} className="project-card conn-card">
                  <button type="button" className="project-open" aria-label={`Open ${c.name}, ${head}${tail}`} title={`${head}${tail}`} onClick={() => st.openConn(c.id)} />
                  <ConnTile conn={c} />
                  <span className="conn-id">
                    <span className="proj-name">{c.name}</span>
                    <span className="proj-cols">
                      <span className={`e e-${c.engine}`}>{ENGINE_LABEL[c.engine]}</span>
                      <span className="addr">
                        <span className="addr-head">{head}</span>
                        <span className="addr-tail">{tail}</span>
                      </span>
                    </span>
                  </span>
                  <span className="proj-when">{c.lastOpened ? `Opened ${when(c.lastOpened)}` : "Not opened yet"}</span>
                  <span className="card-actions">
                    <button type="button" className="icon-btn" title="Edit connection" aria-label={`Edit ${c.name}`} onClick={() => st.openModal({ kind: "connect", conn: c })}>
                      <Pencil {...ico} />
                    </button>
                    <button type="button" className="icon-btn" title="Remove connection" aria-label={`Remove ${c.name}`} onClick={() => remove(c)}>
                      <X {...ico} />
                    </button>
                  </span>
                </div>
              );
            })}
            <button type="button" className="project-card project-card--new conn-card" onClick={() => st.openModal({ kind: "connect" })}>
              <Plus {...ico} />
              New connection
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
