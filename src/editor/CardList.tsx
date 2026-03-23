import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useCardStore } from "../store/useCardStore";
import { Card } from "../types";

function SortableCard({
  card,
  isSelected,
  onSelect,
}: {
  card: Card;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded cursor-pointer border ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
      }`}
      onClick={onSelect}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-gray-400">
        <GripVertical size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{card.title || "(제목 없음)"}</p>
        <p className="text-sm text-gray-500 truncate">{card.body.slice(0, 50)}</p>
      </div>
    </div>
  );
}

export default function CardList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { cards, reorderCards, addCard } = useCardStore();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(cards, oldIndex, newIndex).map((c, i) => ({
      ...c,
      order: i,
    }));
    reorderCards(reordered);
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              isSelected={selectedId === card.id}
              onSelect={() => onSelect(card.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => addCard({ title: "", body: "", tags: [] })}
      >
        + 새 카드
      </button>
    </div>
  );
}
