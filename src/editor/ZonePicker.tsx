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

function getMonitorPresetId(monitor: MonitorInfo): string {
  return `${monitor.x}:${monitor.y}:${monitor.width}:${monitor.height}:${monitor.scaleFactor}`;
}

function selectionForOverlayBounds(
  overlay: Pick<
    ReturnType<typeof usePrefsStore.getState>["prefs"],
    "overlayX" | "overlayY" | "overlayWidth" | "overlayHeight"
  >,
  monitor: MonitorInfo,
  canvas: { width: number; height: number },
): DisplayRect | null {
  const inBounds =
    overlay.overlayWidth > 0 &&
    overlay.overlayHeight > 0 &&
    overlay.overlayX >= monitor.x &&
    overlay.overlayY >= monitor.y &&
    overlay.overlayX < monitor.x + monitor.width &&
    overlay.overlayY < monitor.y + monitor.height;

  if (!inBounds) {
    return null;
  }

  return clampDisplayRect(
    physicalBoundsToDisplayRect(
      {
        x: overlay.overlayX,
        y: overlay.overlayY,
        width: overlay.overlayWidth,
        height: overlay.overlayHeight,
      },
      monitor,
      canvas.width,
    ),
    canvas.width,
    canvas.height,
  );
}

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

      const rect = selectionForOverlayBounds(prefs, monitor, canvas);

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
        ...prefs.customPresets.filter((preset) => {
          if (preset.monitorId != null) {
            return preset.monitorId === getMonitorPresetId(m);
          }
          if (preset.monitorName != null) {
            return preset.monitorName === m.name;
          }
          return true;
        }),
      ]),
    [monitors, prefs.customPresets],
  );

  async function applySelectionForMonitor(
    rect: DisplayRect,
    currentMonitor: MonitorInfo,
    currentCanvas: { width: number; height: number; scale: number },
  ) {
    const bounds = displayRectToPhysicalBounds(rect, currentMonitor, currentCanvas.width);
    const { overlayX, overlayY, overlayWidth, overlayHeight } = usePrefsStore.getState().prefs;
    const previousBounds = { overlayX, overlayY, overlayWidth, overlayHeight };

    try {
      await invoke("set_overlay_bounds", {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
      await updatePrefs({
        overlayX: bounds.x,
        overlayY: bounds.y,
        overlayWidth: bounds.width,
        overlayHeight: bounds.height,
      });
    } catch (error) {
      console.error("applySelection: reverting overlay bounds", error);
      await invoke("set_overlay_bounds", {
        x: previousBounds.overlayX,
        y: previousBounds.overlayY,
        width: previousBounds.overlayWidth,
        height: previousBounds.overlayHeight,
      }).catch((revertError) => {
        console.error("applySelection: failed to revert backend overlay bounds", revertError);
      });
      await updatePrefs(previousBounds).catch((prefsError) => {
        console.error("applySelection: failed to restore prefs state", prefsError);
      });
      throw error;
    }
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
    const previousPrefs = usePrefsStore.getState().prefs;
    const rollbackRect = selectionForOverlayBounds(previousPrefs, currentMonitor, currentCanvas);
    const previousPresetKey = activePresetKey;

    setActiveMonitorIdx(monitorIdx);
    setSelectionByMonitor((previous) => ({ ...previous, [monitorIdx]: rect }));
    setActivePresetKey(`${monitorIdx}:${preset.id}`);
    void applySelectionForMonitor(rect, currentMonitor, currentCanvas).catch((error) => {
      setSelectionByMonitor((previous) => ({ ...previous, [monitorIdx]: rollbackRect }));
      setActivePresetKey(previousPresetKey);
      console.error("handlePresetSelect: restoring local selection", error);
    });
  }

  function handleMonitorSelect(monitorIdx: number) {
    setActiveMonitorIdx(monitorIdx);
  }

  function handleGridChange(rect: DisplayRect) {
    setSelectionByMonitor((previous) => ({ ...previous, [activeMonitorIdx]: rect }));
  }

  function handleGridCommit(rect: DisplayRect) {
    if (!monitor || !canvas) {
      return;
    }
    const previousPrefs = usePrefsStore.getState().prefs;
    const rollbackRect = selectionForOverlayBounds(previousPrefs, monitor, canvas);
    const previousPresetKey = activePresetKey;

    setActivePresetKey(null);
    void applySelectionForMonitor(rect, monitor, canvas).catch((error) => {
      setSelectionByMonitor((previous) => ({ ...previous, [activeMonitorIdx]: rollbackRect }));
      setActivePresetKey(previousPresetKey);
      console.error("handleGridCommit: restoring local selection", error);
    });
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
      monitorId: getMonitorPresetId(currentMonitor),
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

  function handleSetCollapsed(monitorIdx: number, isCollapsed: boolean) {
    setCollapsedByMonitor((previous) => ({
      ...previous,
      [monitorIdx]: isCollapsed,
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
        onSetCollapsed={handleSetCollapsed}
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
