interface EditorSliderProps {
  label: string;
  min: number;
  max: number;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
  className?: string;
}

export default function EditorSlider({
  label,
  min,
  max,
  value,
  displayValue,
  onChange,
  className,
}: EditorSliderProps) {
  return (
    <label className={className ?? "flex flex-col gap-1.5"}>
      <div className="flex justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-foreground"
      />
    </label>
  );
}
