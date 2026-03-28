export const MINIMAP_DISPLAY_WIDTH = 420; // px width of placement canvas
export const MINIMAP_MAX_DISPLAY_HEIGHT = 520; // px max height of placement canvas

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
export function minimapScale(monitor: MonitorInfo, displayWidth = MINIMAP_DISPLAY_WIDTH): number {
  return displayWidth / monitor.width;
}

export function placementCanvasSize(
  monitor: MonitorInfo,
  maxWidth = MINIMAP_DISPLAY_WIDTH,
  maxHeight = MINIMAP_MAX_DISPLAY_HEIGHT
): { width: number; height: number; scale: number } {
  const scale = Math.min(maxWidth / monitor.width, maxHeight / monitor.height);
  return {
    width: Math.max(1, Math.round(monitor.width * scale)),
    height: Math.max(1, Math.round(monitor.height * scale)),
    scale,
  };
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
  monitor: MonitorInfo,
  displayWidth = MINIMAP_DISPLAY_WIDTH
): PhysicalBounds {
  const scale = minimapScale(monitor, displayWidth);
  return {
    x: Math.round(rect.x / scale + monitor.x),
    y: Math.round(rect.y / scale + monitor.y),
    width: Math.round(rect.w / scale),
    height: Math.round(rect.h / scale),
  };
}

export function physicalBoundsToDisplayRect(
  bounds: PhysicalBounds,
  monitor: MonitorInfo,
  displayWidth = MINIMAP_DISPLAY_WIDTH
): DisplayRect {
  const scale = minimapScale(monitor, displayWidth);
  return {
    x: Math.round((bounds.x - monitor.x) * scale),
    y: Math.round((bounds.y - monitor.y) * scale),
    w: Math.round(bounds.width * scale),
    h: Math.round(bounds.height * scale),
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
