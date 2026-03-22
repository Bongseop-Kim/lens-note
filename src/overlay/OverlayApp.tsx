import DragHandle from "./DragHandle";

export default function OverlayApp() {
  return (
    <div className="w-full h-screen flex flex-col bg-black/80 text-white select-none">
      <DragHandle />
      <div className="flex-1 p-3 overflow-hidden">
        <p className="text-lg">Overlay ready</p>
      </div>
      <div className="flex gap-2 p-2">
        <button className="px-3 py-1 bg-white/20 rounded text-sm">← Prev</button>
        <button className="px-3 py-1 bg-white/20 rounded text-sm">Next →</button>
      </div>
    </div>
  );
}
