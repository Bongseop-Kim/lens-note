import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import {
  MonitorInfo,
  MINIMAP_DISPLAY_WIDTH,
  minimapScale,
  DisplayRect,
  displayRectToPhysicalBounds,
  clampDisplayRect,
} from "../utils/zonePickerMath";
import { usePrefsStore } from "../store/usePrefsStore";

const HANDLE_HIT = 10; // px radius around corner that triggers resize

const CORNER_CURSORS: Record<Corner, string> = {
  tl: "nw-resize", tr: "ne-resize", bl: "sw-resize", br: "se-resize",
};

type Corner = "tl" | "tr" | "bl" | "br";

type DragState =
  | { type: "create"; ox: number; oy: number }
  | { type: "move"; offX: number; offY: number }
  | { type: "resize"; anchorX: number; anchorY: number };

function nearCorner(px: number, py: number, r: DisplayRect): Corner | null {
  const corners: Array<[Corner, number, number]> = [
    ["tl", r.x,       r.y],
    ["tr", r.x + r.w, r.y],
    ["bl", r.x,       r.y + r.h],
    ["br", r.x + r.w, r.y + r.h],
  ];
  for (const [corner, cx, cy] of corners) {
    if (Math.abs(px - cx) <= HANDLE_HIT && Math.abs(py - cy) <= HANDLE_HIT) {
      return corner;
    }
  }
  return null;
}

function insideRect(px: number, py: number, r: DisplayRect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function anchorForCorner(corner: Corner, r: DisplayRect): { anchorX: number; anchorY: number } {
  return {
    anchorX: corner.includes("l") ? r.x + r.w : r.x,
    anchorY: corner.includes("t") ? r.y + r.h : r.y,
  };
}

export default function ZonePicker() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [activeMonitorIdx, setActiveMonitorIdx] = useState(0);
  const [selection, setSelection] = useState<DisplayRect | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverCursor, setHoverCursor] = useState("crosshair");
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    invoke<MonitorInfo[]>("get_monitors").then(setMonitors).catch(console.error);
  }, []);

  const monitor = monitors[activeMonitorIdx];

  function getMapXY(e: React.MouseEvent): { x: number; y: number } | null {
    if (!mapRef.current) return null;
    const rect = mapRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function applySelection(r: DisplayRect) {
    if (!monitor) return;
    const bounds = displayRectToPhysicalBounds(r, monitor);
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

  function finalizeDrag() {
    if (selection && selection.w > 2 && selection.h > 2) {
      applySelection(selection);
    }
    setDrag(null);
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const pt = getMapXY(e);
    if (!pt || !monitor) return;

    if (selection) {
      const corner = nearCorner(pt.x, pt.y, selection);
      if (corner) {
        setDrag({ type: "resize", ...anchorForCorner(corner, selection) });
        return;
      }
      if (insideRect(pt.x, pt.y, selection)) {
        setDrag({ type: "move", offX: pt.x - selection.x, offY: pt.y - selection.y });
        return;
      }
    }
    setDrag({ type: "create", ox: pt.x, oy: pt.y });
    setSelection({ x: pt.x, y: pt.y, w: 0, h: 0 });
  }

  function handleMouseMove(e: React.MouseEvent) {
    const pt = getMapXY(e);
    if (!pt) return;

    if (!drag) {
      if (selection) {
        const corner = nearCorner(pt.x, pt.y, selection);
        const next = corner ? CORNER_CURSORS[corner] : insideRect(pt.x, pt.y, selection) ? "move" : "crosshair";
        if (next !== hoverCursor) setHoverCursor(next);
      }
      return;
    }

    if (!monitor) return;
    const scale = minimapScale(monitor);
    const mapW = MINIMAP_DISPLAY_WIDTH;
    const mapH = Math.round(monitor.height * scale);

    if (drag.type === "create") {
      setSelection(clampDisplayRect({
        x: Math.min(drag.ox, pt.x),
        y: Math.min(drag.oy, pt.y),
        w: Math.abs(pt.x - drag.ox),
        h: Math.abs(pt.y - drag.oy),
      }, mapW, mapH));
    } else if (drag.type === "move" && selection) {
      setSelection(clampDisplayRect({
        x: pt.x - drag.offX,
        y: pt.y - drag.offY,
        w: selection.w,
        h: selection.h,
      }, mapW, mapH));
    } else if (drag.type === "resize") {
      setSelection(clampDisplayRect({
        x: Math.min(drag.anchorX, pt.x),
        y: Math.min(drag.anchorY, pt.y),
        w: Math.abs(pt.x - drag.anchorX),
        h: Math.abs(pt.y - drag.anchorY),
      }, mapW, mapH));
    }
  }

  function mapCursor(): string {
    if (drag) {
      if (drag.type === "move") return "move";
      if (drag.type === "resize") return "nwse-resize";
    }
    return hoverCursor;
  }

  if (!monitor) {
    return <div className="p-4 text-muted-foreground text-sm">모니터 정보를 불러오는 중...</div>;
  }

  const scale = minimapScale(monitor);
  const mapH = Math.round(monitor.height * scale);
  const bounds = selection ? displayRectToPhysicalBounds(selection, monitor) : null;

  return (
    <div className="p-5 flex flex-col gap-4 max-w-xs">
      <p className="text-xs text-muted-foreground">
        모서리를 드래그해 크기 조절 · 내부를 드래그해 위치 이동
      </p>

      {monitors.length > 1 && (
        <div className="flex gap-1">
          {monitors.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setActiveMonitorIdx(i); setSelection(null); setDrag(null); }}
              className={`h-[22px] px-2.5 text-xs rounded-md font-medium border transition-colors ${
                i === activeMonitorIdx
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "bg-transparent text-muted-foreground border-border hover:bg-accent"
              }`}
            >
              {m.name || `모니터 ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className="border border-border rounded-md overflow-hidden">
        <div
          ref={mapRef}
          className="relative bg-zinc-900 select-none"
          style={{ width: MINIMAP_DISPLAY_WIDTH, height: mapH, cursor: mapCursor() }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={finalizeDrag}
          onMouseLeave={finalizeDrag}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
              backgroundSize: `${Math.round(MINIMAP_DISPLAY_WIDTH / 12)}px ${Math.round(mapH / 8)}px`,
            }}
          />

          <div
            className="absolute top-1.5 pointer-events-none text-zinc-600 flex justify-center"
            style={{ left: MINIMAP_DISPLAY_WIDTH / 2 - 6 }}
          >
            <Camera size={12} />
          </div>

          <div className="absolute bottom-1 right-1.5 text-[9px] font-mono text-zinc-600 pointer-events-none">
            {monitor.width}×{monitor.height}
          </div>

          {selection && selection.w > 0 && selection.h > 0 && (
            <div
              className="absolute border-[1.5px] border-amber-400 bg-amber-400/15 pointer-events-none"
              style={{ left: selection.x, top: selection.y, width: selection.w, height: selection.h }}
            >
              {(["tl", "tr", "bl", "br"] as Corner[]).map((c) => (
                <div
                  key={c}
                  className="absolute w-2 h-2 bg-amber-400 rounded-[2px]"
                  style={{
                    left:   c.includes("l") ? -4 : undefined,
                    right:  c.includes("r") ? -4 : undefined,
                    top:    c.includes("t") ? -4 : undefined,
                    bottom: c.includes("b") ? -4 : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="px-2.5 py-2 border-t border-border text-[10px] font-mono text-muted-foreground">
          {bounds
            ? `X: ${Math.round(bounds.x / monitor.scaleFactor)}  Y: ${Math.round(bounds.y / monitor.scaleFactor)}  W: ${Math.round(bounds.width / monitor.scaleFactor)}  H: ${Math.round(bounds.height / monitor.scaleFactor)}  (논리px)`
            : `${monitor.width}×${monitor.height}`}
        </div>
      </div>
    </div>
  );
}
