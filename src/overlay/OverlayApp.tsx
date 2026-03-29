import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./overlay.css";
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import { useThemeClass } from "../hooks/useThemeClass";
import CardDisplay from "./CardDisplay";
import { initSearch } from "../utils/search";
import JumpPanel from "./JumpPanel";
import SearchPanel from "./SearchPanel";

export default function OverlayApp() {
  const themeClass = useThemeClass();
  const [activePanel, setActivePanel] = useState<"jump" | "search" | null>(null);
  const { cards, setCurrentIndex, hydrate } = useCardStore();
  const { hydrate: hydratePrefs, prefs } = usePrefsStore();
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
    setActiveParagraphIndex((current) => {
      if (paragraphs.length === 0) {
        return 0;
      }
      return Math.min(current, paragraphs.length - 1);
    });
  }, [paragraphs.length]);

  useEffect(() => {
    Promise.all([hydrate(), hydratePrefs()]).catch(console.error);

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
        <JumpPanel
          totalCards={cards.length}
          onJump={(index) => setCurrentIndex(index)}
          onClose={() => setActivePanel(null)}
        />
      )}

      {activePanel === "search" && (
        <SearchPanel
          cards={cards}
          onSelect={selectCard}
          onClose={() => setActivePanel(null)}
        />
      )}
    </div>
  );
}
