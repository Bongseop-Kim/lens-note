import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import DragHandle from "./DragHandle";
import CardDisplay from "./CardDisplay";
import NavBar from "./NavBar";
import SettingsPopup from "./SettingsPopup";
import { initSearch, searchCards } from "../utils/search";
import { Card } from "../types";

export default function OverlayApp() {
  const [activePanel, setActivePanel] = useState<"settings" | "jump" | "search" | null>(null);
  const { cards, setCurrentIndex, hydrate } = useCardStore();
  const { hydrate: hydratePrefs, prefs } = usePrefsStore();

  const moveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [jumpInput, setJumpInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Card[]>([]);

  useEffect(() => {
    initSearch(cards);
  }, [cards]);

  useEffect(() => {
    hydrate().catch(console.error);
    hydratePrefs().catch(console.error);

    const unlistenPromise = listen<string>("hotkey-fired", (event) => {
      const id = event.payload;
      if (id === "jump") { setActivePanel("jump"); return; }
      if (id === "search") { setActivePanel("search"); return; }
      if (id === "toggle") {
        setActivePanel((p) => p === "settings" ? null : "settings");
        return;
      }
      const { currentIndex: idx, cards: c } = useCardStore.getState();
      if (id === "next" && idx < c.length - 1) {
        useCardStore.setState({ currentIndex: idx + 1 });
      } else if (id === "prev" && idx > 0) {
        useCardStore.setState({ currentIndex: idx - 1 });
      }
    });

    const win = getCurrentWindow();
    const unlistenMoved = win.onMoved(({ payload: pos }) => {
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
      moveDebounceRef.current = setTimeout(() => {
        usePrefsStore.getState().updatePrefs({ overlayX: pos.x, overlayY: pos.y }).catch(console.error);
      }, 500);
    });
    const unlistenResized = win.onResized(({ payload: size }) => {
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
      resizeDebounceRef.current = setTimeout(() => {
        usePrefsStore.getState().updatePrefs({ overlayWidth: size.width, overlayHeight: size.height }).catch(console.error);
      }, 500);
    });

    return () => {
      if (moveDebounceRef.current) clearTimeout(moveDebounceRef.current);
      if (resizeDebounceRef.current) clearTimeout(resizeDebounceRef.current);
      unlistenPromise.then((fn) => fn()).catch(console.error);
      unlistenMoved.then((fn) => fn()).catch(console.error);
      unlistenResized.then((fn) => fn()).catch(console.error);
    };
  }, []);

  return (
    <div
      className="relative flex flex-col w-full h-screen overflow-hidden"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${prefs.opacity})`,
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <DragHandle dragLocked={prefs.dragLocked} />
        <NavBar onSettings={() => setActivePanel((p) => p === "settings" ? null : "settings")} />
      </div>
      <CardDisplay />
      {activePanel === "settings" && <SettingsPopup onClose={() => setActivePanel(null)} />}

      {activePanel === "jump" && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50"
          style={{ pointerEvents: "auto" }}
        >
          <div className="bg-gray-800 rounded p-4 flex gap-2 items-center">
            <span className="text-white text-sm">카드 번호</span>
            <input
              autoFocus
              className="bg-gray-700 text-white px-2 py-1 rounded w-16 text-center"
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
        </div>
      )}

      {activePanel === "search" && (
        <div
          className="absolute inset-0 flex flex-col items-center pt-8 bg-black/60"
          style={{ pointerEvents: "auto" }}
        >
          <div className="bg-gray-800 rounded p-4 w-80 flex flex-col gap-2">
            <input
              autoFocus
              className="bg-gray-700 text-white px-3 py-1.5 rounded w-full"
              value={searchQuery}
              placeholder="카드 검색..."
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
            <ul className="max-h-40 overflow-y-auto flex flex-col gap-1">
              {searchResults.map((card) => {
                const selectCard = () => {
                  const idx = cards.findIndex((c) => c.id === card.id);
                  if (idx !== -1) setCurrentIndex(idx);
                  setActivePanel(null);
                  setSearchQuery("");
                  setSearchResults([]);
                };
                return (
                <li
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 cursor-pointer text-white text-sm"
                  onClick={selectCard}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectCard(); } }}
                >
                  <span className="font-medium">{card.title}</span>
                  <span className="text-gray-400 ml-2 text-xs truncate">{card.body.slice(0, 40)}</span>
                </li>
              );
              })}
              {searchQuery && searchResults.length === 0 && (
                <li className="text-gray-500 text-sm px-2">결과 없음</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
