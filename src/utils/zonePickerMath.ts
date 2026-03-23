export const MINIMAP_DISPLAY_WIDTH = 240; // px width of mini-map display

export interface MonitorInfo {
  name: string;
  width: number;   // physical px
  height: number;  // physical px
  x: number;       // global origin X, physical px
  y: number;       // global origin Y, physical px
  scaleFactor: number;
}

export interface PhysicalBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Scale factor: minimap display px per monitor physical px */
export function minimapScale(monitor: MonitorInfo): number {
  return MINIMAP_DISPLAY_WIDTH / monitor.width;
}

/** A selection rectangle in minimap display pixels */
export interface DisplayRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Convert a display-pixel rect (minimap coordinates) to physical global bounds.
 * Minimap display px → physical px (via minimapScale); monitor.x/y are already physical.
 */
export function displayRectToPhysicalBounds(
  rect: DisplayRect,
  monitor: MonitorInfo
): PhysicalBounds {
  const scale = minimapScale(monitor);
  return {
    x: Math.round(rect.x / scale + monitor.x),
    y: Math.round(rect.y / scale + monitor.y),
    width: Math.round(rect.w / scale),
    height: Math.round(rect.h / scale),
  };
}

/**
 * Clamp a DisplayRect so it stays within the minimap canvas.
 * Origin is clamped to >= 0; width/height are clamped so the rect doesn't extend past the edge.
 */
export function clampDisplayRect(
  rect: DisplayRect,
  mapW: number,
  mapH: number
): DisplayRect {
  const x = Math.max(0, Math.min(rect.x, mapW));
  const y = Math.max(0, Math.min(rect.y, mapH));
  const w = Math.max(0, Math.min(rect.w, mapW - x));
  const h = Math.max(0, Math.min(rect.h, mapH - y));
  return { x, y, w, h };
}
