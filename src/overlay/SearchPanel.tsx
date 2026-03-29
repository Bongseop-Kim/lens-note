import { useState } from "react";
import { Search } from "lucide-react";
import { Card } from "../types";
import { searchCards } from "../utils/search";
import { SEARCH_RESULT_PREVIEW_LENGTH } from "../utils/constants";

interface SearchPanelProps {
  cards: Card[];
  onSelect: (cardId: string) => void;
  onClose: () => void;
}

export default function SearchPanel({
  cards,
  onSelect,
  onClose,
}: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Card[]>([]);

  function handleClose() {
    onClose();
  }

  return (
    <div
      className="overlay-panel-backdrop absolute inset-0 flex flex-col items-center pt-8"
      style={{ pointerEvents: "auto" }}
    >
      <div className="overlay-panel w-[360px] p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-input bg-background/70 px-3 py-2">
          <Search size={14} className="text-muted-foreground" />
          <input
            autoFocus
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
            value={searchQuery}
            placeholder="검색"
            onChange={(e) => {
              const nextQuery = e.target.value;
              const trimmed = nextQuery.trim();
              setSearchQuery(nextQuery);
              if (!trimmed || cards.length === 0) {
                setSearchResults([]);
                return;
              }
              try {
                setSearchResults(searchCards(trimmed));
              } catch {
                setSearchResults([]);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                handleClose();
              }
            }}
          />
        </div>
        <ul className="mt-3 flex max-h-48 flex-col gap-2 overflow-y-auto">
          {searchResults.map((card) => (
            <li
              key={card.id}
              role="button"
              tabIndex={0}
              className="cursor-pointer rounded-xl border border-border/80 bg-background/60 px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              onClick={() => onSelect(card.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(card.id);
                }
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{card.title}</span>
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  ↵
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {card.body.slice(0, SEARCH_RESULT_PREVIEW_LENGTH)}
              </p>
            </li>
          ))}
          {searchQuery.trim() && searchResults.length === 0 && (
            <li className="px-2 text-sm text-muted-foreground">없음</li>
          )}
        </ul>
      </div>
    </div>
  );
}
