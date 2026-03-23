import EditorSlider from "../components/EditorSlider";
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
      <EditorSlider
        label="투명도"
        min={40}
        max={100}
        value={Math.round(prefs.opacity * 100)}
        displayValue={`${Math.round(prefs.opacity * 100)}%`}
        onChange={(value) => updatePrefs({ opacity: value / 100 }).catch(console.error)}
        className="flex flex-col gap-1"
      />
      <EditorSlider
        label="글자 크기"
        min={14}
        max={40}
        value={prefs.fontSize}
        displayValue={`${prefs.fontSize}px`}
        onChange={(value) => updatePrefs({ fontSize: value }).catch(console.error)}
        className="flex flex-col gap-1"
      />
      <EditorSlider
        label="줄 간격"
        min={12}
        max={20}
        value={Math.round(prefs.lineHeight * 10)}
        displayValue={`${prefs.lineHeight}`}
        onChange={(value) => updatePrefs({ lineHeight: value / 10 }).catch(console.error)}
        className="flex flex-col gap-1"
      />
    </div>
  );
}
