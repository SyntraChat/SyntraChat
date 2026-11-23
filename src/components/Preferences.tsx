import { Check, RefreshCw } from "lucide-react";
import { api, type Snapshot } from "../api";
type Props = {
  data: Snapshot;
  busy: boolean;
  run: (operation: () => Promise<void>) => Promise<void>;
};
export function Appearance({ data, busy, run }: Props) {
  return (
    <>
      <h1>Appearance</h1>
      <section className="settings-panel">
        <h2>Color theme</h2>
        <div className="theme-options">
          {["dark", "light", "oled", "midnight", "system"].map((theme) => (
            <button
              key={theme}
              disabled={busy}
              aria-pressed={data.settings.theme === theme}
              onClick={() =>
                void run(() => api.appearance(theme, data.settings.accent))
              }
            >
              {theme}
              {data.settings.theme === theme && <Check size={16} />}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            void run(() =>
              api.appearance(data.settings.theme, String(form.get("accent"))),
            );
          }}
        >
          <label>
            Accent color
            <input
              name="accent"
              type="color"
              defaultValue={data.settings.accent}
              key={data.settings.accent}
            />
          </label>
          <button disabled={busy} type="submit">
            Save accent
          </button>
        </form>
      </section>
    </>
  );
}
export function Diagnostics({
  data,
  busy,
  run,
  refresh,
}: Props & { refresh: () => Promise<void> }) {
  const accounts = data.settings.accounts;
  return (
    <>
      <h1>Diagnostics</h1>
      <p>
        Measured state only. Memory and startup benchmarks have not been
        collected.
      </p>
      <dl className="diagnostics">
        <dt>Version</dt>
        <dd>{data.version} · foundation preview</dd>
        <dt>Operating system</dt>
        <dd>{data.os}</dd>
        <dt>WebView family</dt>
        <dd>{data.engine} (runtime version not measured)</dd>
        <dt>Saved accounts</dt>
        <dd>{accounts.length}</dd>
        <dt>Open native views</dt>
        <dd>{data.openAccounts.length}</dd>
        <dt>Automatic suspension</dt>
        <dd>Unavailable; close a window explicitly after ending calls</dd>
        <dt>Telemetry</dt>
        <dd>None from SyntraChat; service privacy policies apply</dd>
      </dl>
      <button onClick={() => void run(refresh)} disabled={busy}>
        <RefreshCw size={16} /> Refresh diagnostics
      </button>
      <button className="quit" onClick={() => void run(api.quit)}>
        Quit SyntraChat
      </button>
    </>
  );
}
