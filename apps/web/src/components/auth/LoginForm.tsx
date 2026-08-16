"use client";

import type { FormEvent } from "react";
import { Diamond } from "@/components/frame/Diamond";
import { Button } from "@/components/ui/Button";
import { LogoIcon } from "@/components/ui/Icons";

export function LoginForm({
  busy,
  error,
  hidden,
  delay,
  duration,
  onSubmit,
}: {
  busy: boolean;
  error: string | null;
  hidden: boolean;
  delay: number;
  duration: number;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      inert={hidden}
      className="flex flex-col items-center gap-4 transition-opacity"
      style={{
        opacity: hidden ? 0 : 1,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <LogoIcon />
        Zenote
      </h1>

      {/* One hairline block with junction marks, the same chrome as Modal —
          two separate boxes read as a different app inside the frame. */}
      <div className="relative w-full border border-foreground/15">
        <Diamond className="left-0 top-0" />
        <Diamond className="left-full top-0" />
        <Diamond className="left-0 top-full" />
        <Diamond className="left-full top-full" />

        <Field name="email" type="email" label="Email" autoFocus />
        <div aria-hidden className="h-px bg-foreground/15" />
        <Field name="password" type="password" label="Password" />
      </div>

      <Button variant="accent" type="submit" disabled={busy} className="w-full">
        {busy ? "Opening your vault…" : "Sign in"}
      </Button>

      <p
        role="alert"
        className="min-h-[1.25rem] text-center text-sm text-danger"
      >
        {error}
      </p>
    </form>
  );
}

function Field({
  name,
  type,
  label,
  autoFocus,
}: {
  name: string;
  type: string;
  label: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      name={name}
      type={type}
      required
      autoFocus={autoFocus}
      autoComplete={type === "password" ? "current-password" : "email"}
      placeholder={label}
      aria-label={label}
      // An inset rule rather than a ring: it marks which field has focus
      // without thickening the block the diamond has to fit around.
      className="block w-full bg-transparent px-3 py-2 placeholder:opacity-50 focus:shadow-[inset_2px_0_0_var(--accent)] focus:outline-none"
    />
  );
}
