// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { accountImage } from "./workspaces";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("converts local raster images through CSP-compatible data URLs and crops square", async () => {
  let decodedSource = "";
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      width = 128;
      height = 64;
      async decode() {
        decodedSource = this.src;
      }
    },
  );
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
    "data:image/png;base64,converted",
  );
  const file = new File(["test bytes"], "account.png", { type: "image/png" });
  expect(await accountImage(file)).toBe("data:image/png;base64,converted");
  expect(decodedSource).toMatch(/^data:image\/png;base64,/);
  expect(drawImage).toHaveBeenCalledWith(
    expect.anything(),
    32,
    0,
    64,
    64,
    0,
    0,
    64,
    64,
  );
});

it("rejects SVG, unsupported formats and oversized source files", async () => {
  for (const type of ["image/svg+xml", "image/gif", "text/plain"]) {
    await expect(
      accountImage(new File(["x"], "bad", { type })),
    ).rejects.toThrow("Choose a PNG, JPEG or WebP");
  }
  await expect(
    accountImage(
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
        type: "image/png",
      }),
    ),
  ).rejects.toThrow("under 5 MB");
});
