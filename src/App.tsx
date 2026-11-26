import { Navigation, type Page } from "./components/Navigation";
import { AccountsOverview } from "./components/AccountsOverview";
import { Diagnostics } from "./components/Preferences";
import { SettingsPage } from "./components/SettingsPage";
import { applyCustomization, workspaceAccounts } from "./workspaces";
import { AccountForm, Modal, Palette } from "./components/AccountDialogs";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { api, type Account, type Snapshot } from "./api";
import { textOnAccent } from "./appearance";
import { Search, RefreshCw, X } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { moveTab, stepZoom } from "./tabs";

export function App() {
  const [data, setData] = useState<Snapshot>();
  const [error, setError] = useState("");
  const [page, setPage] = useState<Page>("accounts");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Account>();
  const [removing, setRemoving] = useState<Account>();
  const [palette, setPalette] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const snapshotRequest = useRef(0);
  const operationPending = useRef(false);
  const initialized = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++snapshotRequest.current;
    const next = await api.snapshot();
    if (request === snapshotRequest.current) setData(next);
  }, []);
  const openAccount = useCallback(async (id: string) => {
    await api.open(id);
    setPage("accounts");
  }, []);
  const navigate = (next: Page) => {
    void run(async () => {
      await api.home();
      setPage(next);
    });
  };
  const run = useCallback(
    async (operation: () => Promise<void>) => {
      if (operationPending.current) return;
      operationPending.current = true;
      setBusy(true);
      setError("");
      try {
        await operation();
        await refresh();
      } catch (e) {
        setError(String(e));
      } finally {
        operationPending.current = false;
        setBusy(false);
      }
    },
    [refresh],
  );
  const showMenu = (id: string) => {
    if (operationPending.current) return;
    void api.accountMenu(id).catch((e) => setError(String(e)));
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    operationPending.current = true;
    setBusy(true);
    void (async () => {
      try {
        await api.restore();
      } catch (e) {
        setError(String(e));
      }
      try {
        await refresh();
      } catch (e) {
        setError(String(e));
      }
      operationPending.current = false;
      setBusy(false);
    })();
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
    document.documentElement.dataset.layout = data.settings.horizontalTabs
      ? "tabs"
      : "sidebar";
    applyCustomization(data.settings);
  }, [data]);
  const onAccountAction = useEffectEvent(
    (payload: { id: string; action: string }) => {
      const account = data?.settings.accounts.find((a) => a.id === payload.id);
      if (!account) return;
      const action = payload.action;
      if (action === "edit") {
        setEditing(account);
        return;
      }
      if (action === "remove") {
        setRemoving(account);
        return;
      }
      void run(async () => {
        if (action === "reload") await api.reload(account.id);
        else if (action === "close") await api.close(account.id);
        else if (action.startsWith("color-"))
          await api.color(
            account.id,
            action === "color-none" ? null : action.slice(6),
          );
        else if (action.startsWith("zoom-"))
          await api.edit(
            account.id,
            account.name,
            action === "zoom-reset"
              ? 1
              : stepZoom(account.zoom, action === "zoom-in" ? 1 : -1),
          );
        else if (action === "up" || action === "down") {
          const ids = data!.settings.accounts.map((a) => a.id);
          const target =
            ids[ids.indexOf(account.id) + (action === "up" ? -1 : 1)];
          if (target) await api.reorder(moveTab(ids, account.id, target));
        }
      });
    },
  );
  useEffect(() => {
    let disposed = false;
    const unlisten = listen<{ id: string; action: string }>(
      "account-action",
      ({ payload }) => {
        if (!disposed) onAccountAction(payload);
      },
      { target: { kind: "Webview", label: "main" } },
    );
    void unlisten.catch((e) => {
      if (!disposed) setError(String(e));
    });
    return () => {
      disposed = true;
      void unlisten.then((stop) => stop()).catch(() => {});
    };
  }, []);
  const onShellAction = useEffectEvent((action: string) => {
    if (action === "quick-switch") {
      setAdding(false);
      setEditing(undefined);
      setRemoving(undefined);
      setPalette(true);
      return;
    }
    if (action === "settings") {
      setPalette(false);
      setAdding(false);
      setEditing(undefined);
      setRemoving(undefined);
      navigate("appearance");
      return;
    }
    if (!data || adding || editing || removing || palette) return;
    const visible = workspaceAccounts(data.settings);
    let id: string | undefined;
    if (action.startsWith("open:")) id = visible[Number(action.slice(5))]?.id;
    if (action === "next" || action === "previous") {
      const index = visible.findIndex((a) => a.id === data.activeAccount);
      id =
        visible[
          index < 0
            ? action === "next"
              ? 0
              : visible.length - 1
            : (index + (action === "next" ? 1 : -1) + visible.length) %
              visible.length
        ]?.id;
    }
    if (id) {
      void run(() => openAccount(id));
      return;
    }
    if (data.activeAccount && action === "reload")
      void run(() => api.reload(data.activeAccount!));
    if (data.activeAccount && action === "close")
      void run(() => api.close(data.activeAccount!));
  });
  useEffect(() => {
    let disposed = false;
    const subscriptions = [
      listen<string>(
        "shell-action",
        ({ payload }) => {
          if (!disposed) onShellAction(payload);
        },
        { target: { kind: "Webview", label: "main" } },
      ),
      listen(
        "workspace-updated",
        () => {
          if (!disposed) void refresh().catch((e) => setError(String(e)));
        },
        { target: { kind: "Webview", label: "main" } },
      ),
    ];
    for (const sub of subscriptions)
      void sub.catch((e) => {
        if (!disposed) setError(String(e));
      });
    return () => {
      disposed = true;
      for (const sub of subscriptions)
        void sub.then((stop) => stop()).catch(() => {});
    };
  }, [refresh]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setAdding(false);
        setEditing(undefined);
        setRemoving(undefined);
        setPalette(true);
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
  const active = accounts.find((account) => account.id === data?.activeAccount);
  const overlayOpen = adding || !!editing || !!removing || palette;
  const activeLoad = active ? data?.viewStates[active.id] : undefined;
  const blocked = activeLoad?.state === "blocked";
  useEffect(() => {
    setSlowLoad(false);
    if (activeLoad?.state !== "loading") return;
    const timer = window.setTimeout(() => setSlowLoad(true), 20000);
    return () => window.clearTimeout(timer);
  }, [active?.id, activeLoad?.state]);
  useEffect(() => {
    if (!data) return;
    void api
      .contentVisible(!overlayOpen && !error && !blocked)
      .catch((e) => setError(String(e)));
  }, [overlayOpen, error, data?.activeAccount, blocked]);
  return (
    <div className="app-shell">
      <Navigation
        data={data}
        busy={busy}
        page={page}
        setPage={navigate}
        openAccount={openAccount}
        setAdding={setAdding}
        run={run}
        showMenu={showMenu}
        reorder={(ids) => void run(() => api.reorder(ids))}
      />
      <main>
        <header>
          <span className="app-title">SyntraChat</span>
          {data && (
            <select
              className="workspace-switch"
              aria-label="Current workspace"
              disabled={busy}
              value={data.settings.activeWorkspace ?? ""}
              onChange={(e) =>
                void run(async () => {
                  await api.workspace(e.target.value || null);
                  setPage("accounts");
                })
              }
            >
              <option value="">All accounts</option>
              {data.settings.workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          )}
          <span className="page-name">
            {active
              ? active.name
              : page === "accounts"
                ? "Accounts"
                : page === "appearance"
                  ? "Appearance"
                  : "Diagnostics"}
          </span>
          {active && (
            <div className="active-actions">
              {activeLoad && (
                <span className="load-state" role="status">
                  {activeLoad.state === "loading"
                    ? slowLoad
                      ? "Still loading…"
                      : "Loading…"
                    : activeLoad.state === "blocked"
                      ? "Redirect blocked"
                      : "Page loaded"}
                </span>
              )}
              <button
                aria-label="Active account options"
                title="Account options"
                disabled={busy}
                onClick={() => showMenu(active.id)}
              >
                {Math.round(active.zoom * 100)}%
              </button>
              <button
                aria-label="Reload active account"
                title="Reload"
                disabled={busy}
                onClick={() => void run(() => api.reload(active.id))}
              >
                <RefreshCw size={15} />
              </button>
              <button
                aria-label="Close active account"
                title="Close account tab"
                disabled={busy}
                onClick={() => void run(() => api.close(active.id))}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <button
            className="quick-switch"
            aria-label="Quick switch"
            title="Quick switch (Ctrl+K)"
            onClick={() => setPalette(true)}
          >
            <Search size={15} />
            <kbd>Ctrl K</kbd>
          </button>
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
          {active && blocked && (
            <section className="connection-state" role="status">
              <h1>Sign-in redirect blocked</h1>
              <p>{activeLoad?.message}</p>
              <button
                disabled={busy}
                onClick={() => void run(() => api.reload(active.id))}
              >
                Reload account
              </button>
              <button disabled={busy} onClick={() => navigate("accounts")}>
                Back to accounts
              </button>
            </section>
          )}
          {page === "accounts" && !active && (
            <AccountsOverview
              data={data}
              busy={busy}
              setAdding={setAdding}
              showMenu={showMenu}
              run={run}
              openAccount={openAccount}
            />
          )}
          {page === "appearance" && data && (
            <SettingsPage data={data} busy={busy} run={run} />
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
            onSave={(service, name, url, zoom, details) =>
              void run(async () => {
                if (editing) await api.edit(editing.id, name, zoom, details);
                else await api.add(service, name, url, details);
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
            close its tab?
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
              void run(() => openAccount(a.id));
            }}
            appearance={() => {
              setPalette(false);
              navigate("appearance");
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
