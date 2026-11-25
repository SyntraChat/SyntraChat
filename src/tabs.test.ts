import { expect, it } from "vitest";
import { moveTab, stepZoom } from "./tabs";

it("reorders tabs without losing or duplicating account references", () => {
  const ids = ["a", "b", "c"];
  expect(moveTab(ids, "a", "c")).toEqual(["b", "c", "a"]);
  expect(moveTab(ids, "c", "a")).toEqual(["c", "a", "b"]);
  expect(moveTab(ids, "unknown", "a")).toBe(ids);
  expect(moveTab(ids, "a", "a")).toBe(ids);
  expect(ids).toEqual(["a", "b", "c"]);
});

it("snaps zoom and never moves outside the supported range", () => {
  expect(stepZoom(1.0, 1)).toBe(1.1);
  expect(stepZoom(1.0, -1)).toBe(0.9);
  expect(stepZoom(0.5, -1)).toBe(0.5);
  expect(stepZoom(2, 1)).toBe(2);
  expect(stepZoom(1.23, 1)).toBe(1.5);
});
