"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { LEAVE_MS } from "@/lib/frame";
import { prefersReducedMotion } from "@/lib/motion";
import { endLeaving, startLeaving } from "@/lib/stores/leaving";

const RECOVER_MS = 6000;

export function SignOutButton() {
  const form = useRef<HTMLFormElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!leaving) return;

    startLeaving();
    const submit = setTimeout(() => form.current?.requestSubmit(), LEAVE_MS);
    const recover = setTimeout(() => {
      setLeaving(false);
      endLeaving();
    }, LEAVE_MS + RECOVER_MS);

    return () => {
      clearTimeout(submit);
      clearTimeout(recover);
    };
  }, [leaving]);

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    if (leaving) {
      event.preventDefault();
      return;
    }
    if (prefersReducedMotion()) return;

    event.preventDefault();
    setLeaving(true);
  }

  return (
    <form ref={form} action={signOut}>
      <Button
        variant="solid"
        type="submit"
        onClick={onClick}
        className="shrink-0"
      >
        Sign out
      </Button>
    </form>
  );
}
