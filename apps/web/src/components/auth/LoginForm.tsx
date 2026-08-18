"use client";

import type { FormEvent } from "react";
import { Diamond } from "@/components/frame/Diamond";
import { Button } from "@/components/ui/Button";
import { LogoWordmark } from "@/components/ui/Icons";

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
      <h1>
        <LogoWordmark height={26} />
        <span className="sr-only">Zenote</span>
      </h1>

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
      className="block w-full bg-transparent px-3 py-2 placeholder:opacity-50 focus:shadow-[inset_2px_0_0_var(--accent)] focus:outline-none"
    />
  );
}
