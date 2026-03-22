export default function DragHandle() {
  return (
    <div
      data-tauri-drag-region
      className="h-6 w-full cursor-move select-none"
      style={{ pointerEvents: "auto" }}
    />
  );
}
