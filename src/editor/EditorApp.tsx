import { useEffect, useState } from "react";
import { checkAccessibilityPermission, requestAccessibilityPermission } from "tauri-plugin-macos-permissions-api";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import { Card } from "../types";
import CardList from "./CardList";
import CardDetail from "./CardDetail";
import Preferences from "./Preferences";

export default function EditorApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [needsAccessibility, setNeedsAccessibility] = useState(false);
  const [tab, setTab] = useState<"cards" | "preferences">("cards");

  useEffect(() => {
    checkAccessibilityPermission()
      .then((granted) => {
        setNeedsAccessibility(!granted);
      })
      .catch((error) => {
        console.error("Failed to check accessibility permission", error);
        setNeedsAccessibility(true);
      });
  }, []);

  useEffect(() => {
    const hydrate = async () => {
      try {
        await Promise.all([
          useCardStore.getState().hydrate(),
          usePrefsStore.getState().hydrate(),
        ]);
      } catch (error) {
        console.error("Failed to hydrate editor state", error);
        window.alert("Failed to load saved data. Default state will be used where possible.");
      }
    };

    void hydrate();
  }, []);

  async function exportCards() {
    const cards = useCardStore.getState().cards;
    const path = await save({ filters: [{ name: "JSON", extensions: ["json"] }] });
    if (path) {
      await writeTextFile(path, JSON.stringify(cards, null, 2));
    }
  }

  async function importCards() {
    const selected = await open({ filters: [{ name: "JSON", extensions: ["json"] }] });
    const path = typeof selected === "string" ? selected : Array.isArray(selected) ? selected[0] : null;
    if (!path) return;
    const content = await readTextFile(path);
    const imported: Card[] = JSON.parse(content);
    const mode = window.confirm("기존 카드를 교체할까요? (취소: 병합)") ? "replace" : "merge";
    const existing = useCardStore.getState().cards;
    const result = mode === "replace" ? imported : [...existing, ...imported];
    await invoke("write_cards", { cards: result });
  }

  return (
    <div className="flex flex-col h-screen pt-8">
      {needsAccessibility && (
        <div role="alert" className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between z-50 text-sm">
          <span>단축키를 사용하려면 손쉬운 사용 권한이 필요합니다</span>
          <button
            type="button"
            className="underline font-medium"
            onClick={async () => {
              try {
                await requestAccessibilityPermission();
                const granted = await checkAccessibilityPermission();
                if (granted) setNeedsAccessibility(false);
              } catch (error) {
                console.error("Failed to request accessibility permission", error);
              }
            }}
          >
            설정 열기
          </button>
        </div>
      )}
      {/* 탭 바 */}
      <div className="fixed top-0 left-0 right-0 flex border-b bg-white z-10">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${tab === "cards" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setTab("cards")}
        >
          카드 편집
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${tab === "preferences" ? "border-b-2 border-blue-500 text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          onClick={() => setTab("preferences")}
        >
          환경설정
        </button>
        <div className="ml-auto flex items-center gap-2 px-3">
          <button
            type="button"
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            onClick={() => importCards().catch(console.error)}
          >
            가져오기
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
            onClick={() => exportCards().catch(console.error)}
          >
            내보내기
          </button>
        </div>
      </div>
      {tab === "cards" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* 사이드바: 카드 목록 */}
          <div className="w-72 border-r overflow-y-auto p-3">
            <CardList selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          {/* 메인: 카드 상세 */}
          <div className="flex-1 overflow-y-auto">
            {selectedId ? (
              <CardDetail cardId={selectedId} onDelete={() => setSelectedId(null)} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                카드를 선택하거나 새 카드를 추가하세요
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto">
          <Preferences />
        </div>
      )}
    </div>
  );
}
