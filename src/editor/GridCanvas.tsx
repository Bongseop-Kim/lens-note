import { useState, type PointerEvent } from "react";
import type { DisplayRect, MonitorInfo } from "../utils/zonePickerMath";
import {
  calcGridDimensions,
  cellRangeToDisplayRect,
  pointToCell,
  snapGuideColumns,
  snapGuideRows,
} from "../utils/gridMath";

interface GridCanvasProps {
  monitor: MonitorInfo;
  canvas: { width: number; height: number; scale: number };
  value: DisplayRect | null;
  onChange: (rect: DisplayRect) => void;
  onCommit: (rect: DisplayRect) => void;
}

type DragState = {
  startCol: number;
  startRow: number;
  currentCol: number;
  currentRow: number;
} | null;

const GUIDE_BAND = 24;

export default function GridCanvas({
  monitor,
  canvas,
  value,
  onChange,
  onCommit,
}: GridCanvasProps) {
  const { cols, rows } = calcGridDimensions(monitor.width, monitor.height);
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const cellW = canvasW / cols;
  const cellH = canvasH / rows;

  const [dragState, setDragState] = useState<DragState>(null);
  const colGuides = snapGuideColumns(cols);
  const rowGuides = snapGuideRows(rows);

  let selC1 = -1;
  let selR1 = -1;
  let selC2 = -1;
  let selR2 = -1;

  if (dragState) {
    selC1 = Math.min(dragState.startCol, dragState.currentCol);
    selR1 = Math.min(dragState.startRow, dragState.currentRow);
    selC2 = Math.max(dragState.startCol, dragState.currentCol);
    selR2 = Math.max(dragState.startRow, dragState.currentRow);
  } else if (value && value.w > 0 && value.h > 0) {
    selC1 = Math.round(value.x / cellW);
    selR1 = Math.round(value.y / cellH);
    selC2 = Math.min(cols - 1, Math.round((value.x + value.w) / cellW) - 1);
    selR2 = Math.min(rows - 1, Math.round((value.y + value.h) / cellH) - 1);
  }

  function readCell(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return pointToCell(
      event.clientX - bounds.left,
      event.clientY - bounds.top,
      cols,
      rows,
      canvasW,
      canvasH,
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const { col, row } = readCell(event);
    setDragState({
      startCol: col,
      startRow: row,
      currentCol: col,
      currentRow: row,
    });
    onChange(
      cellRangeToDisplayRect(col, row, col, row, cols, rows, canvasW, canvasH),
    );
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState) {
      return;
    }

    const { col, row } = readCell(event);
    if (col === dragState.currentCol && row === dragState.currentRow) {
      return;
    }

    const next = { ...dragState, currentCol: col, currentRow: row };
    setDragState(next);
    onChange(
      cellRangeToDisplayRect(
        next.startCol,
        next.startRow,
        col,
        row,
        cols,
        rows,
        canvasW,
        canvasH,
      ),
    );
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (!dragState) {
      return;
    }

    const { col, row } = readCell(event);
    const rect = cellRangeToDisplayRect(
      dragState.startCol,
      dragState.startRow,
      col,
      row,
      cols,
      rows,
      canvasW,
      canvasH,
    );
    setDragState(null);
    onChange(rect);
    onCommit(rect);
  }

  return (
    <div
      className="relative select-none"
      style={{ width: canvasW + GUIDE_BAND, height: canvasH + GUIDE_BAND }}
    >
      {Array.from(colGuides.entries()).map(([colIdx, label]) => (
        <div
          key={`cg-${colIdx}`}
          className="absolute top-0 -translate-x-1/2 text-xs font-semibold leading-none text-muted-foreground"
          style={{ left: GUIDE_BAND + Math.round(colIdx * cellW), top: 4 }}
        >
          {label}
        </div>
      ))}

      {Array.from(rowGuides.entries()).map(([rowIdx, label]) => (
        <div
          key={`rg-${rowIdx}`}
          className="absolute left-0 -translate-y-1/2 text-xs font-semibold leading-none text-muted-foreground"
          style={{ top: GUIDE_BAND + Math.round(rowIdx * cellH), left: 0 }}
        >
          {label}
        </div>
      ))}

      <div
        className="absolute cursor-crosshair overflow-hidden rounded-lg bg-background shadow-sm"
        style={{
          left: GUIDE_BAND,
          top: GUIDE_BAND,
          width: canvasW,
          height: canvasH,
          touchAction: "none",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setDragState(null)}
      >
        <div
          className="h-full w-full p-[2px]"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            gap: "2px",
          }}
        >
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) => {
              const selected =
                selC1 >= 0 &&
                col >= selC1 &&
                col <= selC2 &&
                row >= selR1 &&
                row <= selR2;
              return (
                <div
                  key={`${col}-${row}`}
                  className={`rounded-sm transition-colors ${
                    selected ? "bg-foreground" : "bg-muted"
                  }`}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
