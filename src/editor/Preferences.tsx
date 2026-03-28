import EditorSlider from "../components/EditorSlider";
import { usePrefsStore } from "../store/usePrefsStore";
import HotkeySection from "../components/HotkeySection";

export default function Preferences() {
  const { prefs, updatePrefs } = usePrefsStore();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="space-y-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Display Controls
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              읽기 속도에 맞게 오버레이를 조정합니다.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              폰트 크기, 줄 간격, 투명도와 단축키를 현재 인터뷰 환경에 맞춰 조정합니다.
            </p>
          </div>

          <section className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">표시</span>
              <div className="flex-1 h-px bg-border" />
            </div>
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
            className="rounded border-border text-foreground focus:ring-ring focus:ring-offset-0"
            onChange={(e) => { updatePrefs({ highlightCurrentParagraph: e.target.checked }).catch(console.error); }} />
          <span>현재 단락 하이라이트</span>
        </label>
        <label className="flex items-center gap-2">
          <span>테마</span>
          <select value={prefs.theme} className="border border-input rounded-md px-2 py-1 text-sm bg-background text-foreground focus:outline-none focus:border-ring" onChange={(e) => { updatePrefs({ theme: e.target.value as "dark" | "light" }).catch(console.error); }}>
            <option value="dark">다크</option>
            <option value="light">라이트</option>
          </select>
        </label>
          </section>

          <HotkeySection />
        </section>

        <aside className="h-fit rounded-3xl border border-border bg-muted/30 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Preview
          </p>
          <div
            className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black"
            style={{ opacity: Math.max(prefs.opacity, 0.55) }}
          >
            <div className="border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-[0.22em] text-white/55">
              Overlay Reading Surface
            </div>
            <div
              className="space-y-3 px-4 py-4 text-white"
              style={{ fontSize: `${Math.max(14, prefs.fontSize - 4)}px`, lineHeight: prefs.lineHeight }}
            >
              <p className={prefs.highlightCurrentParagraph ? "rounded bg-white/10 px-2 py-1" : ""}>
                안녕하세요. 저는 구조를 빠르게 정리하는 프론트엔드 개발자입니다.
              </p>
              <p className="text-white/70">
                최근에는 운영 화면과 편집 흐름의 복잡도를 줄이는 작업에 집중했습니다.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <p>현재 설정은 editor와 overlay 모두에 바로 반영됩니다.</p>
            <p>면접 전에는 폰트 크기와 검색 단축키만 우선 맞추는 편이 안정적입니다.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
