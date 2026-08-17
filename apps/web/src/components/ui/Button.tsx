import type { ButtonHTMLAttributes } from "react";

const VARIANTS = {
  icon: {
    // coarse: a 26px hit area is a mouse's, not a thumb's.
    base: "rounded p-1.5 coarse:flex coarse:min-h-11 coarse:min-w-11 coarse:items-center coarse:justify-center",
    idle: "opacity-60 hover:bg-foreground/10 hover:opacity-100 disabled:opacity-25 disabled:hover:bg-transparent",
  },
  solid: {
    base: "rounded px-3 py-1.5 font-medium",
    idle: "bg-foreground/10 hover:bg-foreground/15 disabled:opacity-40 disabled:hover:bg-foreground/10",
  },
  accent: {
    base: "rounded px-3 py-1.5 font-medium transition-opacity",
    idle: "bg-accent text-background hover:opacity-85 disabled:opacity-50 disabled:hover:opacity-50",
  },
  row: {
    base: "flex w-full items-center gap-1 rounded py-1.5 pr-2 text-left coarse:py-2.5",
    idle: "opacity-70 hover:bg-foreground/10",
  },
} as const;

const ACTIVE = "bg-foreground/10 text-accent";

export function iconClass(active = false): string {
  return `${VARIANTS.icon.base} ${active ? ACTIVE : VARIANTS.icon.idle}`;
}

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
