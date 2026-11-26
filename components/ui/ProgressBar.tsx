interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  className?: string;
}

export function ProgressBar({ value, max, label, className = "" }: ProgressBarProps) {
  const share = Math.min(1, Math.max(0, value / max));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-fill ${className}`}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-tint to-[#7d5fff] transition-[width]"
        style={{ width: `${share * 100}%` }}
      />
    </div>
  );
}
