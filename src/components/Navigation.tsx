import { Info, Layers, Plus, Settings2 } from "lucide-react";
import { type Snapshot } from "../api";
export type Page = "accounts" | "appearance" | "diagnostics";

type Props = {
  data?: Snapshot;
  busy: boolean;
  page: Page;
  setPage: (p: Page) => void;
  setAdding: (v: boolean) => void;
  run: (operation: () => Promise<void>) => Promise<void>;
  openAccount: (id: string) => Promise<void>;
};
export function Navigation({
  data,
  busy,
  page,
  setPage,
  setAdding,
  run,
  openAccount,
}: Props) {
  return (
    <aside className="rail" aria-label="Primary navigation">
      <button
        className={
          page === "accounts" && !data?.activeAccount ? "selected" : ""
        }
        aria-label="Accounts"
        title="Accounts"
        onClick={() => setPage("accounts")}
      >
        <Layers size={19} />
      </button>
      <nav className="rail-accounts" aria-label="Saved accounts">
        {data?.settings.accounts.map((account) => (
          <button
            key={account.id}
            className={`service-tab ${data.activeAccount === account.id ? "selected" : ""}`}
            aria-pressed={data.activeAccount === account.id}
            title={account.name}
            aria-label={`Open ${account.name}`}
            disabled={busy}
            onClick={() => void run(() => openAccount(account.id))}
          >
            {account.name.slice(0, 1).toUpperCase()}
            {data.openAccounts.includes(account.id) && (
              <span className="status-dot" title="Loaded" />
            )}
          </button>
        ))}
      </nav>
      <button
        aria-label="Add account"
        title="Add account"
        onClick={() => setAdding(true)}
        disabled={!data}
      >
        <Plus size={20} />
      </button>
      <div className="rail-bottom">
        <button
          className={page === "appearance" ? "selected" : ""}
          aria-label="Appearance settings"
          title="Settings"
          onClick={() => setPage("appearance")}
        >
          <Settings2 size={19} />
        </button>
        <button
          className={page === "diagnostics" ? "selected" : ""}
          aria-label="Diagnostics and about"
          title="About"
          onClick={() => setPage("diagnostics")}
        >
          <Info size={18} />
        </button>
      </div>
    </aside>
  );
}
