import { POINT_RADIUS } from "./constants";

export function randomUnitVector2D() {
  const angle = Math.random() * 2 * Math.PI;
  return [Math.cos(angle), Math.sin(angle)];
}

export function getCentroid(points) {
  let area = 0,
    cx = 0,
    cy = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % n];
    const a = x0 * y1 - x1 * y0;
    area += a;
    cx += (x0 + x1) * a;
    cy += (y0 + y1) * a;
  }

  area *= 0.5;
  if (area === 0) return points[0];
  cx /= 6 * area;
  cy /= 6 * area;
  return [cx, cy];
}

export function drawPoint(ctx, x, y, color = "black", radius = POINT_RADIUS) {
  ctx.fillStyle = color;
  // draws a circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function lerp(start, end, inc) {
  return [
    start[0] + (end[0] - start[0]) * inc,
    start[1] + (end[1] - start[1]) * inc,
  ];
}
