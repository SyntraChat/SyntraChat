import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowUpRight,
  Command,
  Plus,
  Search,
  Settings2,
  X,
} from "lucide-react";
import type { Account, AccountDetails, Snapshot } from "../api";
import { accountImage } from "../workspaces";
import { zoomSteps } from "../tabs";

export function AccountForm({
  data,
  account,
  busy,
  onSave,
}: {
  data?: Snapshot;
  account?: Account;
  busy: boolean;
  onSave: (
    service: string,
    name: string,
    url: string,
    zoom: number,
    details: AccountDetails,
  ) => void;
}) {
  const [service, setService] = useState(account?.serviceId ?? "discord");
  const [details, setDetails] = useState<AccountDetails>(
    account?.details ?? {
      workspaceId: data?.settings.activeWorkspace ?? null,
      folder: "",
      pinned: false,
      image: null,
    },
  );
  const [imageError, setImageError] = useState("");
  const [converting, setConverting] = useState(false);
  return (
    <form
      className="account-form"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        onSave(
          service,
          String(form.get("name")),
          String(form.get("url") ?? ""),
          Number(form.get("zoom") ?? 1),
          details,
        );
      }}
    >
      {!account && (
        <label>
          Service
          <select value={service} onChange={(e) => setService(e.target.value)}>
            {data?.services.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
            <option value="custom">Custom HTTPS website</option>
          </select>
        </label>
      )}
      <label>
        Account label
        <input
          name="name"
          defaultValue={account?.name}
          placeholder="e.g. Discord · Personal"
          required
          maxLength={80}
        />
      </label>
      {(service === "custom" ||
        data?.services.find((s) => s.id === service)?.requiresUrl) &&
        !account && (
          <label>
            Website URL
            <input
              name="url"
              type="url"
              placeholder="https://example.com"
              required
              pattern="https://.*"
              defaultValue={
                data?.services.find((s) => s.id === service)?.url ?? ""
              }
              key={service}
            />
          </label>
        )}
      <div className="preference-grid">
        <label>
          Workspace
          <select
            value={details.workspaceId ?? ""}
            onChange={(e) =>
              setDetails({ ...details, workspaceId: e.target.value || null })
            }
          >
            <option value="">Unassigned</option>
            {data?.settings.workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Folder
          <input
            value={details.folder}
            maxLength={80}
            placeholder="e.g. Friends"
            onChange={(e) => setDetails({ ...details, folder: e.target.value })}
          />
        </label>
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={details.pinned}
          onChange={(e) => setDetails({ ...details, pinned: e.target.checked })}
        />
        Pin this account
      </label>
      <div className="account-image-editor">
        {details.image && <img src={details.image} alt="Account preview" />}
        <label>
          Account image
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={converting}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setConverting(true);
              setImageError("");
              void accountImage(file)
                .then((image) =>
                  setDetails((current) => ({ ...current, image })),
                )
                .catch((e) => setImageError(String(e)))
                .finally(() => setConverting(false));
            }}
          />
        </label>
        {details.image && (
          <button
            type="button"
            onClick={() => setDetails({ ...details, image: null })}
          >
            Use service icon
          </button>
        )}
      </div>
      {imageError && <p role="alert">{imageError}</p>}
      {account && (
        <label>
          Zoom
          <select name="zoom" defaultValue={account.zoom}>
            {[...new Set([...zoomSteps, account.zoom])]
              .sort((a, b) => a - b)
              .map((z) => (
                <option value={z} key={z}>
                  {Math.round(z * 100)}%
                </option>
              ))}
          </select>
        </label>
      )}
      <p className="form-note">
        Each account gets a separate persistent browser profile. Only
        same-origin navigation is allowed. Sign-in redirects may be blocked.
        Media and downloads are disabled in this preview.
      </p>
      <button
        className="primary"
        disabled={busy || !data || converting}
        type="submit"
      >
        {account ? "Save account" : "Create account"}
      </button>
    </form>
  );
}

export function Modal({
  title,
  onClose,
  children,
  error,
}: {
  error?: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-title">
        <h2 id={titleId}>{title}</h2>
        <button onClick={onClose} aria-label="Close dialog">
          <X size={19} />
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {children}
    </dialog>
  );
}

export function Palette({
  accounts,
  busy,
  choose,
  appearance,
  add,
}: {
  accounts: Account[];
  busy: boolean;
  choose: (a: Account) => void;
  appearance: () => void;
  add: () => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <div className="palette">
      <label>
        <Search size={18} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts and actions…"
          aria-label="Search commands"
        />
      </label>
      {accounts
        .filter((a) =>
          `${a.name} ${a.serviceId}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((a) => (
          <button key={a.id} disabled={busy} onClick={() => choose(a)}>
            {a.name}
            <ArrowUpRight size={16} />
          </button>
        ))}
      {"appearance settings".includes(query.toLowerCase()) && (
        <button onClick={appearance}>
          <Settings2 size={16} /> Appearance settings
        </button>
      )}
      {"add account".includes(query.toLowerCase()) && (
        <button onClick={add}>
          <Plus size={16} /> Add account
        </button>
      )}
      <small>
        <Command size={12} /> Ctrl+K to open · Escape to close
      </small>
    </div>
  );
}
