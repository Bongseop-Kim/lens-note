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
    <div className={className ?? "flex flex-col gap-1.5"}>
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-500 dark:text-gray-400 font-mono text-xs tabular-nums">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500 cursor-pointer"
      />
    </div>
  );
}
