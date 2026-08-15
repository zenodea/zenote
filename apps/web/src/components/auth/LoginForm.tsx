"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { LogoIcon } from "@/components/ui/Icons";
import { Input } from "@/components/ui/Input";

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
      className="flex flex-col items-center gap-3 transition-opacity"
      style={{
        opacity: hidden ? 0 : 1,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      <LogoIcon />
      <h1 className="sr-only">Sign in to Zenote</h1>

      <Field name="email" type="email" label="Email" autoFocus />
      <Field name="password" type="password" label="Password" />

      <Button
        variant="solid"
        type="submit"
        disabled={busy}
        className="mt-1 w-full"
      >
        {busy ? "Opening your vault…" : "Sign in"}
      </Button>

      <p
        role="alert"
        className="min-h-[1.25rem] text-center text-sm text-red-500"
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
    <Input
      name={name}
      type={type}
      required
      autoFocus={autoFocus}
      autoComplete={type === "password" ? "current-password" : "email"}
      placeholder={label}
      aria-label={label}
      className="w-full py-1.5"
    />
  );
}
