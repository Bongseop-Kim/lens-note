import { Slider } from "./ui/slider";

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
      <Slider
        min={min}
        max={max}
        value={[value]}
        onValueChange={([next]) => onChange(next ?? value)}
        thumbAriaLabel={label}
        className="w-full"
      />
    </label>
  );
}
