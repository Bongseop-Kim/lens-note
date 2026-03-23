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

const isMacOS = /mac/i.test(navigator.userAgent);

function isPluginUnavailableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /not available|plugin.*(missing|not found|not initialized)|unsupported/i.test(message);
}

function isCard(value: unknown): value is Card {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Card>;
  return typeof candidate.id === "string"
    && typeof candidate.title === "string"
    && typeof candidate.body === "string"
    && Array.isArray(candidate.tags)
    && typeof candidate.order === "number"
    && typeof candidate.createdAt === "string"
    && typeof candidate.updatedAt === "string";
}

export default function EditorApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [needsAccessibility, setNeedsAccessibility] = useState(false);
  const [tab, setTab] = useState<"cards" | "preferences">("cards");

  useEffect(() => {
    if (!isMacOS) {
      setNeedsAccessibility(false);
      return;
    }

    checkAccessibilityPermission()
      .then((granted) => {
        setNeedsAccessibility(!granted);
      })
      .catch((error) => {
        if (isPluginUnavailableError(error)) {
          console.warn("Accessibility permission API is unavailable on this platform", error);
          return;
        }
        console.error("Failed to check accessibility permission", error);
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      console.error("Failed to parse imported cards JSON", error);
      window.alert("JSON 형식이 올바르지 않습니다.");
      return;
    }
    if (!Array.isArray(parsed) || !parsed.every(isCard)) {
      window.alert("카드 배열 형식의 JSON만 가져올 수 있습니다.");
      return;
    }
    const imported = parsed as Card[];
    const mode = window.confirm("기존 카드를 교체할까요? (취소: 병합)") ? "replace" : "merge";
    const existing = useCardStore.getState().cards;
    const result = mode === "replace" ? imported : [...existing, ...imported];
    await invoke("write_cards", { cards: result });
    useCardStore.getState().setCards(result);
  }

  return (
    <div className="flex flex-col h-screen pt-8">
      {isMacOS && needsAccessibility && (
        <div role="alert" className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between z-50 text-sm">
          <span>단축키를 사용하려면 손쉬운 사용 권한이 필요합니다</span>
          <button
            type="button"
            className="underline font-medium"
            onClick={async () => {
              if (!isMacOS) {
                return;
              }
              try {
                await requestAccessibilityPermission();
                const granted = await checkAccessibilityPermission();
                if (granted) setNeedsAccessibility(false);
              } catch (error) {
                if (isPluginUnavailableError(error)) {
                  console.warn("Accessibility permission request is unavailable on this platform", error);
                  return;
                }
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
