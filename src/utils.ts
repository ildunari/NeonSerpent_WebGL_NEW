import { Point } from './types';

/** Calculates Euclidean distance between two points */
export function dist(p1: Point, p2: Point): number {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/** Toroidal (wrapping) distance — shortest path across world edges */
export function distTorus(p1: Point, p2: Point,
                          worldW: number, worldH: number): number {
  const halfW = worldW * 0.5, halfH = worldH * 0.5;
  let dx = Math.abs(p1.x - p2.x), dy = Math.abs(p1.y - p2.y);
  if (dx > halfW) dx = worldW - dx;
  if (dy > halfH) dy = worldH - dy;
  return Math.hypot(dx, dy);
}

// Add other utility functions here as needed

/** Helper function to wrap coordinates within the torus world */
export function wrap(p: Point, worldWidth: number, worldHeight: number): Point {
    const halfWidth = worldWidth / 2;
    const halfHeight = worldHeight / 2;
    let { x, y } = p;
    if (x > halfWidth) { x -= worldWidth; } else if (x < -halfWidth) { x += worldWidth; }
    if (y > halfHeight) { y -= worldHeight; } else if (y < -halfHeight) { y += worldHeight; }
    return { x, y };
}

/** Helper function to calculate the shortest delta on a torus */
export function torusDelta(target: Point, current: Point, worldWidth: number, worldHeight: number): [number, number] {
    const halfWidth = worldWidth / 2;
    const halfHeight = worldHeight / 2;
    let dx = target.x - current.x;
    let dy = target.y - current.y;
    if (dx > halfWidth) { dx -= worldWidth; } else if (dx < -halfWidth) { dx += worldWidth; }
    if (dy > halfHeight) { dy -= worldHeight; } else if (dy < -halfHeight) { dy += worldHeight; }
    return [dx, dy];
}

/** Torus-aware version of moveTowards */
export function moveTowardsTorus(target: Point, current: Point, distance: number, worldWidth: number, worldHeight: number): Point {
    const [dx, dy] = torusDelta(current, target, worldWidth, worldHeight); // Depends on torusDelta
    const len = Math.hypot(dx, dy) || 1;
    const scale = distance / len;
    return wrap({ x: target.x + dx * scale, y: target.y + dy * scale }, worldWidth, worldHeight); // Depends on wrap
}

// Helper function for linear color interpolation (Adding this here too as it was in PlayerSerpent)
export function lerpColor(color1: number, color2: number, t: number): number {
    t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
}

/** Linear interpolation between two numbers */
export function lerp(start: number, end: number, t: number): number {
    t = Math.max(0, Math.min(1, t)); // Clamp t between 0 and 1
    return start + (end - start) * t;
}
