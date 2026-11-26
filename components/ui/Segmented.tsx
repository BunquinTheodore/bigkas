interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** Equal width choices, one selected. */
export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className="grid w-full auto-cols-fr grid-flow-col gap-0.5 rounded-full bg-fill p-[3px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="min-h-11 rounded-full px-1 text-[13px] font-semibold whitespace-nowrap transition aria-pressed:bg-raised aria-pressed:shadow-sm sm:px-4 sm:text-sm"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
