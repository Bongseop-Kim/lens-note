import { useEffect, useRef } from "react";
import { usePrefsStore } from "../store/usePrefsStore";

interface Props {
  paragraphs: string[];
  activeIndex: number;
  cardTitle: string;
  cardPosition: string;
}

export default function CardDisplay({ paragraphs, activeIndex, cardTitle, cardPosition }: Props) {
  const { prefs } = usePrefsStore();
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    paragraphRefs.current[activeIndex]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeIndex]);

  if (paragraphs.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-sm text-white/45">
        Editor에서 카드 큐를 준비하면 여기에서 바로 읽을 수 있습니다.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-3 py-2 text-white/72">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{cardTitle || "제목 없는 카드"}</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/45">
              {cardPosition}
            </p>
          </div>
          <div className="h-2 w-2 rounded-full bg-white/35" />
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-3 py-3"
        style={{
          fontSize: `${prefs.fontSize}px`,
          lineHeight: prefs.lineHeight,
          color: "#f5f5f5",
        }}
      >
        {paragraphs.map((p, i) => (
          <p
            key={`para-${i}`}
            ref={(el) => { paragraphRefs.current[i] = el; }}
            className={`mb-3 rounded px-2 py-1 transition-colors ${
              prefs.highlightCurrentParagraph && i === activeIndex
                ? "bg-white/10"
                : ""
            }`}
          >
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
