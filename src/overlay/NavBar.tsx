import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { useCardStore } from "../store/useCardStore";

export default function NavBar({
  onSettings,
}: {
  onSettings: () => void;
}) {
  const { cards, currentIndex, setCurrentIndex } = useCardStore();
  const total = cards.length;
  const card = cards[currentIndex];

  function prev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }
  function next() {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  }

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 text-white/80 text-xs"
      style={{ pointerEvents: "auto" }}
    >
      <button type="button" onClick={prev} className="hover:text-white disabled:opacity-30" disabled={currentIndex === 0}>
        <ChevronLeft size={14} />
      </button>
      <span className="flex-1 text-center truncate">
        {total > 0 ? `${currentIndex + 1} / ${total}  ${card?.title ?? ""}` : "카드 없음"}
      </span>
      <button type="button" onClick={next} className="hover:text-white disabled:opacity-30" disabled={currentIndex >= total - 1}>
        <ChevronRight size={14} />
      </button>
      <button type="button" onClick={onSettings} className="hover:text-white ml-1">
        <Settings size={12} />
      </button>
    </div>
  );
}
