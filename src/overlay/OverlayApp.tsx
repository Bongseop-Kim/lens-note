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
  const [showSettings, setShowSettings] = useState(false);
  const { cards, setCurrentIndex, hydrate } = useCardStore();
  const { hydrate: hydratePrefs, prefs } = usePrefsStore();

  const moveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [jumpInput, setJumpInput] = useState("");
  const [showJump, setShowJump] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Card[]>([]);

  useEffect(() => {
    initSearch(cards);
  }, [cards]);

  useEffect(() => {
    hydrate().catch(console.error);
    hydratePrefs().catch(console.error);

    const unlistenPromise = listen<string>("hotkey-fired", (event) => {
      const id = event.payload;
      if (id === "jump") { setShowJump(true); return; }
      if (id === "search") { setShowSearch(true); return; }
      if (id === "toggle") {
        setShowSettings((value) => !value);
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
        <NavBar onSettings={() => setShowSettings((v) => !v)} />
      </div>
      <CardDisplay />
      {showSettings && <SettingsPopup onClose={() => setShowSettings(false)} />}

      {showJump && (
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
                  setShowJump(false);
                  setJumpInput("");
                }
                if (e.key === "Escape") { setShowJump(false); setJumpInput(""); }
              }}
              placeholder="1"
            />
          </div>
        </div>
      )}

      {showSearch && (
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
                setSearchQuery(e.target.value);
                setSearchResults(searchCards(e.target.value));
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowSearch(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }
              }}
            />
            <ul className="max-h-40 overflow-y-auto flex flex-col gap-1">
              {searchResults.map((card) => (
                <li
                  key={card.id}
                  className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 cursor-pointer text-white text-sm"
                  onClick={() => {
                    const idx = cards.findIndex((c) => c.id === card.id);
                    if (idx !== -1) setCurrentIndex(idx);
                    setShowSearch(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                >
                  <span className="font-medium">{card.title}</span>
                  <span className="text-gray-400 ml-2 text-xs truncate">{card.body.slice(0, 40)}</span>
                </li>
              ))}
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
