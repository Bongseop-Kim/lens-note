import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import { useThemeClass } from "../hooks/useThemeClass";
import CardDisplay from "./CardDisplay";
import { initSearch, searchCards } from "../utils/search";
import { SEARCH_RESULT_PREVIEW_LENGTH } from "../utils/constants";
import { Card } from "../types";

export default function OverlayApp() {
  const themeClass = useThemeClass();
  const [activePanel, setActivePanel] = useState<"jump" | "search" | null>(null);
  const { cards, setCurrentIndex, hydrate } = useCardStore();
  const { hydrate: hydratePrefs, prefs } = usePrefsStore();

  const [jumpInput, setJumpInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [activeParagraphIndex, setActiveParagraphIndex] = useState(0);

  const currentIndex = useCardStore((s) => s.currentIndex);
  const card = cards[currentIndex];
  const paragraphs = card ? card.body.split("\n").filter((p) => p.trim()) : [];

  useEffect(() => {
    initSearch(cards);
  }, [cards]);

  const clickthrough = activePanel === null;
  useEffect(() => {
    invoke("set_overlay_clickthrough", { ignore: clickthrough }).catch(console.error);
  }, [clickthrough]);

  useEffect(() => {
    setActiveParagraphIndex(0);
  }, [currentIndex]);

  useEffect(() => {
    hydrate().catch(console.error);
    hydratePrefs().catch(console.error);

    const unlistenPromise = listen<string>("hotkey-fired", (event) => {
      const id = event.payload;

      if (id === "jump") { setActivePanel("jump"); return; }
      if (id === "search") { setActivePanel("search"); return; }

      if (id === "toggle") {
        invoke("toggle_overlay").catch(console.error);
        return;
      }

      if (id === "next_line") {
        const { cards: c, currentIndex: ci } = useCardStore.getState();
        const currentCard = c[ci];
        if (!currentCard) return;
        const paraCount = currentCard.body.split("\n").filter((p) => p.trim()).length;
        setActiveParagraphIndex((idx) => (idx < paraCount - 1 ? idx + 1 : idx));
        return;
      }

      if (id === "prev_line") {
        setActiveParagraphIndex((idx) => (idx > 0 ? idx - 1 : idx));
        return;
      }

      const { currentIndex: idx, cards: c } = useCardStore.getState();
      if (id === "next" && idx < c.length - 1) {
        useCardStore.setState({ currentIndex: idx + 1 });
        setActiveParagraphIndex(0);
      } else if (id === "prev" && idx > 0) {
        useCardStore.setState({ currentIndex: idx - 1 });
        setActiveParagraphIndex(0);
      }
    });

    return () => {
      unlistenPromise.then((fn) => fn()).catch(console.error);
    };
  }, []);

  function selectCard(cardId: string) {
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx !== -1) setCurrentIndex(idx);
    setActivePanel(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  return (
    <div
      className={`${themeClass} relative flex h-screen w-full flex-col overflow-hidden bg-background text-foreground`}
      style={{
        backgroundColor:
          themeClass === "dark"
            ? `rgba(0, 0, 0, ${prefs.opacity})`
            : `rgba(255, 255, 255, ${prefs.opacity})`,
        pointerEvents: "none",
      }}
    >
      <CardDisplay
        paragraphs={paragraphs}
        activeIndex={activeParagraphIndex}
        cardTitle={card?.title ?? ""}
        cardPosition={card ? `${currentIndex + 1}/${cards.length}` : ""}
      />

      {activePanel === "jump" && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-background/60"
          style={{ pointerEvents: "auto" }}
        >
          <div className="w-[320px] rounded-2xl border border-border/80 bg-card/90 p-5 text-foreground shadow-2xl backdrop-blur">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Jump To Card</p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">#</span>
              <input
                autoFocus
                className="w-20 rounded-lg border border-input bg-background/70 px-3 py-2 text-center text-foreground outline-none ring-0 placeholder:text-muted-foreground"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const n = parseInt(jumpInput, 10);
                    if (!isNaN(n) && n >= 1 && n <= cards.length) {
                      setCurrentIndex(n - 1);
                    }
                    setActivePanel(null);
                    setJumpInput("");
                  }
                  if (e.key === "Escape") { setActivePanel(null); setJumpInput(""); }
                }}
                placeholder="1"
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{cards.length}</p>
          </div>
        </div>
      )}

      {activePanel === "search" && (
        <div
          className="absolute inset-0 flex flex-col items-center bg-background/70 pt-8"
          style={{ pointerEvents: "auto" }}
        >
          <div className="w-[360px] rounded-2xl border border-border/80 bg-card/90 p-4 shadow-2xl backdrop-blur">
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-input bg-background/70 px-3 py-2">
              <Search size={14} className="text-muted-foreground" />
              <input
                autoFocus
                className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                value={searchQuery}
                placeholder="검색"
                onChange={(e) => {
                  const nextQuery = e.target.value;
                  setSearchQuery(nextQuery);
                  if (!nextQuery.trim() || cards.length === 0) {
                    setSearchResults([]);
                    return;
                  }
                  try {
                    setSearchResults(searchCards(nextQuery));
                  } catch {
                    setSearchResults([]);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setActivePanel(null);
                    setSearchQuery("");
                    setSearchResults([]);
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
                    onClick={() => selectCard(card.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectCard(card.id); } }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{card.title}</span>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">↵</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{card.body.slice(0, SEARCH_RESULT_PREVIEW_LENGTH)}</p>
                  </li>
                ))}
              {searchQuery && searchResults.length === 0 && (
                <li className="px-2 text-sm text-muted-foreground">없음</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
