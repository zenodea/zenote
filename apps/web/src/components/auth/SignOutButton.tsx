"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { LEAVE_MS } from "@/lib/frame";
import { endLeaving, startLeaving } from "@/lib/leaving";

// A successful sign-out unmounts this button, which cancels both timers below.
// Still being here well after that means the action failed, and the chrome is
// sitting at opacity 0 with nothing coming to replace it.
const RECOVER_MS = 6000;

export function SignOutButton() {
  const form = useRef<HTMLFormElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!leaving) return;

    // Hold the submit while the chrome fades and Frame takes over the seams.
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
    // Anything that isn't "submit right now" has to stop the native submit --
    // otherwise a second click posts the action again, mid-fade.
    if (leaving) {
      event.preventDefault();
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
