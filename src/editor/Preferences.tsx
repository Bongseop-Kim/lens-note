import { usePrefsStore } from "../store/usePrefsStore";

export default function Preferences() {
  const { prefs, updatePrefs } = usePrefsStore();

  return (
    <div className="p-6 flex flex-col gap-6 max-w-md">
      <h2 className="text-lg font-semibold">환경설정</h2>

      <section className="flex flex-col gap-4">
        <h3 className="font-medium text-gray-700">표시</h3>
        <label className="flex items-center justify-between">
          <span>글자 크기 ({prefs.fontSize}px)</span>
          <input type="range" min={14} max={40} value={prefs.fontSize}
            onChange={(e) => { updatePrefs({ fontSize: +e.target.value }).catch(console.error); }} />
        </label>
        <label className="flex items-center justify-between">
          <span>줄 간격 ({prefs.lineHeight})</span>
          <input type="range" min={12} max={20} value={Math.round(prefs.lineHeight * 10)}
            onChange={(e) => { updatePrefs({ lineHeight: +e.target.value / 10 }).catch(console.error); }} />
        </label>
        <label className="flex items-center justify-between">
          <span>기본 투명도 ({Math.round(prefs.opacity * 100)}%)</span>
          <input type="range" min={40} max={100} value={Math.round(prefs.opacity * 100)}
            onChange={(e) => { updatePrefs({ opacity: +e.target.value / 100 }).catch(console.error); }} />
        </label>
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
          <label key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{{ next: "다음 카드", prev: "이전 카드", jump: "번호로 이동", search: "검색", toggle: "오버레이 토글" }[key]}</span>
            <input
              className="border rounded px-2 py-1 text-sm font-mono w-32"
              value={prefs.hotkeys[key]}
              onChange={(e) => { updatePrefs({ hotkeys: { ...prefs.hotkeys, [key]: e.target.value } }).catch(console.error); }}
            />
          </label>
        ))}
      </section>
    </div>
  );
}
