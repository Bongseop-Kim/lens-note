import { usePrefsStore } from "../store/usePrefsStore";

export default function SettingsPopup({ onClose }: { onClose: () => void }) {
  const { prefs, updatePrefs } = usePrefsStore();

  return (
    <div
      className="absolute bottom-8 right-2 bg-gray-800 rounded shadow-xl p-4 flex flex-col gap-3 text-white text-sm w-56"
      style={{ pointerEvents: "auto" }}
    >
      <div className="flex justify-between items-center">
        <span>설정</span>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <label className="flex flex-col gap-1">
        <span>투명도 {Math.round(prefs.opacity * 100)}%</span>
        <input
          type="range"
          min={40}
          max={100}
          value={Math.round(prefs.opacity * 100)}
          onChange={(e) => updatePrefs({ opacity: parseInt(e.target.value) / 100 }).catch(console.error)}
          className="w-full"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>글자 크기 {prefs.fontSize}px</span>
        <input
          type="range"
          min={14}
          max={40}
          value={prefs.fontSize}
          onChange={(e) => updatePrefs({ fontSize: parseInt(e.target.value) }).catch(console.error)}
          className="w-full"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>줄 간격 {prefs.lineHeight}</span>
        <input
          type="range"
          min={12}
          max={20}
          value={Math.round(prefs.lineHeight * 10)}
          onChange={(e) => updatePrefs({ lineHeight: parseInt(e.target.value) / 10 }).catch(console.error)}
          className="w-full"
        />
      </label>
    </div>
  );
}
