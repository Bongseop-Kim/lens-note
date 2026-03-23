import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  MonitorInfo,
  CellRect,
  MINIMAP_DISPLAY_WIDTH,
  CELL_SIZE_LOGICAL,
  cellCount,
  minimapScale,
  displayPxToCell,
  cellRectToPhysicalBounds,
  presetCameraBelow,
  presetTopLeft,
  presetTopRight,
  presetBottomFull,
} from "../utils/zonePickerMath";
import { usePrefsStore } from "../store/usePrefsStore";

export default function ZonePicker() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [activeMonitorIdx, setActiveMonitorIdx] = useState(0);
  const [selection, setSelection] = useState<CellRect | null>(null);
  const [dragging, setDragging] = useState<{ startCol: number; startRow: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    invoke<MonitorInfo[]>("get_monitors").then(setMonitors).catch(console.error);
  }, []);

  const monitor = monitors[activeMonitorIdx];

  function applyBounds(rect: CellRect) {
    if (!monitor) return;
    setSelection(rect);
    const bounds = cellRectToPhysicalBounds(rect, monitor);
    invoke("set_overlay_bounds", {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    })
      .then(() =>
        usePrefsStore.getState().updatePrefs({
          overlayX: bounds.x,
          overlayY: bounds.y,
          overlayWidth: bounds.width,
          overlayHeight: bounds.height,
        })
      )
      .catch(console.error);
  }

  function getCell(e: React.MouseEvent<HTMLDivElement>): { col: number; row: number } | null {
    if (!mapRef.current || !monitor) return null;
    const rect = mapRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return {
      col: displayPxToCell(px, monitor, "col"),
      row: displayPxToCell(py, monitor, "row"),
    };
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const cell = getCell(e);
    if (!cell) return;
    setDragging({ startCol: cell.col, startRow: cell.row });
    setSelection({ startCol: cell.col, startRow: cell.row, endCol: cell.col, endRow: cell.row });
  }

  function rectFromDrag(end: { col: number; row: number }): CellRect {
    return {
      startCol: Math.min(dragging!.startCol, end.col),
      startRow: Math.min(dragging!.startRow, end.row),
      endCol: Math.max(dragging!.startCol, end.col),
      endRow: Math.max(dragging!.startRow, end.row),
    };
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging) return;
    const cell = getCell(e);
    if (!cell) return;
    setSelection(rectFromDrag(cell));
  }

  function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragging || !selection) { setDragging(null); return; }
    const cell = getCell(e);
    const finalRect = cell ? rectFromDrag(cell) : selection;
    setDragging(null);
    applyBounds(finalRect);
  }

  if (!monitor) {
    return <div className="p-4 text-gray-500 text-sm">모니터 정보를 불러오는 중...</div>;
  }

  const scale = minimapScale(monitor);
  const { cols, rows } = cellCount(monitor);
  const mapH = Math.round(monitor.height * scale);
  const cellDisplaySize = CELL_SIZE_LOGICAL * scale;

  const selStyle = selection
    ? {
        left: selection.startCol * cellDisplaySize,
        top: selection.startRow * cellDisplaySize,
        width: (selection.endCol - selection.startCol + 1) * cellDisplaySize,
        height: (selection.endRow - selection.startRow + 1) * cellDisplaySize,
      }
    : null;

  const bounds = selection ? cellRectToPhysicalBounds(selection, monitor) : null;

  return (
    <div className="p-4 flex gap-6 flex-wrap">
      <div>
        <p className="text-xs text-gray-500 mb-2">{`드래그해서 오버레이 영역을 선택하세요 (셀 ${CELL_SIZE_LOGICAL}×${CELL_SIZE_LOGICAL}px)`}</p>

        {monitors.length > 1 && (
          <div className="flex gap-1 mb-2">
            {monitors.map((m, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setActiveMonitorIdx(i); setSelection(null); setDragging(null); }}
                className={`px-2 py-1 text-xs rounded ${i === activeMonitorIdx ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {m.name || `모니터 ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        <div
          ref={mapRef}
          className="relative border border-gray-300 bg-gray-900 select-none overflow-hidden"
          style={{ width: MINIMAP_DISPLAY_WIDTH, height: mapH, cursor: "crosshair" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { if (dragging && selection) { setDragging(null); applyBounds(selection); } }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)`,
              backgroundSize: `${cellDisplaySize}px ${cellDisplaySize}px`,
            }}
          />
          <div className="absolute top-1 pointer-events-none text-xs text-gray-500" style={{ left: MINIMAP_DISPLAY_WIDTH / 2 - 6 }}>📷</div>
          {selStyle && (
            <div
              className="absolute border-2 border-amber-400 bg-amber-400/20 pointer-events-none"
              style={selStyle}
            />
          )}
          <div className="absolute bottom-1 right-1 text-xs text-gray-600 pointer-events-none">
            {monitor.width}×{monitor.height}
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-500">
          {bounds
            ? `X: ${Math.round(bounds.x / monitor.scaleFactor)}  Y: ${Math.round(bounds.y / monitor.scaleFactor)}  W: ${Math.round(bounds.width / monitor.scaleFactor)}  H: ${Math.round(bounds.height / monitor.scaleFactor)}  (논리px)`
            : `${cols}×${rows} 셀`}
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-2">프리셋</p>
        <div className="flex flex-col gap-2">
          {[
            { label: "📷 카메라 바로 아래", fn: presetCameraBelow },
            { label: "↖ 좌상단 띠", fn: presetTopLeft },
            { label: "↗ 우상단 띠", fn: presetTopRight },
            { label: "↙ 하단 전체", fn: presetBottomFull },
          ].map(({ label, fn }) => (
            <button
              key={label}
              type="button"
              className="px-3 py-1.5 text-sm text-left bg-gray-100 hover:bg-gray-200 rounded"
              onClick={() => applyBounds(fn(monitor))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
