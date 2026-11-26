import { useState } from "react";
import { ArrowRight, MoreHorizontal, Plus, Search } from "lucide-react";
import { AccountIcon } from "./AccountIcon";
import { workspaceAccounts } from "../workspaces";
import { type Snapshot } from "../api";

type Props = {
  data?: Snapshot;
  busy: boolean;
  setAdding: (v: boolean) => void;
  showMenu: (id: string) => void;
  run: (operation: () => Promise<void>) => Promise<void>;
  openAccount: (id: string) => Promise<void>;
};
export function AccountsOverview({
  data,
  busy,
  setAdding,
  showMenu,
  run,
  openAccount,
}: Props) {
  const [query, setQuery] = useState("");
  const accounts = data ? workspaceAccounts(data.settings) : [];
  const filtered = accounts.filter((a) =>
    `${a.name} ${a.serviceId} ${a.details.folder}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  filtered.sort((a, b) => a.details.folder.localeCompare(b.details.folder));
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
          disabled={!data || busy}
        >
          <Plus size={15} /> Add account
        </button>
      </div>
      <div className="account-list">
        {filtered.map((account, index) => {
          const open = data?.openAccounts.includes(account.id);
          return (
            <div key={account.id}>
              {account.details.folder &&
                (index === 0 ||
                  filtered[index - 1]?.details.folder !==
                    account.details.folder) && (
                  <div className="folder-label">{account.details.folder}</div>
                )}
              <article className="account-row">
                <span
                  className="account-icon"
                  aria-hidden="true"
                  style={account.color ? { color: account.color } : undefined}
                >
                  <AccountIcon account={account} />
                </span>
                <div className="account-label">
                  <h2>
                    {account.details.pinned && (
                      <span title="Pinned" aria-hidden="true">
                        ◆{" "}
                      </span>
                    )}
                    {account.name}
                  </h2>
                  <small>
                    {account.serviceId === "custom"
                      ? new URL(account.url).hostname
                      : data?.services.find(
                          (service) => service.id === account.serviceId,
                        )?.name}
                    {open ? " · Loaded" : ""}
                  </small>
                </div>
                <button
                  className="open-account"
                  disabled={busy}
                  onClick={() => void run(() => openAccount(account.id))}
                >
                  Open account <ArrowRight size={14} />
                </button>
                <button
                  className="account-options"
                  aria-label={`Options for ${account.name}`}
                  title="Account options"
                  disabled={busy}
                  onClick={() => showMenu(account.id)}
                >
                  <MoreHorizontal size={18} />
                </button>
              </article>
            </div>
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
        Preview: calls and downloads are not available yet.
      </p>
    </>
  );
}
