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
  },
}));
const initial: Snapshot = {
  settings: {
    version: 1,
    accounts: [
      {
        id: "account-1",
        name: "Discord Personal",
        serviceId: "discord",
        url: "https://discord.com/app",
        zoom: 1,
        color: null,
      },
    ],
    theme: "dark",
    accent: "#a78bfa",
    horizontalTabs: false,
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
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listen).mockResolvedValue(() => {});
  vi.mocked(api.contentVisible).mockResolvedValue(undefined);
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
      ),
    );
  });
  it("does not remove an account until confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole("heading", { name: "Discord Personal" });
    await user.click(screen.getByLabelText("Options for Discord Personal"));
    await user.click(screen.getByRole("button", { name: "Remove" }));
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
    const handler = vi.mocked(listen).mock.calls.at(-1)![1];
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
});
