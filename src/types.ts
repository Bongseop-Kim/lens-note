export interface Card {
  id: string;        // uuid v4
  title: string;     // e.g. "자기소개"
  body: string;      // 답변 텍스트 (\n으로 단락 구분)
  tags: string[];    // optional: "technical", "hr"
  order: number;     // 목록 표시 순서
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface HotkeyConfig {
  next: string;   // default: "ArrowRight"
  prev: string;   // default: "ArrowLeft"
  jump: string;   // default: "Ctrl+G"
  search: string; // default: "Ctrl+F"
  toggle: string; // default: "Ctrl+Shift+P"
}

export interface Preferences {
  fontSize: number;                   // default: 22, range: 14–40
  lineHeight: number;                 // default: 1.7
  opacity: number;                    // default: 0.85, range: 0.4–1.0
  overlayWidth: number;
  overlayHeight: number;
  overlayX: number;
  overlayY: number;
  hotkeys: HotkeyConfig;
  theme: "dark" | "light";
  highlightCurrentParagraph: boolean;
}

export interface AppState {
  cards: Card[];
  currentIndex: number;
  preferences: Preferences;
}

export const DEFAULT_PREFS: Preferences = {
  fontSize: 22,
  lineHeight: 1.7,
  opacity: 0.85,
  overlayWidth: 480,
  overlayHeight: 160,
  overlayX: 0,
  overlayY: 0,
  hotkeys: {
    next: "ArrowRight",
    prev: "ArrowLeft",
    jump: "Ctrl+G",
    search: "Ctrl+F",
    toggle: "Ctrl+Shift+P",
  },
  theme: "dark",
  highlightCurrentParagraph: true,
};
