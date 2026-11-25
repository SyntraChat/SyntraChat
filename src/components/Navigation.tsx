import { useRef } from "react";
import { Info, Layers, Plus, Settings2 } from "lucide-react";
import { type Snapshot } from "../api";
import { ServiceIcon } from "./ServiceIcon";
import { moveTab } from "../tabs";
export type Page = "accounts" | "appearance" | "diagnostics";

type Props = {
  data?: Snapshot;
  busy: boolean;
  page: Page;
  setPage: (p: Page) => void;
  setAdding: (v: boolean) => void;
  run: (operation: () => Promise<void>) => Promise<void>;
  openAccount: (id: string) => Promise<void>;
  showMenu: (id: string) => void;
  reorder: (ids: string[]) => void;
};
export function Navigation({
  data,
  busy,
  page,
  setPage,
  setAdding,
  run,
  openAccount,
  showMenu,
  reorder,
}: Props) {
  const drag = useRef<{
    id: string;
    pointer: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
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
            data-account-id={account.id}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              drag.current = {
                id: account.id,
                pointer: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                moved: false,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const current = drag.current;
              if (
                current?.pointer === event.pointerId &&
                Math.hypot(
                  event.clientX - current.x,
                  event.clientY - current.y,
                ) > 6
              ) {
                current.moved = true;
                event.currentTarget.dataset.dragging = "true";
              }
            }}
            onPointerUp={(event) => {
              const current = drag.current;
              delete event.currentTarget.dataset.dragging;
              if (current?.pointer !== event.pointerId) return;
              if (current.moved) {
                const target = document
                  .elementFromPoint(event.clientX, event.clientY)
                  ?.closest<HTMLElement>("[data-account-id]")
                  ?.dataset.accountId;
                const ids = data.settings.accounts.map((a) => a.id);
                const next = moveTab(ids, current.id, target ?? "");
                if (next !== ids) reorder(next);
              }
              setTimeout(() => {
                if (drag.current === current) drag.current = null;
              }, 0);
            }}
            onPointerCancel={(event) => {
              drag.current = null;
              delete event.currentTarget.dataset.dragging;
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              showMenu(account.id);
            }}
            onKeyDown={(event) => {
              if (
                event.key === "ContextMenu" ||
                (event.shiftKey && event.key === "F10")
              ) {
                event.preventDefault();
                showMenu(account.id);
              }
            }}
            style={
              account.color
                ? { boxShadow: `inset 0 -3px ${account.color}` }
                : undefined
            }
            onClick={() => {
              if (!drag.current?.moved) void run(() => openAccount(account.id));
            }}
          >
            <ServiceIcon serviceId={account.serviceId} />
            <span className="tab-label">{account.name}</span>
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
