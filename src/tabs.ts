export const zoomSteps = [
  0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2,
];

export function stepZoom(current: number, direction: number) {
  const nearest = zoomSteps.reduce(
    (best, value, index) =>
      Math.abs(value - current) < Math.abs(zoomSteps[best]! - current)
        ? index
        : best,
    0,
  );
  return zoomSteps[
    Math.max(0, Math.min(zoomSteps.length - 1, nearest + direction))
  ]!;
}

export function moveTab(ids: string[], id: string, target: string) {
  const from = ids.indexOf(id),
    to = ids.indexOf(target);
  if (from < 0 || to < 0 || from === to) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}
