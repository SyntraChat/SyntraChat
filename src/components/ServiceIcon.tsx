import { MessageCircle, Hash, MessagesSquare } from "lucide-react";

const icons: Record<string, string> = {
  discord: "discord",
  "telegram-k": "telegram",
  "telegram-a": "telegram",
  whatsapp: "whatsapp",
  slack: "slack",
  steamchat: "steamchat",
  cinny: "cinny",
  element: "element",
  stoat: "stoat",
  fluxer: "fluxer",
  yapper: "yapper",
  wire: "wire",
  threema: "threema",
};

export function ServiceIcon({ serviceId }: { serviceId: string }) {
  if (serviceId === "mattermost") return <Hash size={20} aria-hidden="true" />;
  if (serviceId === "zulip")
    return <MessagesSquare size={20} aria-hidden="true" />;
  const icon = icons[serviceId];
  return icon ? (
    <span
      className="service-icon"
      aria-hidden="true"
      style={{
        maskImage: `url(/services/${icon}.svg)`,
        WebkitMaskImage: `url(/services/${icon}.svg)`,
      }}
    />
  ) : (
    <MessageCircle size={20} aria-hidden="true" />
  );
}
