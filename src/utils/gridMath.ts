import type { DisplayRect } from "./zonePickerMath";

const MIN_GRID_SIZE = 4;

/**
 * Choose a grid size that roughly matches the monitor aspect ratio while
 * keeping the total number of cells near the target.
 */
export function calcGridDimensions(
  monitorW: number,
  monitorH: number,
  targetCells = 160,
): { cols: number; rows: number } {
  if (monitorW <= 0 || monitorH <= 0 || targetCells <= 0) {
    return { cols: MIN_GRID_SIZE, rows: MIN_GRID_SIZE };
  }

  const ratio = monitorW / monitorH;
  const cols = Math.max(MIN_GRID_SIZE, Math.round(Math.sqrt(targetCells * ratio)));
  const rows = Math.max(MIN_GRID_SIZE, Math.round(targetCells / cols));
  return { cols, rows };
}

/**
 * Convert a canvas point to a 0-based cell index.
 */
export function pointToCell(
  x: number,
  y: number,
  cols: number,
  rows: number,
  canvasW: number,
  canvasH: number,
): { col: number; row: number } {
  if (cols <= 0 || rows <= 0 || canvasW <= 0 || canvasH <= 0) {
    return { col: 0, row: 0 };
  }

  return {
    col: Math.max(0, Math.min(cols - 1, Math.floor((x / canvasW) * cols))),
    row: Math.max(0, Math.min(rows - 1, Math.floor((y / canvasH) * rows))),
  };
}

/**
 * Convert a cell range to a display rect in canvas pixels.
 */
export function cellRangeToDisplayRect(
  c1: number,
  r1: number,
  c2: number,
  r2: number,
  cols: number,
  rows: number,
  canvasW: number,
  canvasH: number,
): DisplayRect {
  if (cols <= 0 || rows <= 0 || canvasW <= 0 || canvasH <= 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  const startCol = Math.min(c1, c2);
  const startRow = Math.min(r1, r2);
  const endCol = Math.max(c1, c2);
  const endRow = Math.max(r1, r2);
  const cellW = canvasW / cols;
  const cellH = canvasH / rows;

  return {
    x: Math.round(startCol * cellW),
    y: Math.round(startRow * cellH),
    w: Math.round((endCol - startCol + 1) * cellW),
    h: Math.round((endRow - startRow + 1) * cellH),
  };
}

/**
 * Convert a preset's normalized ratios to a snapped display rect.
 */
export function presetRatioToDisplayRect(
  px: number,
  py: number,
  pw: number,
  ph: number,
  cols: number,
  rows: number,
  canvasW: number,
  canvasH: number,
): DisplayRect {
  const c1 = Math.max(0, Math.round(px * cols));
  const r1 = Math.max(0, Math.round(py * rows));
  const c2 = Math.max(c1, Math.min(cols - 1, Math.round((px + pw) * cols) - 1));
  const r2 = Math.max(r1, Math.min(rows - 1, Math.round((py + ph) * rows) - 1));

  return cellRangeToDisplayRect(c1, r1, c2, r2, cols, rows, canvasW, canvasH);
}

/**
 * Convert a display rect back to normalized preset ratios.
 */
export function displayRectToPresetRatio(
  rect: DisplayRect,
  cols: number,
  rows: number,
  canvasW: number,
  canvasH: number,
): { x: number; y: number; w: number; h: number } {
  if (cols <= 0 || rows <= 0 || canvasW <= 0 || canvasH <= 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  const cellW = canvasW / cols;
  const cellH = canvasH / rows;
  const c1 = Math.max(0, Math.round(rect.x / cellW));
  const r1 = Math.max(0, Math.round(rect.y / cellH));
  const c2 = Math.max(c1, Math.round((rect.x + rect.w) / cellW));
  const r2 = Math.max(r1, Math.round((rect.y + rect.h) / cellH));

  return {
    x: c1 / cols,
    y: r1 / rows,
    w: (c2 - c1) / cols,
    h: (r2 - r1) / rows,
  };
}

/**
 * Columns that deserve snap guide labels.
 */
export function snapGuideColumns(cols: number): Map<number, string> {
  return buildGuideMap(cols);
}

/**
 * Rows that deserve snap guide labels.
 */
export function snapGuideRows(rows: number): Map<number, string> {
  return buildGuideMap(rows);
}

function buildGuideMap(count: number): Map<number, string> {
  const result = new Map<number, string>();
  if (count <= 0) {
    return result;
  }

  const fractions: Array<[number, string]> = [
    [0.25, "¼"],
    [0.5, "½"],
    [0.75, "¾"],
  ];

  for (const [fraction, label] of fractions) {
    const idx = Math.round(fraction * count);
    if (idx > 0 && idx < count) {
      result.set(idx, label);
    }
  }

  return result;
}
