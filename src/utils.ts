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
