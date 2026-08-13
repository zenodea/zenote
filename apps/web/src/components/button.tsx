import type { ButtonHTMLAttributes } from "react";

/**
 * Shared button. `active` swaps the idle look for the pressed style of the
 * AI-assistant toggle (accent text on a foreground wash), regardless of
 * variant. Sizing quirks (shrink-0, widths) come in through className.
 */
const VARIANTS = {
  /** Toolbar glyph: dim until hovered or active. */
  icon: {
    base: "rounded p-1.5",
    idle: "opacity-60 hover:bg-foreground/10 hover:opacity-100 disabled:opacity-25 disabled:hover:bg-transparent",
  },
  /** Form action: filled pill, e.g. Send. */
  solid: {
    base: "rounded px-3 py-1.5 font-medium",
    idle: "bg-foreground/10 hover:bg-foreground/15 disabled:opacity-40 disabled:hover:bg-foreground/10",
  },
  /** Full-width list row, e.g. sidebar folders. */
  row: {
    base: "flex w-full items-center gap-1 rounded py-1 text-left",
    idle: "opacity-70 hover:bg-foreground/10",
  },
} as const;

const ACTIVE = "bg-foreground/10 text-accent";

export function Button({
  variant = "icon",
  active = false,
  type = "button",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  active?: boolean;
}) {
  const styles = VARIANTS[variant];
  return (
    <button
      type={type}
      className={`${styles.base} ${active ? ACTIVE : styles.idle}${
        className ? ` ${className}` : ""
      }`}
      {...rest}
    />
  );
}
