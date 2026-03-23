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
