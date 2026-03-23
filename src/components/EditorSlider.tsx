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
    <label className={className ?? "flex items-center justify-between"}>
      <span>{label} ({displayValue})</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
