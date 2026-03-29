import { useState } from "react";

interface JumpPanelProps {
  totalCards: number;
  onJump: (index: number) => void;
  onClose: () => void;
}

export default function JumpPanel({
  totalCards,
  onJump,
  onClose,
}: JumpPanelProps) {
  const [jumpInput, setJumpInput] = useState("");

  return (
    <div
      className="overlay-panel-backdrop absolute inset-0 flex items-center justify-center"
      style={{ pointerEvents: "auto" }}
    >
      <div className="overlay-panel w-[320px] p-5 text-foreground">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Jump To Card
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">#</span>
          <input
            autoFocus
            className="w-20 rounded-lg border border-input bg-background/70 px-3 py-2 text-center text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const n = parseInt(jumpInput, 10);
                if (Number.isNaN(n) || n < 1 || n > totalCards) {
                  return;
                }
                onJump(n - 1);
                onClose();
              }
              if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="1"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{totalCards}</p>
      </div>
    </div>
  );
}
