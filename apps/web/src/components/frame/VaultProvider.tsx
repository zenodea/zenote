"use client";

import { useEffect, type ReactNode } from "react";
import { interceptLinkClicks } from "@/lib/navigation";
import { bootVault } from "@/lib/vault/boot";

let booting: Promise<void> | null = null;

export function VaultProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    booting ??= bootVault().finally(() => {
      booting = null;
    });
    return interceptLinkClicks();
  }, []);

  return children;
}
