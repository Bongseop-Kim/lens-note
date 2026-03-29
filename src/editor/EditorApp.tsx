import { useEffect, useState } from "react";
import {
  FilePlus2,
  LayoutPanelTop,
  MapPinned,
  Settings2,
  Sparkles,
} from "lucide-react";
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
} from "tauri-plugin-macos-permissions-api";
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
  return /not available|plugin.*(missing|not found|not initialized)|unsupported/i.test(
    message,
  );
}

function tabClass(active: boolean) {
  return `inline-flex h-9 items-center justify-center border-b-[1.5px] px-3 text-sm font-medium transition-colors -mb-px ${
    active
      ? "border-foreground text-foreground"
      : "border-transparent text-muted-foreground hover:text-foreground"
  }`;
}

const starterCards: Array<Pick<Card, "title" | "body">> = [
  {
    title: "자기소개",
    body: "안녕하세요. 저는 문제를 구조화해서 빠르게 실행하는 프론트엔드 개발자입니다.\n최근에는 React와 TypeScript 기반 제품에서 설계와 구현 사이의 간격을 줄이는 일에 집중했습니다.",
  },
  {
    title: "최근 성과",
    body: "가장 최근 프로젝트에서는 복잡한 운영 화면의 정보 구조를 다시 설계했습니다.\n핵심 지표를 앞에 배치하고 편집 흐름을 단순화해 신규 사용자 적응 시간을 줄였습니다.",
  },
  {
    title: "지원 동기",
    body: "사용자 문제를 빠르게 제품으로 번역하는 팀에서 일하고 싶습니다.\n기능 구현뿐 아니라 화면 구조와 사용성까지 함께 끌어올릴 수 있는 역할을 기대합니다.",
  },
];

export default function EditorApp() {
  useThemeClass();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [needsAccessibility, setNeedsAccessibility] = useState(false);
  const [tab, setTab] = useState<"cards" | "preferences" | "position">("cards");
  const cards = useCardStore((state) => state.cards);
  const addCard = useCardStore((state) => state.addCard);

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
          console.warn(
            "Accessibility permission API is unavailable on this platform",
            error,
          );
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
        window.alert(
          "Failed to load saved data. Default state will be used where possible.",
        );
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

  async function createStarterCards() {
    for (const card of starterCards) {
      // Sequential writes keep order stable in persisted storage.
      await addCard(card);
    }
  }

  const selectedCard = selectedId
    ? (cards.find((card) => card.id === selectedId) ?? null)
    : null;
  return (
    <div className="flex h-screen flex-col bg-background pt-9 text-foreground">
      {isMacOS && needsAccessibility && (
        <div
          role="alert"
          className="fixed top-0 left-0 right-0 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between z-50 text-sm"
        >
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
                  console.warn(
                    "Accessibility permission request is unavailable on this platform",
                    error,
                  );
                  return;
                }
                console.error(
                  "Failed to request accessibility permission",
                  error,
                );
              }
            }}
          >
            설정 열기
          </button>
        </div>
      )}
      <div
        className="fixed left-0 right-0 top-0 z-10 flex h-9 border-b border-border bg-background"
        data-tauri-drag-region
      >
        <div className="w-20 shrink-0" data-tauri-drag-region />
        <div className="flex items-center" data-tauri-drag-region>
          <button
            type="button"
            className={tabClass(tab === "cards")}
            onClick={() => setTab("cards")}
            aria-label="카드 편집"
            title="카드 편집"
          >
            <LayoutPanelTop size={16} />
          </button>
          <button
            type="button"
            className={tabClass(tab === "preferences")}
            onClick={() => setTab("preferences")}
            aria-label="환경설정"
            title="환경설정"
          >
            <Settings2 size={16} />
          </button>
          <button
            type="button"
            className={tabClass(tab === "position")}
            onClick={() => setTab("position")}
            aria-label="오버레이 위치"
            title="오버레이 위치"
          >
            <MapPinned size={16} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "cards" ? (
          <div className="grid h-full grid-cols-[18rem_minmax(0,1fr)]">
            <aside className="flex flex-col overflow-hidden border-r border-border bg-muted/30 p-2">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <CardList selectedId={selectedId} onSelect={setSelectedId} />
              </div>
              <div className="shrink-0 pt-2">
                <button
                  type="button"
                  className="flex h-8 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() =>
                    addCard({ title: "", body: "" }).catch(console.error)
                  }
                >
                  <FilePlus2 size={14} />새 카드
                </button>
              </div>
            </aside>
            <main className="min-w-0 overflow-hidden bg-background">
              {selectedCard ? (
                <div className="h-full min-h-0 overflow-y-auto">
                  <CardDetail
                    cardId={selectedCard.id}
                    onDelete={() => setSelectedId(null)}
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center px-10">
                  <div className="w-full max-w-xl rounded-lg border border-border bg-card p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Editor
                    </p>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                      바로 읽을 답변만 남깁니다.
                    </h2>
                    <p className="mt-3 text-sm text-muted-foreground">
                      왼쪽에서 카드를 고르거나 새 카드를 추가해 편집을
                      시작하세요.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                        onClick={() =>
                          createStarterCards().catch(console.error)
                        }
                      >
                        <Sparkles size={16} />
                        샘플 카드 3개 추가
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                        onClick={() =>
                          addCard({ title: "", body: "" }).catch(console.error)
                        }
                      >
                        <FilePlus2 size={16} />빈 카드로 시작
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {tab === "position" ? <ZonePicker /> : <Preferences />}
          </div>
        )}
      </div>
    </div>
  );
}
