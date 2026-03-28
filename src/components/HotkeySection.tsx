import { useState } from "react";
import { Keyboard, RotateCcw } from "lucide-react";
import { HotkeyConfig, DEFAULT_PREFS } from "../types";
import { HOTKEY_LABELS } from "../utils/hotkeys";
import { usePrefsStore } from "../store/usePrefsStore";
import HotkeyRow from "./HotkeyRow";
import HotkeyRecorderModal from "./HotkeyRecorderModal";

const HOTKEY_ACTIONS: (keyof HotkeyConfig)[] = ["next", "prev", "nextLine", "prevLine", "jump", "search", "toggle"];

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
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
          <Keyboard size={13} />
          단축키
        </span>
        <div className="flex-1 h-px bg-border" />
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <RotateCcw size={12} />
          기본값
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
