import { Navigation, type Page } from "./components/Navigation";
import { AccountsOverview } from "./components/AccountsOverview";
import { Appearance, Diagnostics } from "./components/Preferences";
import { AccountForm, Modal, Palette } from "./components/AccountDialogs";
import { useCallback, useEffect, useState } from "react";
import { api, type Account, type Snapshot } from "./api";
import { textOnAccent } from "./appearance";

export function App() {
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState("");
  const [page, setPage] = useState<Page>("accounts");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Account>();
  const [removing, setRemoving] = useState<Account>();
  const [palette, setPalette] = useState(false);
  const refresh = useCallback(async () => setData(await api.snapshot()), []);
  const run = useCallback(
    async (operation: () => Promise<void>) => {
      setBusy(true);
      setError("");
      try {
        await operation();
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  useEffect(() => {
    void refresh().catch((e) => setError(String(e)));
  }, [refresh]);
  useEffect(() => {
    const onFocus = () => {
      void refresh().catch((e) => setError(String(e)));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  useEffect(() => {
    if (!data) return;
    document.documentElement.dataset.theme = data.settings.theme;
    document.documentElement.style.setProperty(
      "--accent",
      data.settings.accent,
    );
    document.documentElement.style.setProperty(
      "--on-accent",
      textOnAccent(data.settings.accent),
    );
  }, [data]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((p) => !p);
      }
      if (event.key === "Escape") {
        setPalette(false);
        setAdding(false);
        setEditing(undefined);
        setRemoving(undefined);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const accounts = data?.settings.accounts ?? [];
  return (
    <div className="app-shell">
      <Navigation
        data={data}
        busy={busy}
        page={page}
        setPage={setPage}
        setAdding={setAdding}
        setPalette={setPalette}
        run={run}
      />
      <main>
        <header>
          <span>
            <span className="breadcrumb">Personal</span>
            <span className="slash">/</span>
            {page === "accounts"
              ? "Overview"
              : page === "appearance"
                ? "Appearance"
                : "Diagnostics"}
          </span>
          <span className="local-badge">
            <span className="status-dot" /> LOCAL WORKSPACE
          </span>
        </header>
        <div className="content">
          {error && (
            <div className="error" role="alert">
              <strong>Could not complete the action</strong>
              <p>{error}</p>
              <button onClick={() => void run(refresh)}>Retry</button>
            </div>
          )}
          {!data && !error && <p role="status">Loading your workspace…</p>}
          {page === "accounts" && (
            <AccountsOverview
              data={data}
              busy={busy}
              setAdding={setAdding}
              setEditing={setEditing}
              setRemoving={setRemoving}
              run={run}
            />
          )}
          {page === "appearance" && data && (
            <Appearance data={data} busy={busy} run={run} />
          )}
          {page === "diagnostics" && data && (
            <Diagnostics data={data} busy={busy} run={run} refresh={refresh} />
          )}
        </div>
      </main>
      {(adding || editing) && (
        <Modal
          error={error}
          title={editing ? "Edit account" : "Add an account"}
          onClose={() => {
            setAdding(false);
            setEditing(undefined);
          }}
        >
          <AccountForm
            data={data}
            account={editing}
            busy={busy}
            onSave={(service, name, url, zoom) =>
              void run(async () => {
                if (editing) await api.edit(editing.id, name, zoom);
                else await api.add(service, name, url);
                setAdding(false);
                setEditing(undefined);
              })
            }
          />
        </Modal>
      )}
      {removing && (
        <Modal
          error={error}
          title="Remove account?"
          onClose={() => setRemoving(undefined)}
        >
          <p>
            Remove <strong>{removing.name}</strong> from this workspace and
            close its window?
          </p>
          <p>
            The local login profile will be retained. Session deletion is not
            available in this preview.
          </p>
          <button
            className="danger"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await api.remove(removing.id);
                setRemoving(undefined);
              })
            }
          >
            Remove account, keep session
          </button>
        </Modal>
      )}
      {palette && (
        <Modal
          error={error}
          title="Quick switch"
          onClose={() => setPalette(false)}
        >
          <Palette
            accounts={accounts}
            busy={busy}
            choose={(a) => {
              setPalette(false);
              void run(() => api.open(a.id));
            }}
            appearance={() => {
              setPalette(false);
              setPage("appearance");
            }}
            add={() => {
              setPalette(false);
              setAdding(true);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
