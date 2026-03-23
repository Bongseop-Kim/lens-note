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
  const [tagInput, setTagInput] = useState("");
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

  function enqueueTagUpdate(newTags: string[]) {
    const p = (pendingSaveRef.current ?? Promise.resolve())
      .then(() => updateCard(cardId, { tags: newTags }))
      .catch((err) => { console.error("Failed to update tags:", err); })
      .finally(() => { if (pendingSaveRef.current === p) pendingSaveRef.current = null; });
    pendingSaveRef.current = p;
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !card!.tags.includes(tag)) {
      enqueueTagUpdate([...card!.tags, tag]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    enqueueTagUpdate(card!.tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <div className="flex items-center justify-between">
        <input
          className="flex-1 text-xl font-bold bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none pb-1 transition-colors dark:border-gray-600 dark:text-gray-100 dark:focus:border-blue-400"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
          onBlur={handleSave}
          placeholder="카드 제목"
        />
        <button
          type="button"
          className="ml-3 p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/30"
          aria-label="Delete card"
          title="카드 삭제"
          onClick={() => { void handleDelete(); }}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {card.tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-gray-100 text-gray-700 border border-gray-200 px-2 py-0.5 rounded text-xs dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:text-red-500 hover:bg-red-100 transition-colors"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="border border-gray-200 rounded px-2 py-0.5 text-xs w-24 focus:outline-none focus:border-gray-400 dark:border-gray-600 dark:bg-transparent dark:text-gray-100 dark:focus:border-gray-500"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="태그 추가"
        />
      </div>
      <textarea
        className="flex-1 p-3 border border-gray-200 rounded-md resize-none text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-400 transition-colors dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-gray-700 dark:focus:border-gray-500"
        value={body}
        onChange={(e) => { setBody(e.target.value); setIsDirty(true); }}
        onBlur={handleSave}
        placeholder="답변 내용을 입력하세요..."
      />
    </div>
  );
}
