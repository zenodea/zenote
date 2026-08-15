import type { ComponentProps } from "react";

export const INPUT_CLASS =
  "rounded border border-foreground/15 bg-background px-2 py-1 placeholder:opacity-50 focus:border-foreground/40 focus:outline-none";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return (
    <input
      className={`${INPUT_CLASS}${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}
