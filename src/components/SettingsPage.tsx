import { useState } from "react";
import { api, type Customization, type Desktop, type Snapshot } from "../api";
import { Appearance } from "./Preferences";

type Props = {
  data: Snapshot;
  busy: boolean;
  run: (operation: () => Promise<void>) => Promise<void>;
};
const defaults: Customization = {
  font: "system",
  fontSize: 13,
  radius: 5,
  comfortable: false,
  colors: false,
  background: "#141419",
  panel: "#1a1a21",
  text: "#eeeef3",
  muted: "#a1a1b1",
};

function ThemeEditor({ data, busy, run }: Props) {
  const [draft, setDraft] = useState(data.settings.customization);
  return (
    <section className="settings-panel">
      <h2>Theme editor</h2>
      <form
        className="preferences-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => api.customize(draft));
        }}
      >
        <div className="preference-grid">
          <label>
            App font
            <select
              value={draft.font}
              onChange={(e) => setDraft({ ...draft, font: e.target.value })}
            >
              <option value="system">System</option>
              <option value="sans">Sans serif</option>
              <option value="mono">Monospace</option>
            </select>
          </label>
          <label>
            Text size
            <select
              value={draft.fontSize}
              onChange={(e) =>
                setDraft({ ...draft, fontSize: Number(e.target.value) })
              }
            >
              {[11, 12, 13, 14, 15, 16, 17, 18].map((n) => (
                <option key={n} value={n}>
                  {n} px
                </option>
              ))}
            </select>
          </label>
          <label>
            Corner radius
            <input
              type="range"
              min="0"
              max="16"
              value={draft.radius}
              onChange={(e) =>
                setDraft({ ...draft, radius: Number(e.target.value) })
              }
            />
            <output>{draft.radius} px</output>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.comfortable}
              onChange={(e) =>
                setDraft({ ...draft, comfortable: e.target.checked })
              }
            />
            Comfortable account spacing
          </label>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={draft.colors}
            onChange={(e) => setDraft({ ...draft, colors: e.target.checked })}
          />
          Use custom colors
        </label>
        {draft.colors && (
          <div className="theme-colors">
            {(
              [
                ["background", "Background"],
                ["panel", "Panels"],
                ["text", "Text"],
                ["muted", "Secondary text"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="color"
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
        )}
        <div
          className="theme-preview"
          style={{
            background: draft.colors ? draft.background : undefined,
            color: draft.colors ? draft.text : undefined,
            borderRadius: draft.radius,
            fontSize: draft.fontSize,
          }}
        >
          <strong>SyntraChat</strong>
          <span style={{ color: draft.colors ? draft.muted : undefined }}>
            Your workspace, your style.
          </span>
        </div>
        <div className="button-row">
          <button className="primary" disabled={busy}>
            Save customization
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setDraft(defaults);
              void run(() => api.customize(defaults));
            }}
          >
            Reset customization
          </button>
        </div>
      </form>
      <div className="button-row theme-transfer">
        <button disabled={busy} onClick={() => void run(api.exportTheme)}>
          Export theme…
        </button>
        <label className="file-button">
          Import theme
          <input
            aria-label="Import theme"
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file)
                void run(async () => {
                  if (file.size > 8192)
                    throw new Error("Theme files must be smaller than 8 KB.");
                  const pack = JSON.parse(await file.text()) as {
                    format?: string;
                    version?: number;
                    theme?: string;
                    accent?: string;
                    customization?: Customization;
                  };
                  if (
                    !pack ||
                    pack.format !== "syntrachat-theme" ||
                    pack.version !== 1 ||
                    typeof pack.theme !== "string" ||
                    typeof pack.accent !== "string" ||
                    !pack.customization
                  )
                    throw new Error("This is not a SyntraChat theme pack.");
                  await api.customize(
                    pack.customization,
                    pack.theme,
                    pack.accent,
                  );
                });
            }}
          />
        </label>
      </div>
    </section>
  );
}

function DesktopSettings({ data, busy, run }: Props) {
  const [draft, setDraft] = useState(data.settings.desktop);
  const choices: [keyof Desktop, string][] = [
    ["closeToTray", "Keep running in the tray when I close the window"],
    ["launchAtLogin", "Launch SyntraChat when I sign in"],
    ["startHidden", "Start hidden in the tray"],
    ["restoreSession", "Restore my open accounts on startup"],
    ["globalShortcut", "Enable a global show/hide shortcut"],
  ];
  return (
    <>
      <h1>Desktop</h1>
      <section className="settings-panel">
        <form
          className="preferences-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => api.desktop(draft));
          }}
        >
          {choices.map(([key, label]) => (
            <label className="check-label" key={key}>
              <input
                type="checkbox"
                checked={Boolean(draft[key])}
                disabled={
                  busy ||
                  (!data.trayAvailable &&
                    (key === "closeToTray" || key === "startHidden"))
                }
                onChange={(e) =>
                  setDraft({ ...draft, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          ))}
          <label>
            Global show/hide shortcut
            <input
              value={draft.toggleShortcut}
              maxLength={80}
              onChange={(e) =>
                setDraft({ ...draft, toggleShortcut: e.target.value })
              }
              placeholder="CommandOrControl+Shift+Space"
            />
          </label>
          <p className="form-note">
            Global shortcuts can be reserved by another app or unsupported by
            the desktop session. Startup registration changes only when you
            save.
          </p>
          {data.desktopError && <p role="status">{data.desktopError}</p>}
          <button className="primary" disabled={busy}>
            Save desktop preferences
          </button>
        </form>
      </section>
      <section className="settings-panel">
        <h2>App shortcuts</h2>
        <dl className="shortcut-list">
          <dt>Ctrl/Cmd + K</dt>
          <dd>Quick switch</dd>
          <dt>Ctrl/Cmd + 1–9</dt>
          <dd>Open an account in this workspace</dd>
          <dt>Ctrl + Tab / Shift + Tab</dt>
          <dd>Next / previous account</dd>
          <dt>Ctrl/Cmd + R / W</dt>
          <dd>Reload / close account</dd>
          <dt>Ctrl/Cmd + ,</dt>
          <dd>Settings</dd>
        </dl>
        <p className="form-note">
          These app shortcuts also work while a service has focus. Quit from the
          tray menu to exit completely.
        </p>
      </section>
    </>
  );
}

function Workspaces({ data, busy, run }: Props) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  return (
    <>
      <h1>Workspaces</h1>
      <p>
        Keep work, personal and gaming accounts together. Assign a workspace and
        folder in each account’s Edit dialog.
      </p>
      <section className="settings-panel">
        <form
          className="workspace-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await api.saveWorkspace(editing, name);
              setName("");
              setEditing(null);
            });
          }}
        >
          <label>
            Workspace name
            <input
              value={name}
              maxLength={80}
              required
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work"
            />
          </label>
          <button className="primary" disabled={busy}>
            {editing ? "Save workspace" : "Create workspace"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setName("");
              }}
            >
              Cancel
            </button>
          )}
        </form>
        {data.settings.workspaces.map((w) => (
          <div className="workspace-row" key={w.id}>
            <strong>{w.name}</strong>
            <small>
              {
                data.settings.accounts.filter(
                  (a) => a.details.workspaceId === w.id,
                ).length
              }{" "}
              accounts
            </small>
            <button
              disabled={busy}
              onClick={() => {
                setEditing(w.id);
                setName(w.name);
              }}
            >
              Rename
            </button>
            <button disabled={busy} onClick={() => setRemoving(w.id)}>
              Remove
            </button>
            {removing === w.id && (
              <div className="workspace-confirm">
                <p>
                  Remove this workspace? Its accounts stay saved in All
                  accounts.
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api.removeWorkspace(w.id);
                      setRemoving(null);
                    })
                  }
                >
                  Remove workspace, keep accounts
                </button>
                <button onClick={() => setRemoving(null)}>Cancel</button>
              </div>
            )}
          </div>
        ))}
      </section>
    </>
  );
}

export function SettingsPage(props: Props) {
  const [tab, setTab] = useState("appearance");
  return (
    <>
      <nav className="settings-tabs" aria-label="Settings categories">
        {["appearance", "workspaces", "desktop"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      {tab === "appearance" && (
        <>
          <Appearance {...props} />
          <ThemeEditor
            key={JSON.stringify(props.data.settings.customization)}
            {...props}
          />
        </>
      )}
      {tab === "workspaces" && <Workspaces {...props} />}
      {tab === "desktop" && (
        <DesktopSettings
          key={JSON.stringify(props.data.settings.desktop)}
          {...props}
        />
      )}
    </>
  );
}
