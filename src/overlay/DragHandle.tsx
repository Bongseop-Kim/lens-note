import { getCurrentWindow } from "@tauri-apps/api/window";
import type { MouseEvent } from "react";

interface DragHandleProps {
  dragLocked: boolean;
}

export default function DragHandle({ dragLocked }: DragHandleProps) {
  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (dragLocked || event.button !== 0) {
      return;
    }

    void getCurrentWindow().startDragging().catch(console.error);
  };

  return (
    <div
      className={`h-6 w-full select-none ${dragLocked ? "cursor-default" : "cursor-move"}`}
      onMouseDown={handleMouseDown}
      style={{ pointerEvents: dragLocked ? "none" : "auto" }}
    />
  );
}
