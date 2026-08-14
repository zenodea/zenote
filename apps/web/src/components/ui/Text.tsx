import type { ReactNode } from "react";

const variants = {
  body: "",
  strong: "font-medium",
  muted: "text-sm opacity-60",
} as const;

export type TextVariant = keyof typeof variants;

type TextProps = {
  variant?: TextVariant;
  className?: string;
  children: ReactNode;
};

export function Text({ variant = "body", className, children }: TextProps) {
  const classes = [variants[variant], className].filter(Boolean).join(" ");
  return <span className={classes || undefined}>{children}</span>;
}
