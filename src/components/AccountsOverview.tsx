import { useState } from "react";
import { ArrowUpRight, Plus, Search, ShieldCheck } from "lucide-react";
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
    (a.name + " " + a.serviceId).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="eyebrow">A LITTLE LESS SCATTERED.</div>
      <div className="page-title">
        <div>
          <h1>
            All your conversations.
            <br />
            <span>One place to begin.</span>
          </h1>
          <p>
            Separate accounts. A calmer workspace. Pick up where you left off.
          </p>
        </div>
        <button
          className="primary"
          onClick={() => setAdding(true)}
          disabled={!data}
        >
          <Plus size={17} /> Add account
        </button>
      </div>
      <div className="checkpoint">
        <ShieldCheck size={20} />
        <div>
          <strong>Native account windows · Foundation preview</strong>
          <p>
            Accounts open in separate OS WebViews with individual profiles.
            Messaging compatibility is experimental. Calls, downloads,
            notifications and embedded tabs are not available yet.
          </p>
        </div>
      </div>
      <div className="section-title">
        <h2>
          Your accounts{" "}
          <span>{accounts.length.toString().padStart(2, "0")}</span>
        </h2>
        <label className="filter">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an account"
            aria-label="Find an account"
          />
        </label>
      </div>
      <div className="cards">
        {filtered.map((a) => (
          <article className="account-card" key={a.id}>
            <div className="card-top">
              <span className="avatar">{a.name.slice(0, 1).toUpperCase()}</span>
              <span className="account-state">
                {data?.openAccounts.includes(a.id)
                  ? "WINDOW OPEN"
                  : "NOT LOADED"}
              </span>
            </div>
            <h3>{a.name}</h3>
            <p className="service-name">
              {a.serviceId === "custom"
                ? new URL(a.url).hostname
                : data?.services.find((s) => s.id === a.serviceId)?.name}
            </p>
            <div className="card-meta">
              <ShieldCheck size={13} /> Separate profile{" "}
              <span>{Math.round(a.zoom * 100)}%</span>
            </div>
            <button
              className="open-account"
              disabled={busy}
              onClick={() => void run(() => api.open(a.id))}
            >
              Open account <ArrowUpRight size={17} />
            </button>
            <div className="card-actions">
              <button disabled={busy} onClick={() => setEditing(a)}>
                Edit
              </button>
              {data?.openAccounts.includes(a.id) && (
                <>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => api.reload(a.id))}
                  >
                    Reload
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => api.close(a.id))}
                  >
                    Close window
                  </button>
                </>
              )}
              <button disabled={busy} onClick={() => setRemoving(a)}>
                Remove
              </button>
            </div>
          </article>
        ))}
        <button
          className="add-card"
          disabled={!data}
          onClick={() => setAdding(true)}
        >
          <span>
            <Plus size={23} />
          </span>
          <strong>Make room for another</strong>
          <small>Add a service or a custom website</small>
        </button>
      </div>
      {query && !filtered.length && (
        <p role="status">No accounts match “{query}”.</p>
      )}
      <footer>
        <ShieldCheck size={15} /> Login sessions stay in the operating system’s
        WebView storage.<span>Built with Rust + Tauri 2</span>
      </footer>
    </>
  );
}
