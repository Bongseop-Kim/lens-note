import EditorSlider from "../components/EditorSlider";
import { Highlighter, MoonStar } from "lucide-react";
import { usePrefsStore } from "../store/usePrefsStore";
import HotkeySection from "../components/HotkeySection";

export default function Preferences() {
  const { prefs, updatePrefs } = usePrefsStore();

  return (
    <div className="p-6">
      <div className="flex max-w-md flex-col gap-6">
        <section className="space-y-6">
          <section className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                표시
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <EditorSlider
              label="크기"
              min={14}
              max={40}
              value={prefs.fontSize}
              displayValue={`${prefs.fontSize}px`}
              onChange={(value) => {
                updatePrefs({ fontSize: value }).catch(console.error);
              }}
            />
            <EditorSlider
              label="간격"
              min={12}
              max={20}
              value={Math.round(prefs.lineHeight * 10)}
              displayValue={`${prefs.lineHeight}`}
              onChange={(value) => {
                updatePrefs({ lineHeight: value / 10 }).catch(console.error);
              }}
            />
            <EditorSlider
              label="투명"
              min={40}
              max={100}
              value={Math.round(prefs.opacity * 100)}
              displayValue={`${Math.round(prefs.opacity * 100)}%`}
              onChange={(value) => {
                updatePrefs({ opacity: value / 100 }).catch(console.error);
              }}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={prefs.highlightCurrentParagraph}
                className="rounded border-border text-foreground focus:ring-ring focus:ring-offset-0"
                onChange={(e) => {
                  updatePrefs({
                    highlightCurrentParagraph: e.target.checked,
                  }).catch(console.error);
                }}
              />
              <span className="inline-flex items-center gap-2">
                <Highlighter size={14} className="text-muted-foreground" />
                하이라이트
              </span>
            </label>
            <label className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2">
                <MoonStar size={14} className="text-muted-foreground" />
                테마
              </span>
              <select
                value={prefs.theme}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onChange={(e) => {
                  updatePrefs({
                    theme: e.target.value as "system" | "dark" | "light",
                  }).catch(console.error);
                }}
              >
                <option value="system">시스템</option>
                <option value="dark">다크</option>
                <option value="light">라이트</option>
              </select>
            </label>
          </section>

          <HotkeySection />
        </section>
      </div>
    </div>
  );
}
