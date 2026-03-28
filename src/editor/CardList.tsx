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
      className={`group flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors ${
        isSelected
          ? "border-border border-l-[3px] border-l-foreground bg-accent pl-[11px]"
          : "border-border bg-card hover:bg-accent"
      }`}
      onClick={onSelect}
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/40 transition-colors hover:text-muted-foreground"
      >
        <GripVertical size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {card.title || "제목 없는 카드"}
        </p>
        <p className="mt-1 truncate text-xs leading-5 text-muted-foreground">
          {card.body.trim() ? card.body.slice(0, 72) : "..."}
        </p>
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
  const { cards, reorderCards } = useCardStore();

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
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-1.5">
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              isSelected={selectedId === card.id}
              onSelect={() => onSelect(card.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
