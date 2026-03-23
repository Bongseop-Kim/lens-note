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
        isSelected ? "border-gray-300 bg-gray-50 shadow-[inset_2px_0_0_#111827] dark:border-gray-600 dark:bg-gray-800 dark:shadow-[inset_2px_0_0_#e5e7eb]" : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      }`}
      onClick={onSelect}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-gray-400">
        <GripVertical size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{card.title || "(제목 없음)"}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{card.body.slice(0, 50)}</p>
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
        type="button"
        className="mt-1 w-full px-4 py-2 text-sm font-medium bg-gray-50 text-gray-600 border border-gray-200 rounded hover:bg-gray-100 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
        onClick={() => addCard({ title: "", body: "", tags: [] })}
      >
        + 새 카드
      </button>
    </div>
  );
}
