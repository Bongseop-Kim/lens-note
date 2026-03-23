import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import DragHandle from "./DragHandle";
import { usePrefsStore } from "../store/usePrefsStore";

export default function OverlayApp() {
  const dragLocked = usePrefsStore((state) => state.prefs.dragLocked);
  const updatePrefs = usePrefsStore((state) => state.updatePrefs);

  useEffect(() => {
    usePrefsStore.getState().hydrate().catch(console.error);
  }, []);

  useEffect(() => {
    void getCurrentWindow().setResizable(!dragLocked).catch(console.error);
  }, [dragLocked]);

  return (
    <div
      className="w-full h-screen flex flex-col bg-black/80 text-white select-none"
      style={{ pointerEvents: "none" }}
    >
      <DragHandle dragLocked={dragLocked} />
      <div className="flex-1 p-3 overflow-hidden">
        <p className="text-lg">Overlay ready</p>
      </div>
      <div className="flex gap-2 p-2" style={{ pointerEvents: "auto" }}>
        <button
          className="px-2 py-1 bg-white/20 rounded text-sm"
          onClick={() => {
            updatePrefs({ dragLocked: !dragLocked }).catch(console.error);
          }}
          style={{ pointerEvents: "auto" }}
          type="button"
        >
          {dragLocked ? "🔒" : "🔓"}
        </button>
        <button className="px-3 py-1 bg-white/20 rounded text-sm">← Prev</button>
        <button className="px-3 py-1 bg-white/20 rounded text-sm">Next →</button>
      </div>
    </div>
  );
}
