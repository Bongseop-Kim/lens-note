import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePrefsStore } from "../store/usePrefsStore";
import type { ZonePreset } from "../types";
import GridCanvas from "./GridCanvas";
import PresetPanel from "./PresetPanel";
import {
  type DisplayRect,
  type MonitorInfo,
  MINIMAP_DISPLAY_WIDTH,
  MINIMAP_MAX_DISPLAY_HEIGHT,
  clampDisplayRect,
  displayRectToPhysicalBounds,
  physicalBoundsToDisplayRect,
  placementCanvasSize,
} from "../utils/zonePickerMath";
import {
  calcGridDimensions,
  displayRectToPresetRatio,
  presetRatioToDisplayRect,
} from "../utils/gridMath";
import { BUILT_IN_PRESETS } from "../utils/presets";

export default function ZonePicker() {
  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeMonitorIdx, setActiveMonitorIdx] = useState(0);
  const [selectionByMonitor, setSelectionByMonitor] = useState<
    Record<number, DisplayRect | null>
  >({});
  const [activePresetKey, setActivePresetKey] = useState<string | null>(null);
  const [collapsedByMonitor, setCollapsedByMonitor] = useState<
    Record<number, boolean>
  >({});
  const { prefs, updatePrefs } = usePrefsStore();

  useEffect(() => {
    invoke<MonitorInfo[]>("get_monitors")
      .then((result) => {
        setMonitors(result);
        setIsLoading(false);
      })
      .catch((error) => {
        setFetchError(String(error));
        setIsLoading(false);
      });
  }, []);

  const monitor = monitors[activeMonitorIdx];
  const canvas = monitor
    ? placementCanvasSize(monitor, MINIMAP_DISPLAY_WIDTH, MINIMAP_MAX_DISPLAY_HEIGHT)
    : null;

  useEffect(() => {
    if (!monitor || !canvas) {
      return;
    }

    setSelectionByMonitor((previous) => {
      if (Object.prototype.hasOwnProperty.call(previous, activeMonitorIdx)) {
        return previous;
      }

      const inBounds =
        prefs.overlayWidth > 0 &&
        prefs.overlayHeight > 0 &&
        prefs.overlayX >= monitor.x &&
        prefs.overlayY >= monitor.y &&
        prefs.overlayX < monitor.x + monitor.width &&
        prefs.overlayY < monitor.y + monitor.height;

      if (!inBounds) {
        return { ...previous, [activeMonitorIdx]: null };
      }

      const rect = clampDisplayRect(
        physicalBoundsToDisplayRect(
          {
            x: prefs.overlayX,
            y: prefs.overlayY,
            width: prefs.overlayWidth,
            height: prefs.overlayHeight,
          },
          monitor,
          canvas.width,
        ),
        canvas.width,
        canvas.height,
      );

      return { ...previous, [activeMonitorIdx]: rect };
    });
  }, [
    activeMonitorIdx,
    canvas,
    monitor,
    prefs.overlayHeight,
    prefs.overlayWidth,
    prefs.overlayX,
    prefs.overlayY,
  ]);

  const presetsByMonitor = useMemo<ZonePreset[][]>(
    () =>
      monitors.map((m) => [
        ...BUILT_IN_PRESETS,
        ...prefs.customPresets.filter((p) => !p.monitorName || p.monitorName === m.name),
      ]),
    [monitors, prefs.customPresets],
  );

  function applySelectionForMonitor(
    rect: DisplayRect,
    currentMonitor: MonitorInfo,
    currentCanvas: { width: number; height: number; scale: number },
  ) {
    const bounds = displayRectToPhysicalBounds(rect, currentMonitor, currentCanvas.width);
    const { overlayX, overlayY, overlayWidth, overlayHeight } =
      usePrefsStore.getState().prefs;

    invoke("set_overlay_bounds", {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    })
      .then(() =>
        updatePrefs({
          overlayX: bounds.x,
          overlayY: bounds.y,
          overlayWidth: bounds.width,
          overlayHeight: bounds.height,
        }),
      )
      .catch((error) => {
        console.error("applySelection: reverting overlay bounds", error);
        invoke("set_overlay_bounds", {
          x: overlayX,
          y: overlayY,
          width: overlayWidth,
          height: overlayHeight,
        }).catch(console.error);
      });
  }

  function handlePresetSelect(monitorIdx: number, preset: ZonePreset) {
    const currentMonitor = monitors[monitorIdx];
    if (!currentMonitor) {
      return;
    }

    const currentCanvas = placementCanvasSize(
      currentMonitor,
      MINIMAP_DISPLAY_WIDTH,
      MINIMAP_MAX_DISPLAY_HEIGHT,
    );
    const { cols, rows } = calcGridDimensions(currentMonitor.width, currentMonitor.height);
    const rect = presetRatioToDisplayRect(
      preset.x,
      preset.y,
      preset.w,
      preset.h,
      cols,
      rows,
      currentCanvas.width,
      currentCanvas.height,
    );

    setActiveMonitorIdx(monitorIdx);
    setSelectionByMonitor((previous) => ({ ...previous, [monitorIdx]: rect }));
    setActivePresetKey(`${monitorIdx}:${preset.id}`);
    applySelectionForMonitor(rect, currentMonitor, currentCanvas);
  }

  function handleMonitorSelect(monitorIdx: number) {
    setActiveMonitorIdx(monitorIdx);
  }

  function handleGridChange(rect: DisplayRect) {
    setSelectionByMonitor((previous) => ({ ...previous, [activeMonitorIdx]: rect }));
  }

  function handleGridCommit(rect: DisplayRect) {
    setActivePresetKey(null);
    if (!monitor || !canvas) {
      return;
    }

    applySelectionForMonitor(rect, monitor, canvas);
  }

  function handleAddPreset(monitorIdx: number, label: string) {
    const selection = selectionByMonitor[monitorIdx];
    const currentMonitor = monitors[monitorIdx];
    if (!selection || !currentMonitor) {
      return;
    }

    const currentCanvas = placementCanvasSize(
      currentMonitor,
      MINIMAP_DISPLAY_WIDTH,
      MINIMAP_MAX_DISPLAY_HEIGHT,
    );
    const { cols, rows } = calcGridDimensions(currentMonitor.width, currentMonitor.height);
    const ratio = displayRectToPresetRatio(
      selection,
      cols,
      rows,
      currentCanvas.width,
      currentCanvas.height,
    );

    const newPreset: ZonePreset = {
      id: crypto.randomUUID(),
      label,
      ...ratio,
      builtIn: false,
      monitorName: currentMonitor.name,
    };

    updatePrefs({
      customPresets: [...prefs.customPresets, newPreset],
    }).catch(console.error);
  }

  function handleDeletePreset(id: string) {
    updatePrefs({
      customPresets: prefs.customPresets.filter((preset) => preset.id !== id),
    }).catch(console.error);

    setActivePresetKey((current) => {
      if (!current) {
        return current;
      }
      return current.endsWith(`:${id}`) ? null : current;
    });
  }

  function handleToggleCollapse(monitorIdx: number) {
    setCollapsedByMonitor((previous) => ({
      ...previous,
      [monitorIdx]: !(previous[monitorIdx] ?? false),
    }));
  }

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">모니터 정보를 불러오는 중...</div>;
  }

  if (fetchError) {
    return (
      <div className="p-4 text-sm text-destructive">
        모니터 정보를 불러오지 못했습니다: {fetchError}
      </div>
    );
  }

  if (!monitor || !canvas) {
    return <div className="p-4 text-sm text-muted-foreground">연결된 모니터가 없습니다.</div>;
  }

  const selection = selectionByMonitor[activeMonitorIdx] ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      <PresetPanel
        monitors={monitors}
        presetsByMonitor={presetsByMonitor}
        activeMonitorIdx={activeMonitorIdx}
        activePresetKey={activePresetKey}
        collapsedByMonitor={collapsedByMonitor}
        onMonitorSelect={handleMonitorSelect}
        onSelect={handlePresetSelect}
        onAdd={handleAddPreset}
        onDelete={handleDeletePreset}
        onToggleCollapse={handleToggleCollapse}
      />
      <div className="flex flex-1 items-center justify-center overflow-auto bg-muted/20 p-6">
        <GridCanvas
          monitor={monitor}
          canvas={canvas}
          value={selection}
          onChange={handleGridChange}
          onCommit={handleGridCommit}
        />
      </div>
    </div>
  );
}
