import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { checkAccessibilityPermission, requestAccessibilityPermission } from "tauri-plugin-macos-permissions-api";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import { useThemeClass } from "../hooks/useThemeClass";
import { Card } from "../types";
import CardList from "./CardList";
import CardDetail from "./CardDetail";
import Preferences from "./Preferences";
import ZonePicker from "./ZonePicker";

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

function tabClass(active: boolean) {
  return `px-4 h-9 text-sm font-medium transition-colors border-b-[1.5px] -mb-px ${
    active
      ? "border-foreground text-foreground"
      : "border-transparent text-muted-foreground hover:text-foreground"
  }`;
}

export default function EditorApp() {
  useThemeClass();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [needsAccessibility, setNeedsAccessibility] = useState(false);
  const [tab, setTab] = useState<"cards" | "preferences" | "position">("cards");

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

    const unlistenNav = listen("navigate-to-position", () => {
      setTab("position");
    });

    return () => {
      unlistenNav.then((fn) => fn()).catch(console.error);
    };
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
    <div className="flex flex-col h-screen pt-9 bg-background text-foreground">
      {isMacOS && needsAccessibility && (
        <div role="alert" className="fixed top-0 left-0 right-0 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between z-50 text-sm">
          <span>단축키를 사용하려면 손쉬운 사용 권한이 필요합니다</span>
          <button
            type="button"
            className="text-amber-700 dark:text-amber-400 font-medium hover:text-amber-900 dark:hover:text-amber-200"
            onClick={async () => {
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
      <div className="fixed top-0 left-0 right-0 flex border-b border-border bg-background z-10" data-tauri-drag-region>
        {/* macOS traffic light spacer (~80px) */}
        <div className="w-20 shrink-0" data-tauri-drag-region />
        <button
          type="button"
          className={tabClass(tab === "cards")}
          onClick={() => setTab("cards")}
        >
          카드 편집
        </button>
        <button
          type="button"
          className={tabClass(tab === "preferences")}
          onClick={() => setTab("preferences")}
        >
          환경설정
        </button>
        <button
          type="button"
          className={tabClass(tab === "position")}
          onClick={() => setTab("position")}
        >
          위치
        </button>
        <div className="ml-auto flex items-center gap-2 px-3">
          <button
            type="button"
            className="h-[22px] px-2.5 text-xs font-medium text-muted-foreground border border-border rounded-md bg-transparent hover:bg-accent hover:text-foreground transition-colors"
            onClick={() => importCards().catch(console.error)}
          >
            가져오기
          </button>
          <button
            type="button"
            className="h-[22px] px-2.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
            onClick={() => exportCards().catch(console.error)}
          >
            내보내기
          </button>
        </div>
      </div>
      {tab === "cards" ? (
        <div className="flex flex-1 overflow-hidden">
          {/* 사이드바: 카드 목록 */}
          <div className="w-72 border-r border-border overflow-y-auto p-2 bg-muted/30">
            <CardList selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          {/* 메인: 카드 상세 */}
          <div className="flex-1 overflow-y-auto">
            {selectedId ? (
              <CardDetail cardId={selectedId} onDelete={() => setSelectedId(null)} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <FileText size={32} strokeWidth={1.5} />
                <p className="text-sm">카드를 선택하거나 새 카드를 추가하세요</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto">
          {tab === "position" ? <ZonePicker /> : <Preferences />}
        </div>
      )}
    </div>
  );
}
