import { invoke } from "@tauri-apps/api/core";

export interface Account {
  id: string;
  serviceId: string;
  name: string;
  url: string;
  zoom: number;
}
export interface Settings {
  version: number;
  accounts: Account[];
  theme: string;
  accent: string;
}
export interface Service {
  id: string;
  name: string;
  url: string;
  category: string;
  limitation: string;
}
export interface Snapshot {
  settings: Settings;
  services: Service[];
  openAccounts: string[];
  activeAccount: string | null;
  version: string;
  os: string;
  engine: string;
}

export const api = {
  snapshot: () => invoke<Snapshot>("snapshot"),
  add: (serviceId: string, name: string, url?: string) =>
    invoke<void>("add_account", { serviceId, name, url }),
  edit: (id: string, name: string, zoom: number) =>
    invoke<void>("edit_account", { id, name, zoom }),
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
};
