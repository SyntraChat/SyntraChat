import { invoke } from "@tauri-apps/api/core";

export interface Account {
  id: string;
  serviceId: string;
  name: string;
  url: string;
  zoom: number;
  color: string | null;
  details: AccountDetails;
}
export interface AccountDetails {
  workspaceId: string | null;
  folder: string;
  pinned: boolean;
  image: string | null;
}
export interface Workspace {
  id: string;
  name: string;
}
export interface Customization {
  font: string;
  fontSize: number;
  radius: number;
  comfortable: boolean;
  colors: boolean;
  background: string;
  panel: string;
  text: string;
  muted: string;
}
export interface Desktop {
  closeToTray: boolean;
  launchAtLogin: boolean;
  startHidden: boolean;
  restoreSession: boolean;
  globalShortcut: boolean;
  toggleShortcut: string;
}
export interface Settings {
  version: number;
  accounts: Account[];
  theme: string;
  accent: string;
  horizontalTabs: boolean;
  workspaces: Workspace[];
  activeWorkspace: string | null;
  customization: Customization;
  desktop: Desktop;
  session: string[];
  lastActive: string | null;
}
export interface Service {
  id: string;
  name: string;
  url: string;
  category: string;
  limitation: string;
  requiresUrl?: boolean;
}
export interface Snapshot {
  settings: Settings;
  services: Service[];
  openAccounts: string[];
  activeAccount: string | null;
  version: string;
  os: string;
  engine: string;
  viewStates: Record<string, { state: string; message: string | null }>;
  trayAvailable: boolean;
  desktopError: string | null;
}

export const api = {
  snapshot: () => invoke<Snapshot>("snapshot"),
  add: (
    serviceId: string,
    name: string,
    url?: string,
    details?: AccountDetails,
  ) => invoke<void>("add_account", { serviceId, name, url, details }),
  edit: (id: string, name: string, zoom: number, details?: AccountDetails) =>
    invoke<void>("edit_account", { id, name, zoom, details }),
  remove: (id: string) => invoke<void>("remove_account", { id }),
  appearance: (theme: string, accent: string) =>
    invoke<void>("set_appearance", { theme, accent }),
  open: (id: string) => invoke<void>("open_account", { id }),
  reload: (id: string) => invoke<void>("reload_account", { id }),
  close: (id: string) => invoke<void>("close_account", { id }),
  home: () => invoke<void>("show_home"),
  contentVisible: (visible: boolean) =>
    invoke<void>("set_content_visible", { visible }),
  quit: () => invoke<void>("quit"),
  reorder: (ids: string[]) => invoke<void>("reorder_accounts", { ids }),
  color: (id: string, color: string | null) =>
    invoke<void>("set_account_color", { id, color }),
  layout: (horizontal: boolean) =>
    invoke<void>("set_tab_layout", { horizontal }),
  accountMenu: (id: string) => invoke<void>("account_menu", { id }),
  saveWorkspace: (id: string | null, name: string) =>
    invoke<void>("save_workspace", { id, name }),
  removeWorkspace: (id: string) => invoke<void>("remove_workspace", { id }),
  workspace: (id: string | null) => invoke<void>("select_workspace", { id }),
  customize: (customization: Customization, theme?: string, accent?: string) =>
    invoke<void>("set_customization", { customization, theme, accent }),
  desktop: (desktop: Desktop) => invoke<void>("set_desktop", { desktop }),
  exportTheme: () => invoke<void>("export_theme"),
  restore: () => invoke<void>("restore_session"),
};
