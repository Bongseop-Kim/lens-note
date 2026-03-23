export const CELL_SIZE_LOGICAL = 120; // logical px per cell
export const MINIMAP_DISPLAY_WIDTH = 240; // px width of mini-map display

export interface MonitorInfo {
  name: string;
  width: number;   // logical px
  height: number;  // logical px
  x: number;       // global origin X, logical
  y: number;       // global origin Y, logical
  scaleFactor: number;
}

export interface CellRect {
  startCol: number;
  startRow: number;
  endCol: number;   // inclusive
  endRow: number;   // inclusive
}

export interface PhysicalBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Number of cells across/down for a monitor */
export function cellCount(monitor: MonitorInfo): { cols: number; rows: number } {
  return {
    cols: Math.floor(monitor.width / CELL_SIZE_LOGICAL),
    rows: Math.floor(monitor.height / CELL_SIZE_LOGICAL),
  };
}

/** Scale factor: minimap display px per monitor logical px */
export function minimapScale(monitor: MonitorInfo): number {
  return MINIMAP_DISPLAY_WIDTH / monitor.width;
}

/** Convert a cell rect (monitor-local) + monitor to physical global bounds */
export function cellRectToPhysicalBounds(
  rect: CellRect,
  monitor: MonitorInfo
): PhysicalBounds {
  const logX = rect.startCol * CELL_SIZE_LOGICAL + monitor.x;
  const logY = rect.startRow * CELL_SIZE_LOGICAL + monitor.y;
  const logW = (rect.endCol - rect.startCol + 1) * CELL_SIZE_LOGICAL;
  const logH = (rect.endRow - rect.startRow + 1) * CELL_SIZE_LOGICAL;
  return {
    x: Math.round(logX * monitor.scaleFactor),
    y: Math.round(logY * monitor.scaleFactor),
    width: Math.round(logW * monitor.scaleFactor),
    height: Math.round(logH * monitor.scaleFactor),
  };
}

/** Convert a display pixel coordinate to a cell index (clamp to valid range) */
export function displayPxToCell(
  displayPx: number,
  monitor: MonitorInfo,
  axis: "col" | "row"
): number {
  const scale = minimapScale(monitor);
  const cellDisplaySize = CELL_SIZE_LOGICAL * scale;
  const { cols, rows } = cellCount(monitor);
  const maxCell = (axis === "col" ? cols : rows) - 1;
  return Math.max(0, Math.min(maxCell, Math.floor(displayPx / cellDisplaySize)));
}

/** Preset: camera below (top-center, 4×2 cells) */
export function presetCameraBelow(monitor: MonitorInfo): CellRect {
  const { cols } = cellCount(monitor);
  const centerCol = Math.floor(cols / 2);
  return {
    startCol: Math.max(0, centerCol - 2),
    startRow: 0,
    endCol: Math.min(cols - 1, centerCol + 1),
    endRow: 1,
  };
}

/** Preset: top-left strip (4×2 cells) */
export function presetTopLeft(monitor: MonitorInfo): CellRect {
  const { cols } = cellCount(monitor);
  return { startCol: 0, startRow: 0, endCol: Math.min(3, cols - 1), endRow: 1 };
}

/** Preset: top-right strip (4×2 cells) */
export function presetTopRight(monitor: MonitorInfo): CellRect {
  const { cols } = cellCount(monitor);
  return { startCol: Math.max(0, cols - 4), startRow: 0, endCol: cols - 1, endRow: 1 };
}

/** Preset: bottom full-width (2 rows) */
export function presetBottomFull(monitor: MonitorInfo): CellRect {
  const { cols, rows } = cellCount(monitor);
  return { startCol: 0, startRow: Math.max(0, rows - 2), endCol: cols - 1, endRow: rows - 1 };
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
 * Minimap display px → monitor logical px (via minimapScale) → physical px (via scaleFactor).
 */
export function displayRectToPhysicalBounds(
  rect: DisplayRect,
  monitor: MonitorInfo
): PhysicalBounds {
  const scale = minimapScale(monitor);
  const logX = rect.x / scale;
  const logY = rect.y / scale;
  const logW = rect.w / scale;
  const logH = rect.h / scale;
  return {
    x: Math.round((logX + monitor.x) * monitor.scaleFactor),
    y: Math.round((logY + monitor.y) * monitor.scaleFactor),
    width: Math.round(logW * monitor.scaleFactor),
    height: Math.round(logH * monitor.scaleFactor),
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
