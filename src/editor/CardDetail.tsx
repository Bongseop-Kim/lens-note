import { useEffect, useRef, useState } from "react";
import { useCardStore } from "../store/useCardStore";
import { Trash2 } from "lucide-react";

export default function CardDetail({
  cardId,
  onDelete,
}: {
  cardId: string;
  onDelete?: () => void;
}) {
  const { cards, updateCard, deleteCard } = useCardStore();
  const card = cards.find((c) => c.id === cardId);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const pendingSaveRef = useRef<Promise<void> | null>(null);

  // 다른 카드로 전환할 때만 로컬 상태 리셋 (card 객체 변경 시는 무시 — 편집 중 덮어쓰기 방지)
  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setBody(card.body);
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  if (!card) return null;

  function handleSave() {
    if (!isDirty) return;
    const promise = updateCard(cardId, { title, body })
      .then(() => { setIsDirty(false); })
      .catch((err) => { console.error("Failed to save card:", err); })
      .finally(() => { if (pendingSaveRef.current === promise) pendingSaveRef.current = null; });
    pendingSaveRef.current = promise;
  }

  async function handleDelete() {
    if (!window.confirm("이 카드를 삭제할까요?")) return;
    // 진행 중인 저장이 있으면 완료 후 삭제
    if (pendingSaveRef.current) await pendingSaveRef.current;
    await deleteCard(cardId);
    onDelete?.();
  }

  return (
    <div className="flex flex-col gap-3 p-5 h-full">
      <div className="flex items-center justify-between">
        <input
          className="flex-1 text-base font-semibold bg-transparent border-b border-border focus:border-foreground outline-none pb-1 transition-colors text-foreground placeholder:text-muted-foreground"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
          onBlur={handleSave}
          placeholder="카드 제목"
        />
        <button
          type="button"
          className="ml-3 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          aria-label="Delete card"
          title="카드 삭제"
          onClick={() => { void handleDelete(); }}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <textarea
        className="flex-1 p-3 text-sm leading-relaxed resize-none rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        value={body}
        onChange={(e) => { setBody(e.target.value); setIsDirty(true); }}
        onBlur={handleSave}
        placeholder="답변 내용을 입력하세요..."
      />
    </div>
  );
}
