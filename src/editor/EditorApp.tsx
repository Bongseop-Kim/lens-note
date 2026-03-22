import { useEffect, useState } from "react";
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import CardList from "./CardList";
import CardDetail from "./CardDetail";

export default function EditorApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { hydrate: hydrateCards } = useCardStore();
  const { hydrate: hydratePrefs } = usePrefsStore();

  useEffect(() => {
    Promise.all([hydrateCards(), hydratePrefs()]);
  }, []);

  return (
    <div className="flex h-screen pt-8">
      {/* 사이드바: 카드 목록 */}
      <div className="w-72 border-r overflow-y-auto p-3">
        <CardList selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      {/* 메인: 카드 상세 */}
      <div className="flex-1 overflow-y-auto">
        {selectedId ? (
          <CardDetail cardId={selectedId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            카드를 선택하거나 새 카드를 추가하세요
          </div>
        )}
      </div>
    </div>
  );
}
