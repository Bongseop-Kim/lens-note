import { useEffect, useMemo, useRef, useState } from "react";
import { useCardStore } from "../store/useCardStore";
import { Clock3, FileText, Trash2 } from "lucide-react";

const KOREA_DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return KOREA_DATE_FORMAT.format(date);
}

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
  // Korean content is better represented by visible characters than whitespace-delimited words.
  const charCount = useMemo(() => body.trim().length, [body]);

  // Only reset on card switch, not on every card object update — prevents overwriting in-progress edits.
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
    <div className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <input
            className="w-full border-b border-border bg-transparent pb-1 text-base font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            onBlur={handleSave}
            placeholder="질문 제목을 입력하세요"
          />
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
              <Clock3 size={12} />
              {formatDate(card.updatedAt)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
              <FileText size={12} />
              {charCount}자
            </span>
          </div>
        </div>
        <button
          type="button"
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete card"
          title="카드 삭제"
          onClick={() => {
            void handleDelete();
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <textarea
        className="min-h-0 flex-1 resize-none rounded-md border border-input bg-card p-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          setIsDirty(true);
        }}
        onBlur={handleSave}
        placeholder="답변 내용을 입력하세요..."
      />
    </div>
  );
}
