import { HotkeyConfig } from "../types";

export const HOTKEY_LABELS: Record<keyof HotkeyConfig, string> = {
  next: "다음 카드",
  prev: "이전 카드",
  jump: "번호로 이동",
  search: "검색",
};

const MODIFIER_KEYS = new Set(["Control", "Meta", "Alt", "Shift", "AltGraph"]);

export function isModifierKey(key: string): boolean {
  return MODIFIER_KEYS.has(key);
}

/** 단일 알파벳은 대문자화, 그 외(ArrowRight, F5, Enter 등)는 그대로 반환 */
export function normalizeKey(key: string): string {
  if (key.length === 1) return key.toUpperCase();
  return key;
}

/**
 * KeyboardEvent를 Tauri global_shortcut 포맷 문자열로 변환한다.
 * 수식키만 눌린 경우(isModifierKey(e.key) === true)는 null을 반환한다.
 * 수식키 순서: Meta > Ctrl > Alt > Shift > key
 */
export function buildShortcutString(e: KeyboardEvent): string | null {
  if (isModifierKey(e.key)) return null;
  const parts: string[] = [];
  if (e.metaKey) parts.push("Meta");
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  parts.push(normalizeKey(e.key));
  return parts.join("+");
}

/** 수식키가 하나 이상 포함됐는지 확인 */
export function hasModifier(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey || e.altKey || e.shiftKey;
}

/**
 * shortcut 문자열이 currentAction을 제외한 다른 액션과 충돌하면
 * 해당 액션 키를 반환하고, 충돌이 없으면 null을 반환한다.
 */
export function findConflict(
  shortcut: string,
  currentAction: keyof HotkeyConfig,
  hotkeys: HotkeyConfig,
): keyof HotkeyConfig | null {
  for (const [action, value] of Object.entries(hotkeys) as [keyof HotkeyConfig, string][]) {
    if (action !== currentAction && value === shortcut) {
      return action;
    }
  }
  return null;
}
