import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import { useEffect, useRef, useState } from "react";

export default function CardDisplay() {
  const { cards, currentIndex } = useCardStore();
  const { prefs } = usePrefsStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const card = cards[currentIndex];
  const [activeIndex, setActiveIndex] = useState(0);
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  const paragraphs = card ? card.body.split("\n").filter((p) => p.trim()) : [];

  // 카드 전환 시 스크롤 상단으로 (PRD F-03)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setActiveIndex(0);
    paragraphRefs.current = [];
  }, [currentIndex]);

  useEffect(() => {
    const observers = paragraphRefs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(i);
          }
        },
        { threshold: 0.5, root: scrollRef.current }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((obs) => obs?.disconnect());
  }, [currentIndex, paragraphs.length]);

  if (!card) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        카드가 없습니다. Editor에서 카드를 추가하세요.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-3 py-2"
      style={{
        fontSize: `${prefs.fontSize}px`,
        lineHeight: prefs.lineHeight,
        color: prefs.theme === "dark" ? "#f5f5f5" : "#1a1a1a",
      }}
    >
      {paragraphs.map((p, i) => (
        <p
          key={i}
          ref={(el) => { paragraphRefs.current[i] = el; }}
          className={`mb-3 px-1 rounded transition-colors ${
            prefs.highlightCurrentParagraph && i === activeIndex
              ? "bg-white/10"
              : ""
          }`}
        >
          {p}
        </p>
      ))}
    </div>
  );
}
