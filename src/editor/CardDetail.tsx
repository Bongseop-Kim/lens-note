import { useEffect, useState } from "react";
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
  const [title, setTitle] = useState<string>();
  const [body, setBody] = useState<string>();
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (card?.id === cardId) {
      setTitle(card.title);
      setBody(card.body);
    }
  }, [card, cardId]);

  if (!card) return null;

  function handleSave() {
    if (title == null || body == null) return;
    updateCard(cardId, { title, body });
  }

  async function handleDelete() {
    if (!window.confirm("이 카드를 삭제할까요?")) return;
    await deleteCard(cardId);
    onDelete?.();
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !card!.tags.includes(tag)) {
      updateCard(cardId, { tags: [...card!.tags, tag] });
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    updateCard(cardId, { tags: card!.tags.filter((t) => t !== tag) });
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <div className="flex items-center justify-between">
        <input
          className="flex-1 text-xl font-bold border-b-2 border-gray-300 focus:border-blue-500 outline-none pb-1"
          value={title ?? ""}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          placeholder="카드 제목"
        />
        <button
          className="ml-4 text-red-400 hover:text-red-600"
          onClick={() => {
            void handleDelete();
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        {card.tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
          </span>
        ))}
        <input
          className="border rounded px-2 py-0.5 text-xs w-24"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
          placeholder="태그 추가"
        />
      </div>
      <textarea
        className="flex-1 p-3 border rounded resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={body ?? ""}
        onChange={(e) => setBody(e.target.value)}
        onBlur={handleSave}
        placeholder="답변 내용을 입력하세요..."
      />
    </div>
  );
}
