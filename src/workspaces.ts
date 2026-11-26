import type { Account, Settings } from "./api";

export function workspaceAccounts(settings: Settings): Account[] {
  return settings.accounts
    .filter(
      (a) =>
        !settings.activeWorkspace ||
        a.details.workspaceId === settings.activeWorkspace,
    )
    .sort((a, b) => Number(b.details.pinned) - Number(a.details.pinned));
}

export function applyCustomization(
  settings: Settings,
  root = document.documentElement,
) {
  const c = settings.customization;
  root.style.setProperty(
    "--font-family",
    {
      system: '"Segoe UI", system-ui, sans-serif',
      sans: "Arial, sans-serif",
      mono: "Consolas, monospace",
    }[c.font] ?? "system-ui",
  );
  root.style.setProperty("--font-size", `${c.fontSize}px`);
  root.style.setProperty("--radius", `${c.radius}px`);
  root.dataset.density = c.comfortable ? "comfortable" : "compact";
  for (const name of ["bg", "panel", "text", "muted", "rail", "line", "hover"])
    root.style.removeProperty(`--${name}`);
  if (c.colors) {
    for (const [name, value] of Object.entries({
      bg: c.background,
      panel: c.panel,
      text: c.text,
      muted: c.muted,
      rail: c.background,
      hover: c.panel,
      line: `${c.muted}55`,
    }))
      root.style.setProperty(`--${name}`, value);
  }
}

export async function accountImage(file: File): Promise<string> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Choose a PNG, JPEG or WebP image under 5 MB.");
  // Use a data URL so local image conversion works under the shell's restrictive CSP.
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("Could not read the account image."));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image conversion is unavailable.");
  const side = Math.min(image.width, image.height);
  ctx.drawImage(
    image,
    (image.width - side) / 2,
    (image.height - side) / 2,
    side,
    side,
    0,
    0,
    64,
    64,
  );
  return canvas.toDataURL("image/png");
}
