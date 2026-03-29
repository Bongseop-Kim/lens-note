import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import type { ZonePreset } from "../types";
import type { MonitorInfo } from "../utils/zonePickerMath";

interface PresetPanelProps {
  monitors: MonitorInfo[];
  presetsByMonitor: ZonePreset[][];
  activeMonitorIdx: number;
  activePresetKey: string | null;
  collapsedByMonitor: Record<number, boolean>;
  onMonitorSelect: (monitorIdx: number) => void;
  onSelect: (monitorIdx: number, preset: ZonePreset) => void;
  onAdd: (monitorIdx: number, label: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: (monitorIdx: number) => void;
  onSetCollapsed: (monitorIdx: number, isCollapsed: boolean) => void;
}

function monitorOrientationLabel(monitor: MonitorInfo): string {
  return monitor.height > monitor.width ? "Vertical" : "Horizontal";
}

function monitorDisplayLabel(monitor: MonitorInfo, monitorIdx: number): string {
  return monitor.name.trim().length > 0 ? monitor.name : `모니터 ${monitorIdx + 1}`;
}

function PresetThumbnail({
  preset,
  isActive,
}: {
  preset: ZonePreset;
  isActive: boolean;
}) {
  return (
    <div
      className={`relative h-5 w-8 shrink-0 overflow-hidden rounded-md border ${
        isActive
          ? "border-foreground/25 bg-foreground/[0.08]"
          : "border-border/80 bg-muted/50"
      }`}
    >
      <div
        className="absolute rounded-sm bg-primary"
        style={{
          left: `${preset.x * 100}%`,
          top: `${preset.y * 100}%`,
          width: `${preset.w * 100}%`,
          height: `${preset.h * 100}%`,
        }}
      />
    </div>
  );
}

export default function PresetPanel({
  monitors,
  presetsByMonitor,
  activeMonitorIdx,
  activePresetKey,
  collapsedByMonitor,
  onMonitorSelect,
  onSelect,
  onAdd,
  onDelete,
  onToggleCollapse,
  onSetCollapsed,
}: PresetPanelProps) {
  const [addingForMonitor, setAddingForMonitor] = useState<number | null>(null);
  const [addLabel, setAddLabel] = useState("");

  function submitAdd(monitorIdx: number) {
    const label = addLabel.trim();
    if (label) {
      onAdd(monitorIdx, label);
    }
    setAddingForMonitor(null);
    setAddLabel("");
  }

  function cancelAdd() {
    setAddingForMonitor(null);
    setAddLabel("");
  }

  return (
    <div className="flex w-48 shrink-0 flex-col overflow-y-auto border-r border-border bg-muted/20">
      {monitors.map((monitor, idx) => {
        const presets = presetsByMonitor[idx] ?? [];
        const builtIns = presets.filter((preset) => preset.builtIn);
        const customs = presets.filter((preset) => !preset.builtIn);
        const isCollapsed = collapsedByMonitor[idx] ?? false;

        return (
          <div key={`${monitor.name}-${idx}`}>
            <div className="flex items-center gap-1 border-b border-border/80 px-3 py-2">
              <button
                type="button"
                onClick={() => onMonitorSelect(idx)}
                className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded px-1 py-0.5 text-left transition-colors ${
                  activeMonitorIdx === idx ? "bg-accent text-foreground" : "text-foreground hover:bg-accent/80"
                }`}
              >
                <span className="truncate text-xs font-semibold">
                  {monitorDisplayLabel(monitor, idx)}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {monitorOrientationLabel(monitor)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onToggleCollapse(idx)}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={isCollapsed ? "모니터 섹션 펼치기" : "모니터 섹션 접기"}
                title={isCollapsed ? "모니터 섹션 펼치기" : "모니터 섹션 접기"}
              >
                <span className="sr-only">
                  {isCollapsed ? "모니터 섹션 펼치기" : "모니터 섹션 접기"}
                </span>
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSetCollapsed(idx, false);
                  setAddingForMonitor(idx);
                  setAddLabel("");
                }}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="프리셋 추가"
                title="프리셋 추가"
              >
                <span className="sr-only">프리셋 추가</span>
                <Plus size={12} />
              </button>
            </div>

            {!isCollapsed && (
              <div className="flex flex-col pb-1">
                {builtIns.map((preset) => {
                  const isActive = activePresetKey === `${idx}:${preset.id}`;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelect(idx, preset)}
                      className={`flex items-center gap-2.5 border-l-[3px] px-3 py-1.5 text-left text-xs transition-colors ${
                        isActive
                          ? "border-l-foreground bg-accent text-foreground"
                          : "border-l-transparent text-foreground hover:bg-accent/80"
                      }`}
                    >
                      <PresetThumbnail preset={preset} isActive={isActive} />
                      <span className="truncate">{preset.label}</span>
                    </button>
                  );
                })}

                {builtIns.length > 0 && customs.length > 0 && (
                  <div className="mx-3 my-1 h-px bg-border" />
                )}

                {customs.map((preset) => {
                  const isActive = activePresetKey === `${idx}:${preset.id}`;
                  return (
                    <div
                      key={preset.id}
                      className={`group flex items-center ${
                        isActive ? "border-l-[3px] border-l-foreground bg-accent" : "border-l-[3px] border-l-transparent hover:bg-accent/80"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelect(idx, preset)}
                        className="flex flex-1 items-center gap-2.5 px-3 py-1.5 text-left text-xs text-foreground"
                      >
                        <PresetThumbnail preset={preset} isActive={isActive} />
                        <span className="truncate">{preset.label}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(preset.id)}
                        className={`mr-2 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                          isActive
                            ? "text-background/80 hover:bg-background/10 hover:text-background"
                            : "text-destructive hover:bg-destructive/20"
                        }`}
                        aria-label={`프리셋 삭제: ${preset.label}`}
                        title={`프리셋 삭제: ${preset.label}`}
                      >
                        <span className="sr-only">{`프리셋 삭제: ${preset.label}`}</span>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                })}

                {addingForMonitor === idx && (
                  <form
                    className="flex items-center gap-1 px-3 py-1.5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      submitAdd(idx);
                    }}
                  >
                    <input
                      autoFocus
                      type="text"
                      value={addLabel}
                      onChange={(event) => setAddLabel(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          cancelAdd();
                        }
                      }}
                      placeholder="이름"
                      className="flex-1 rounded border border-input bg-background px-2 py-0.5 text-xs text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <button
                      type="submit"
                      className="text-xs font-medium text-foreground transition-colors hover:text-muted-foreground"
                    >
                      저장
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
