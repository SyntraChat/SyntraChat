import { useState } from "react";
import { ArrowUpRight, MoreHorizontal, Plus, Search } from "lucide-react";
import { api, type Account, type Snapshot } from "../api";

type Props = {
  data?: Snapshot;
  busy: boolean;
  setAdding: (v: boolean) => void;
  setEditing: (a: Account) => void;
  setRemoving: (a: Account) => void;
  run: (operation: () => Promise<void>) => Promise<void>;
};
export function AccountsOverview({
  data,
  busy,
  setAdding,
  setEditing,
  setRemoving,
  run,
}: Props) {
  const [query, setQuery] = useState("");
  const accounts = data?.settings.accounts ?? [];
  const filtered = accounts.filter((a) =>
    `${a.name} ${a.serviceId}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="account-toolbar">
        <label className="filter">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find an account"
            aria-label="Find an account"
          />
        </label>
        <button
          className="primary"
          onClick={() => setAdding(true)}
          disabled={!data}
        >
          <Plus size={15} /> Add account
        </button>
      </div>
      <div className="account-list">
        {filtered.map((account) => {
          const open = data?.openAccounts.includes(account.id);
          return (
            <article className="account-row" key={account.id}>
              <span className="account-icon" aria-hidden="true">
                {account.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="account-label">
                <h2>{account.name}</h2>
                <small>
                  {account.serviceId === "custom"
                    ? new URL(account.url).hostname
                    : data?.services.find(
                        (service) => service.id === account.serviceId,
                      )?.name}
                  {open ? " · Window open" : ""}
                </small>
              </div>
              <button
                className="open-account"
                disabled={busy}
                onClick={() => void run(() => api.open(account.id))}
              >
                Open account <ArrowUpRight size={14} />
              </button>
              <details className="account-options">
                <summary
                  aria-label={`Options for ${account.name}`}
                  title="Account options"
                >
                  <MoreHorizontal size={18} />
                </summary>
                <div className="account-menu">
                  <button disabled={busy} onClick={() => setEditing(account)}>
                    Edit
                  </button>
                  {open && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => void run(() => api.reload(account.id))}
                      >
                        Reload
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void run(() => api.close(account.id))}
                      >
                        Close window
                      </button>
                    </>
                  )}
                  <button disabled={busy} onClick={() => setRemoving(account)}>
                    Remove
                  </button>
                </div>
              </details>
            </article>
          );
        })}
      </div>
      {!accounts.length && (
        <div className="empty-state">
          <h1>Add your first account</h1>
          <p>Choose a service using the + button.</p>
        </div>
      )}
      {query && !filtered.length && (
        <p role="status">No accounts match “{query}”.</p>
      )}
      <p className="preview-note">
        Preview: accounts open in separate windows. Embedded tabs, calls and
        downloads are not available yet.
      </p>
    </>
  );
}
