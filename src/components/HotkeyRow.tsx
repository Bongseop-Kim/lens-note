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
      className="flex w-full items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 text-left transition-colors hover:border-ring focus:outline-none focus-visible:border-ring"
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-xs text-foreground">
          {shortcut}
        </span>
        <span className="text-xs text-muted-foreground/50">클릭하여 변경</span>
      </div>
    </button>
  );
}
