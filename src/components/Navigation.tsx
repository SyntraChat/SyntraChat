import {
  ArrowUpRight,
  Layers,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { api, type Snapshot } from "../api";
export type Page = "accounts" | "appearance" | "diagnostics";
type Props = {
  data?: Snapshot;
  busy: boolean;
  page: Page;
  setPage: (p: Page) => void;
  setAdding: (v: boolean) => void;
  setPalette: (v: boolean) => void;
  run: (operation: () => Promise<void>) => Promise<void>;
};
export function Navigation({
  data,
  busy,
  page,
  setPage,
  setAdding,
  setPalette,
  run,
}: Props) {
  const accounts = data?.settings.accounts ?? [];
  return (
    <>
      {" "}
      <aside className="rail" aria-label="Primary navigation">
        <div className="brand-mark" aria-label="SyntraChat">
          s<span>·</span>
        </div>
        <button
          className={page === "accounts" ? "selected" : ""}
          aria-label="Accounts"
          onClick={() => setPage("accounts")}
        >
          <Layers size={21} />
        </button>
        <button
          aria-label="Add account"
          onClick={() => setAdding(true)}
          disabled={!data}
        >
          <Plus size={21} />
        </button>
        <div className="rail-bottom">
          <button
            aria-label="Appearance settings"
            onClick={() => setPage("appearance")}
          >
            <Settings2 size={21} />
          </button>
        </div>
      </aside>
      <aside className="sidebar">
        <div className="wordmark">
          SyntraChat <span>PREVIEW</span>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <button className="workspace" onClick={() => setPage("accounts")}>
          <span className="workspace-icon">P</span>
          <span>
            Personal<small>{accounts.length} accounts</small>
          </span>
          <Layers size={16} />
        </button>
        <button className="search-shortcut" onClick={() => setPalette(true)}>
          <Search size={16} /> Quick switch <kbd>Ctrl K</kbd>
        </button>
        <div className="sidebar-heading">
          ACCOUNTS{" "}
          <button
            aria-label="Add another account"
            onClick={() => setAdding(true)}
            disabled={!data}
          >
            <Plus size={16} />
          </button>
        </div>
        <nav className="account-list" aria-label="Saved accounts">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() => void run(() => api.open(a.id))}
              disabled={busy}
            >
              <span className="mini-avatar">
                {a.name.slice(0, 1).toUpperCase()}
              </span>
              <span>
                {a.name}
                <small>{a.serviceId}</small>
              </span>
              {data?.openAccounts.includes(a.id) && (
                <span className="status-dot" title="Window open" />
              )}
            </button>
          ))}
        </nav>
        <div className="privacy-note">
          <ShieldCheck size={17} />
          <span>
            Your accounts. Your device.<small>No SyntraChat telemetry.</small>
          </span>
        </div>
        <button
          className="diagnostics-link"
          onClick={() => setPage("diagnostics")}
        >
          Diagnostics & about <ArrowUpRight size={14} />
        </button>
      </aside>
    </>
  );
}
