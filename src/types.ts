export interface Card {
  id: string;        // uuid v4
  title: string;     // e.g. "자기소개"
  body: string;      // 답변 텍스트 (\n으로 단락 구분)
  order: number;     // 목록 표시 순서
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface HotkeyConfig {
  next: string;
  prev: string;
  jump: string;
  search: string;
  nextLine: string;
  prevLine: string;
  toggle: string;
}

export interface ZonePreset {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  builtIn: boolean;
  monitorName?: string;
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
  theme: "system" | "dark" | "light";
  highlightCurrentParagraph: boolean;
  customPresets: ZonePreset[];
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
    next: "Ctrl+ArrowRight",
    prev: "Ctrl+ArrowLeft",
    jump: "Ctrl+G",
    search: "Ctrl+F",
    nextLine: "Ctrl+ArrowDown",
    prevLine: "Ctrl+ArrowUp",
    toggle: "Ctrl+Shift+O",
  },
  theme: "system",
  highlightCurrentParagraph: true,
  customPresets: [],
};
