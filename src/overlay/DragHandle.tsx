import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export default function DragHandle() {
  async function handleMouseDown() {
    await appWindow.startDragging();
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="h-6 w-full cursor-move select-none"
    />
  );
}
