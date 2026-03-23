import { HotkeyConfig } from "../types";

const HOTKEY_TOKEN_PATTERN = /^[A-Za-z0-9]+$/;

export const HOTKEY_LABELS: Record<keyof HotkeyConfig, string> = {
  next: "다음 카드",
  prev: "이전 카드",
  jump: "번호로 이동",
  search: "검색",
  toggle: "오버레이 토글",
};

export function validateHotkey(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "단축키를 비울 수 없습니다.";
  }

  const parts = trimmed.split("+");
  if (parts.some((part) => !part.trim())) {
    return "단축키 조합 형식이 올바르지 않습니다.";
  }

  const normalized = parts.map((part) => part.trim());
  if (normalized.some((part) => !HOTKEY_TOKEN_PATTERN.test(part))) {
    return "영문, 숫자, + 조합만 사용할 수 있습니다.";
  }

  return null;
}
