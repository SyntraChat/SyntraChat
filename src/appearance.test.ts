import { expect, it } from "vitest";
import { textOnAccent } from "./appearance";

it("keeps button labels readable on bright and dark custom accents", () => {
  expect(textOnAccent("#ffffff")).toBe("#000000");
  expect(textOnAccent("#000000")).toBe("#ffffff");
  expect(textOnAccent("#a78bfa")).toBe("#000000");
  expect(textOnAccent("#190052")).toBe("#ffffff");
});
