import { useState } from "react";
import { HotkeyConfig, DEFAULT_PREFS } from "../types";
import { HOTKEY_LABELS } from "../utils/hotkeys";
import { usePrefsStore } from "../store/usePrefsStore";
import HotkeyRow from "./HotkeyRow";
import HotkeyRecorderModal from "./HotkeyRecorderModal";

const HOTKEY_ACTIONS: (keyof HotkeyConfig)[] = ["next", "prev", "jump", "search"];

export default function HotkeySection() {
  const { prefs, updatePrefs } = usePrefsStore();
  const [openAction, setOpenAction] = useState<keyof HotkeyConfig | null>(null);

  function handleSave(shortcut: string) {
    if (openAction === null) return;
    void updatePrefs({
      hotkeys: { ...prefs.hotkeys, [openAction]: shortcut },
    }).catch(console.error);
    setOpenAction(null);
  }

  function handleReset() {
    void updatePrefs({ hotkeys: DEFAULT_PREFS.hotkeys }).catch(console.error);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
          단축키
        </span>
        <div className="flex-1 h-px bg-border" />
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors border border-border rounded-md px-2 py-1"
        >
          기본값으로 초기화
        </button>
      </div>

      {HOTKEY_ACTIONS.map((key) => (
        <HotkeyRow
          key={key}
          label={HOTKEY_LABELS[key]}
          shortcut={prefs.hotkeys[key]}
          onClick={() => setOpenAction(key)}
        />
      ))}

      {openAction !== null && (
        <HotkeyRecorderModal
          actionKey={openAction}
          allHotkeys={prefs.hotkeys}
          onSave={handleSave}
          onClose={() => setOpenAction(null)}
        />
      )}
    </div>
  );
}
