// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { App } from "./App";
import { api, type Snapshot } from "./api";

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
      },
    ],
    theme: "dark",
    accent: "#a78bfa",
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
  version: "0.1.0",
  os: "windows",
  engine: "WebView2",
};
beforeEach(() => {
  vi.resetAllMocks();
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
});
