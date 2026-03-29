import { useEffect, useState } from "react";
import { HotkeyConfig } from "../types";
import {
  HOTKEY_LABELS,
  buildShortcutString,
  findConflict,
  hasModifier,
  isModifierKey,
} from "../utils/hotkeys";

type ModalState =
  | { kind: "capturing" }
  | { kind: "invalid"; shortcut: string }
  | { kind: "conflict"; shortcut: string; conflictsWith: keyof HotkeyConfig }
  | { kind: "valid"; shortcut: string };

interface HotkeyRecorderModalProps {
  actionKey: keyof HotkeyConfig;
  allHotkeys: HotkeyConfig;
  onSave: (shortcut: string) => void;
  onClose: () => void;
}

export default function HotkeyRecorderModal({
  actionKey,
  allHotkeys,
  onSave,
  onClose,
}: HotkeyRecorderModalProps) {
  const [modalState, setModalState] = useState<ModalState>({ kind: "capturing" });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      e.preventDefault();

      if (e.key === "Escape") {
        onClose();
        return;
      }

      // 수식키만 눌린 경우 무시
      if (isModifierKey(e.key)) return;

      // valid 상태에서 수식키 없는 Enter → 저장
      if (
        e.key === "Enter" &&
        !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
        modalState.kind === "valid"
      ) {
        onSave(modalState.shortcut);
        return;
      }

      const shortcut = buildShortcutString(e)!;

      if (!hasModifier(e)) {
        setModalState({ kind: "invalid", shortcut });
        return;
      }

      const conflict = findConflict(shortcut, actionKey, allHotkeys);
      if (conflict !== null) {
        setModalState({ kind: "conflict", shortcut, conflictsWith: conflict });
        return;
      }

      setModalState({ kind: "valid", shortcut });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actionKey, allHotkeys, modalState, onClose, onSave]);

  const label = HOTKEY_LABELS[actionKey];

  return (
    // backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      {/* modal panel */}
      <div
        className="w-64 rounded-2xl border border-border bg-background p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label} 단축키
        </p>

        {/* key display box */}
        {modalState.kind === "capturing" && (
          <>
            <div className="mb-2 flex min-h-14 items-center justify-center rounded-lg border-2 border-ring bg-ring/10 px-3 py-3 font-mono text-sm text-ring animate-pulse">
              키를 누르세요
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Ctrl · Alt · Cmd · Shift 포함 필수
            </p>
          </>
        )}

        {modalState.kind === "invalid" && (
          <>
            <div className="mb-2 flex min-h-14 items-center justify-center rounded-lg border-2 border-yellow-600 bg-yellow-950/40 px-3 py-3 font-mono text-sm text-yellow-400">
              {modalState.shortcut}
            </div>
            <p className="mb-4 text-xs text-yellow-500">
              수식키(Ctrl·Alt·Cmd·Shift)가 필요합니다
            </p>
          </>
        )}

        {modalState.kind === "conflict" && (
          <>
            <div className="mb-2 flex min-h-14 items-center justify-center rounded-lg border-2 border-destructive bg-destructive/10 px-3 py-3 font-mono text-sm text-destructive">
              {modalState.shortcut}
            </div>
            <p className="mb-4 text-xs text-destructive">
              이미 '{HOTKEY_LABELS[modalState.conflictsWith]}'에서 사용 중
            </p>
          </>
        )}

        {modalState.kind === "valid" && (
          <>
            <div className="mb-2 flex min-h-14 items-center justify-center rounded-lg border-2 border-green-600 bg-green-950/40 px-3 py-3 font-mono text-sm text-green-400">
              {modalState.shortcut}
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              다시 누르면 변경됩니다
            </p>
          </>
        )}

        {/* action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-border bg-muted py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/80"
          >
            취소 (Esc)
          </button>

          {modalState.kind === "conflict" && (
            <button
              type="button"
              disabled
              className="flex-1 rounded-lg border border-border bg-muted/50 py-2 text-xs text-muted-foreground/40 cursor-not-allowed"
            >
              저장 불가
            </button>
          )}

          {modalState.kind === "valid" && (
            <button
              type="button"
              onClick={() => onSave(modalState.shortcut)}
              className="flex-1 rounded-lg bg-primary py-2 text-xs text-primary-foreground transition-colors hover:bg-primary/90"
            >
              저장 (Enter)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
