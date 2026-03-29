import { FilePlus2, Sparkles } from "lucide-react";

interface CardEmptyStateProps {
  onAddSample: () => void;
  onAddBlank: () => void;
  isAddingSamples?: boolean;
}

export default function CardEmptyState({
  onAddSample,
  onAddBlank,
  isAddingSamples = false,
}: CardEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center px-10">
      <div className="w-full max-w-xl rounded-lg border border-border bg-card p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Editor
        </p>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          바로 읽을 답변만 남깁니다.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          왼쪽에서 카드를 고르거나 새 카드를 추가해 편집을 시작하세요.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
            onClick={onAddSample}
            disabled={isAddingSamples}
          >
            <Sparkles size={16} />
            {isAddingSamples ? "샘플 카드 추가 중..." : "샘플 카드 3개 추가"}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            onClick={onAddBlank}
          >
            <FilePlus2 size={16} />
            빈 카드로 시작
          </button>
        </div>
      </div>
    </div>
  );
}
