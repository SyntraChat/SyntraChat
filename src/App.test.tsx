// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
  act,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { App } from "./App";
import { api, type Snapshot } from "./api";
import { listen } from "@tauri-apps/api/event";
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));

vi.mock("./api", () => ({
  api: {
    snapshot: vi.fn(),
    add: vi.fn(),
    edit: vi.fn(),
    remove: vi.fn(),
    appearance: vi.fn(),
    open: vi.fn(),
    reload: vi.fn(),
    close: vi.fn(),
    quit: vi.fn(),
    home: vi.fn(),
    contentVisible: vi.fn(),
    reorder: vi.fn(),
    color: vi.fn(),
    layout: vi.fn(),
    accountMenu: vi.fn(),
    saveWorkspace: vi.fn(),
    removeWorkspace: vi.fn(),
    workspace: vi.fn(),
    customize: vi.fn(),
    desktop: vi.fn(),
    exportTheme: vi.fn(),
    restore: vi.fn(),
  },
}));
const initial: Snapshot = {
  settings: {
    version: 2,
    accounts: [
      {
        id: "account-1",
        name: "Discord Personal",
        serviceId: "discord",
        url: "https://discord.com/app",
        zoom: 1,
        color: null,
        details: { workspaceId: null, folder: "", pinned: false, image: null },
      },
    ],
    theme: "dark",
    accent: "#a78bfa",
    horizontalTabs: false,
    workspaces: [],
    activeWorkspace: null,
    customization: {
      font: "system",
      fontSize: 13,
      radius: 5,
      comfortable: false,
      colors: false,
      background: "#141419",
      panel: "#1a1a21",
      text: "#eeeef3",
      muted: "#a1a1b1",
    },
    desktop: {
      closeToTray: false,
      launchAtLogin: false,
      startHidden: false,
      restoreSession: false,
      globalShortcut: false,
      toggleShortcut: "CommandOrControl+Shift+Space",
    },
    session: [],
    lastActive: null,
  },
  services: [
    {
      id: "discord",
      name: "Discord",
      url: "https://discord.com/app",
      category: "Community",
      limitation: "Experimental",
    },
  ],
  openAccounts: [],
  activeAccount: null,
  version: "0.1.0",
  os: "windows",
  engine: "WebView2",
  viewStates: {},
  trayAvailable: true,
  desktopError: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listen).mockResolvedValue(() => {});
  vi.mocked(api.contentVisible).mockResolvedValue(undefined);
  vi.mocked(api.accountMenu).mockResolvedValue(undefined);
  vi.mocked(api.snapshot).mockResolvedValue(structuredClone(initial));
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);

describe("workspace", () => {
  it("filters a workspace and sends workspace selection through the native boundary", async () => {
    const data = structuredClone(initial);
    data.settings.workspaces = [{ id: "work", name: "Work" }];
    data.settings.activeWorkspace = "work";
    data.settings.accounts[0]!.details.workspaceId = "work";
    data.settings.accounts.push({
      ...structuredClone(data.settings.accounts[0]!),
      id: "other",
      name: "Other account",
      details: { workspaceId: null, folder: "", pinned: false, image: null },
    });
    vi.mocked(api.snapshot).mockResolvedValue(data);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    expect(
      screen.queryByRole("button", { name: "Open Other account" }),
    ).toBeNull();
    await user.selectOptions(screen.getByLabelText("Current workspace"), "");
    await waitFor(() => expect(api.workspace).toHaveBeenCalledWith(null));
  });
  it("creates a workspace and confirms removal while retaining its accounts", async () => {
    const data = structuredClone(initial);
    data.settings.workspaces = [{ id: "work", name: "Work" }];
    vi.mocked(api.snapshot).mockResolvedValue(data);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.click(
      screen.getByRole("button", { name: "Appearance settings" }),
    );
    await user.click(await screen.findByRole("button", { name: "workspaces" }));
    await user.type(screen.getByLabelText("Workspace name"), "Gaming");
    await user.click(screen.getByRole("button", { name: "Create workspace" }));
    await waitFor(() =>
      expect(api.saveWorkspace).toHaveBeenCalledWith(null, "Gaming"),
    );
    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(api.removeWorkspace).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Remove workspace, keep accounts" }),
    );
    await waitFor(() =>
      expect(api.removeWorkspace).toHaveBeenCalledWith("work"),
    );
  });
  it("saves theme typography and rejects foreign theme imports", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.click(
      screen.getByRole("button", { name: "Appearance settings" }),
    );
    await user.selectOptions(await screen.findByLabelText("Text size"), "16");
    await user.selectOptions(screen.getByLabelText("App font"), "mono");
    await user.click(
      screen.getByRole("button", { name: "Save customization" }),
    );
    await waitFor(() =>
      expect(api.customize).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 16, font: "mono" }),
      ),
    );
    vi.mocked(api.customize).mockClear();
    const file = new File(['{"format":"foreign"}'], "theme.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: async () => '{"format":"foreign"}',
    });
    await user.upload(screen.getByLabelText("Import theme"), file);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "not a SyntraChat theme pack",
      ),
    );
    expect(api.customize).not.toHaveBeenCalled();
  });
  it("saves desktop preferences only after an explicit save", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.click(
      screen.getByRole("button", { name: "Appearance settings" }),
    );
    await user.click(await screen.findByRole("button", { name: "desktop" }));
    await user.click(
      screen.getByLabelText("Restore my open accounts on startup"),
    );
    expect(api.desktop).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Save desktop preferences" }),
    );
    await waitFor(() =>
      expect(api.desktop).toHaveBeenCalledWith(
        expect.objectContaining({ restoreSession: true, launchAtLogin: false }),
      ),
    );
  });
  it("uses native app shortcuts to open pinned accounts while preserving full order", async () => {
    const data = structuredClone(initial);
    const second = structuredClone(data.settings.accounts[0]!);
    second.id = "second";
    second.name = "Pinned";
    second.details.pinned = true;
    data.settings.accounts.push(second);
    vi.mocked(api.snapshot).mockResolvedValue(data);
    render(<App />);
    await screen.findByRole("heading", { name: "Pinned" });
    await act(async () =>
      vi
        .mocked(listen)
        .mock.calls.find(([name]) => name === "shell-action")![1]({
          event: "shell-action",
          id: 1,
          payload: "open:0",
        }),
    );
    await waitFor(() => expect(api.open).toHaveBeenCalledWith("second"));
  });
  it("keeps accounts available when a saved session only partially restores", async () => {
    vi.mocked(api.restore).mockRejectedValue(
      "Some saved tabs could not be restored",
    );
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    expect(screen.getByRole("alert").textContent).toContain(
      "could not be restored",
    );
    expect(api.restore).toHaveBeenCalledTimes(1);
  });
  it("shows blocked redirects and hides remote content until a new load starts", async () => {
    const data = structuredClone(initial);
    data.activeAccount = "account-1";
    data.viewStates["account-1"] = {
      state: "blocked",
      message: "A different sign-in origin was requested.",
    };
    vi.mocked(api.snapshot).mockResolvedValue(data);
    render(<App />);
    await screen.findByRole("heading", { name: "Sign-in redirect blocked" });
    await waitFor(() =>
      expect(api.contentVisible).toHaveBeenLastCalledWith(false),
    );
    const loaded = structuredClone(data);
    loaded.viewStates["account-1"] = { state: "loading", message: null };
    vi.mocked(api.snapshot).mockResolvedValue(loaded);
    await act(async () =>
      vi
        .mocked(listen)
        .mock.calls.find(([name]) => name === "workspace-updated")![1]({
          event: "workspace-updated",
          id: 1,
          payload: null,
        }),
    );
    await waitFor(() =>
      expect(api.contentVisible).toHaveBeenLastCalledWith(true),
    );
  });
  it("creates a custom account through the native boundary", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.click(
      within(screen.getByRole("main")).getByRole("button", {
        name: "Add account",
      }),
    );
    const dialog = screen.getByRole("dialog");
    await user.selectOptions(
      within(dialog).getByLabelText("Service"),
      "custom",
    );
    await user.type(
      within(dialog).getByLabelText("Account label"),
      "Private chat",
    );
    await user.type(
      within(dialog).getByLabelText("Website URL"),
      "https://example.com/",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Create account" }),
    );
    await waitFor(() =>
      expect(api.add).toHaveBeenCalledWith(
        "custom",
        "Private chat",
        "https://example.com/",
        expect.objectContaining({ folder: "", pinned: false }),
      ),
    );
  });
  it("does not remove an account until confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.click(screen.getByLabelText("Options for Discord Personal"));
    await act(async () =>
      vi
        .mocked(listen)
        .mock.calls.find(([name]) => name === "account-action")![1]({
          event: "account-action",
          id: 1,
          payload: { id: "account-1", action: "remove" },
        }),
    );
    expect(api.remove).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Remove account, keep session" }),
    );
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith("account-1"));
  });
  it("shows native failures instead of reporting success", async () => {
    vi.mocked(api.open).mockRejectedValue("WebView creation failed");
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.click(screen.getByRole("button", { name: "Open account" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "WebView creation failed",
    );
  });
  it("opens the keyboard quick switcher and filters accounts", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.keyboard("{Control>}k{/Control}");
    const dialog = screen.getByRole("dialog", { name: "Quick switch" });
    await user.type(within(dialog).getByRole("textbox"), "Personal");
    await user.click(
      within(dialog).getByRole("button", { name: "Discord Personal" }),
    );
    await waitFor(() => expect(api.open).toHaveBeenCalledWith("account-1"));
  });
  it("passes automated structural accessibility checks", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    const result = await axe.run(document.body, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(result.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
  it("shows an active account as an embedded tab and returns to local settings", async () => {
    const active = structuredClone(initial);
    active.activeAccount = "account-1";
    active.openAccounts = ["account-1"];
    vi.mocked(api.snapshot).mockResolvedValue(active);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Reload active account" });
    expect(screen.queryByRole("button", { name: "Open account" })).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Open Discord Personal" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await user.click(
      screen.getByRole("button", { name: "Reload active account" }),
    );
    expect(api.reload).toHaveBeenCalledWith("account-1");
    vi.mocked(api.snapshot).mockResolvedValue(initial);
    await user.click(
      screen.getByRole("button", { name: "Appearance settings" }),
    );
    await screen.findByRole("heading", { name: "Appearance" });
    expect(api.home).toHaveBeenCalled();
  });
  it("hides native content while a local dialog is open and restores it after closing", async () => {
    const active = structuredClone(initial);
    active.activeAccount = "account-1";
    vi.mocked(api.snapshot).mockResolvedValue(active);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("button", { name: "Reload active account" });
    await user.click(screen.getByRole("button", { name: "Add account" }));
    await waitFor(() =>
      expect(api.contentVisible).toHaveBeenLastCalledWith(false),
    );
    await user.click(screen.getByRole("button", { name: "Close dialog" }));
    await waitFor(() =>
      expect(api.contentVisible).toHaveBeenLastCalledWith(true),
    );
  });
  it("opens native tab controls and applies an account color action", async () => {
    render(<App />);
    const tab = await screen.findByRole("button", {
      name: "Open Discord Personal",
    });
    fireEvent.contextMenu(tab);
    await waitFor(() =>
      expect(api.accountMenu).toHaveBeenCalledWith("account-1"),
    );
    const handler = vi
      .mocked(listen)
      .mock.calls.find(([name]) => name === "account-action")![1];
    await act(async () =>
      handler({
        event: "account-action",
        id: 1,
        payload: { id: "account-1", action: "color-#60a5fa" },
      }),
    );
    await waitFor(() =>
      expect(api.color).toHaveBeenCalledWith("account-1", "#60a5fa"),
    );
  });
  it("persists layout choice through the native command", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.click(
      screen.getByRole("button", { name: "Appearance settings" }),
    );
    await user.click(await screen.findByRole("button", { name: "Top tabs" }));
    await waitFor(() => expect(api.layout).toHaveBeenCalledWith(true));
  });
  it("sends the complete account order when a tab is dropped", async () => {
    const data = structuredClone(initial);
    data.settings.accounts.push({
      ...data.settings.accounts[0]!,
      id: "account-2",
      name: "Work",
    });
    vi.mocked(api.snapshot).mockResolvedValue(data);
    render(<App />);
    const from = await screen.findByRole("button", {
      name: "Open Discord Personal",
    });
    const to = screen.getByRole("button", { name: "Open Work" });
    window.PointerEvent = MouseEvent as typeof PointerEvent;
    from.setPointerCapture = vi.fn();
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: () => to,
    });
    fireEvent.pointerDown(from, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(from, { clientX: 100, clientY: 150 });
    fireEvent.pointerUp(from, { clientX: 100, clientY: 150 });
    await waitFor(() =>
      expect(api.reorder).toHaveBeenCalledWith(["account-2", "account-1"]),
    );
  });
  it("uses native menus for account rows without leaving overlapping dropdowns", async () => {
    const data = structuredClone(initial);
    data.settings.accounts.push({
      ...data.settings.accounts[0]!,
      id: "account-2",
      name: "Work",
    });
    vi.mocked(api.snapshot).mockResolvedValue(data);
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(
      await screen.findByRole("button", {
        name: "Options for Discord Personal",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Options for Work" }));
    expect(api.accountMenu).toHaveBeenNthCalledWith(1, "account-1");
    expect(api.accountMenu).toHaveBeenNthCalledWith(2, "account-2");
    expect(container.querySelector("details, .account-menu")).toBeNull();
  });
  it.each([1.1, 1.15, 0.67])(
    "preserves %s zoom when only the account name changes",
    async (zoom) => {
      const data = structuredClone(initial);
      data.settings.accounts[0]!.zoom = zoom;
      vi.mocked(api.snapshot).mockResolvedValue(data);
      const user = userEvent.setup();
      render(<App />);
      await screen.findByRole("heading", { name: "Discord Personal" });
      await act(async () =>
        vi
          .mocked(listen)
          .mock.calls.find(([name]) => name === "account-action")![1]({
            event: "account-action",
            id: 1,
            payload: { id: "account-1", action: "edit" },
          }),
      );
      expect((screen.getByLabelText("Zoom") as HTMLSelectElement).value).toBe(
        String(zoom),
      );
      await user.clear(screen.getByLabelText("Account label"));
      await user.type(screen.getByLabelText("Account label"), "Renamed");
      await user.click(screen.getByRole("button", { name: "Save account" }));
      await waitFor(() =>
        expect(api.edit).toHaveBeenCalledWith(
          "account-1",
          "Renamed",
          zoom,
          data.settings.accounts[0]!.details,
        ),
      );
    },
  );
  it("replaces an open form with the quick switcher instead of stacking dialogs", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.click(
      within(screen.getByRole("main")).getByRole("button", {
        name: "Add account",
      }),
    );
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Quick switch" })).toBeTruthy();
  });
  it("keeps the latest snapshot and one native listener when focus refreshes overlap", async () => {
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    let resolveOld!: (data: Snapshot) => void;
    vi.mocked(api.snapshot).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    fireEvent.focus(window);
    const updated = structuredClone(initial);
    updated.settings.accounts[0]!.name = "Updated";
    vi.mocked(api.snapshot).mockResolvedValue(updated);
    fireEvent.focus(window);
    await screen.findByRole("heading", { name: "Updated" });
    await act(async () => resolveOld(initial));
    expect(
      screen.queryByRole("heading", { name: "Discord Personal" }),
    ).toBeNull();
    expect(listen).toHaveBeenCalledTimes(3);
    await act(async () =>
      vi.mocked(listen).mock.calls[0]![1]({
        event: "account-action",
        id: 1,
        payload: { id: "account-1", action: "edit" },
      }),
    );
    expect(
      (screen.getByLabelText("Account label") as HTMLInputElement).value,
    ).toBe("Updated");
  });
  it("prevents overlapping commands before busy state renders", async () => {
    let finish!: () => void;
    vi.mocked(api.open).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<App />);
    const open = await screen.findByRole("button", { name: "Open account" });
    act(() => {
      open.click();
      open.click();
    });
    expect(api.open).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });
});
