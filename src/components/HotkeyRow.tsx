interface HotkeyRowProps {
  label: string;
  shortcut: string;
  onClick: () => void;
}

export default function HotkeyRow({ label, shortcut, onClick }: HotkeyRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:border-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="w-32 rounded-md border border-border bg-muted px-2 py-1 text-right font-mono text-xs text-foreground">
          {shortcut}
        </span>
        <span className="text-xs text-muted-foreground">편집</span>
      </div>
    </button>
  );
}
