import { useEffect, useState } from "react";
import EditorSlider from "../components/EditorSlider";
import { HotkeyConfig } from "../types";
import { usePrefsStore } from "../store/usePrefsStore";
import { HOTKEY_LABELS, validateHotkey } from "../utils/hotkeys";

export default function Preferences() {
  const { prefs, updatePrefs } = usePrefsStore();
  const [hotkeyDrafts, setHotkeyDrafts] = useState<HotkeyConfig>(prefs.hotkeys);
  const [hotkeyErrors, setHotkeyErrors] = useState<Partial<Record<keyof HotkeyConfig, string>>>({});

  useEffect(() => {
    setHotkeyDrafts(prefs.hotkeys);
  }, [prefs.hotkeys]);

  const handleHotkeyChange = (key: keyof HotkeyConfig, value: string) => {
    setHotkeyDrafts((current) => ({ ...current, [key]: value }));

    const error = validateHotkey(value);
    setHotkeyErrors((current) => {
      if (!error) {
        const { [key]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [key]: error };
    });

    if (error) {
      return;
    }

    const normalized = value.trim();
    void updatePrefs({
      hotkeys: {
        ...prefs.hotkeys,
        [key]: normalized,
      },
    }).catch((saveError) => {
      console.error("Failed to save hotkey preference", saveError);
      setHotkeyErrors((current) => ({
        ...current,
        [key]: "단축키 저장에 실패했습니다.",
      }));
    });
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-md">
      <h2 className="text-lg font-semibold">환경설정</h2>

      <section className="flex flex-col gap-4">
        <h3 className="font-medium text-gray-700">표시</h3>
        <EditorSlider
          label="글자 크기"
          min={14}
          max={40}
          value={prefs.fontSize}
          displayValue={`${prefs.fontSize}px`}
          onChange={(value) => { updatePrefs({ fontSize: value }).catch(console.error); }}
        />
        <EditorSlider
          label="줄 간격"
          min={12}
          max={20}
          value={Math.round(prefs.lineHeight * 10)}
          displayValue={`${prefs.lineHeight}`}
          onChange={(value) => { updatePrefs({ lineHeight: value / 10 }).catch(console.error); }}
        />
        <EditorSlider
          label="기본 투명도"
          min={40}
          max={100}
          value={Math.round(prefs.opacity * 100)}
          displayValue={`${Math.round(prefs.opacity * 100)}%`}
          onChange={(value) => { updatePrefs({ opacity: value / 100 }).catch(console.error); }}
        />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.highlightCurrentParagraph}
            onChange={(e) => { updatePrefs({ highlightCurrentParagraph: e.target.checked }).catch(console.error); }} />
          <span>현재 단락 하이라이트</span>
        </label>
        <label className="flex items-center gap-2">
          <span>테마</span>
          <select value={prefs.theme} onChange={(e) => { updatePrefs({ theme: e.target.value as "dark" | "light" }).catch(console.error); }}>
            <option value="dark">다크</option>
            <option value="light">라이트</option>
          </select>
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium text-gray-700">단축키</h3>
        {(["next", "prev", "jump", "search", "toggle"] as const).map((key) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{HOTKEY_LABELS[key]}</span>
              <input
                className={`border rounded px-2 py-1 text-sm font-mono w-32 ${
                  hotkeyErrors[key] ? "border-red-500" : ""
                }`}
                value={hotkeyDrafts[key]}
                onChange={(e) => handleHotkeyChange(key, e.target.value)}
              />
            </label>
            {hotkeyErrors[key] && (
              <p className="text-xs text-red-600">{hotkeyErrors[key]}</p>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
