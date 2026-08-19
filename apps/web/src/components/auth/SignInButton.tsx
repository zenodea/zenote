"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LEAVE_MS } from "@/lib/frame";
import { prefersReducedMotion } from "@/lib/motion";
import { startLeaving } from "@/lib/stores/leaving";

const DESTINATION = "/login?from=vault";

export function SignInButton({
  variant = "accent",
  className,
  children,
}: {
  variant?: "accent" | "solid" | "row";
  className?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!leaving) return;
    startLeaving();
    const go = setTimeout(() => router.push(DESTINATION), LEAVE_MS);
    return () => clearTimeout(go);
  }, [leaving, router]);

  function onClick() {
    if (leaving) return;
    if (prefersReducedMotion()) {
      router.push(DESTINATION);
      return;
    }
    setLeaving(true);
  }

  return (
    <Button variant={variant} onClick={onClick} className={className}>
      {children ?? "Sign in"}
    </Button>
  );
}
