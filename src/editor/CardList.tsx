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
      className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer border transition-colors ${
        isSelected
          ? "bg-accent border-border border-l-[3px] border-l-foreground"
          : "bg-card border-border hover:bg-accent"
      }`}
      onClick={onSelect}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-colors">
        <GripVertical size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{card.title || "(제목 없음)"}</p>
        <p className="text-xs text-muted-foreground truncate">{card.body.slice(0, 50)}</p>
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
    <div className="flex flex-col gap-1.5">
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
        className="mt-1 w-full h-8 text-xs text-muted-foreground border border-dashed border-border rounded-md hover:bg-accent hover:text-foreground transition-colors"
        onClick={() => addCard({ title: "", body: "", tags: [] })}
      >
        + 새 카드
      </button>
    </div>
  );
}
