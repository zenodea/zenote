"use client";

/** Segmented control with a highlight that slides to the selected option. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const index = Math.max(0, options.indexOf(value));
  const count = options.length;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`relative flex gap-1 rounded border border-foreground/15 p-0.5${
        className ? ` ${className}` : ""
      }`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 rounded bg-foreground/10 transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `calc((100% - ${0.25 + (count - 1) * 0.25}rem) / ${count})`,
          transform: `translateX(calc(${index * 100}% + ${index * 0.25}rem))`,
        }}
      />
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={option === value}
          className={`relative flex-1 rounded px-2 py-1 text-xs capitalize transition-colors duration-200 ${
            option === value ? "text-accent" : "opacity-60 hover:opacity-100"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
