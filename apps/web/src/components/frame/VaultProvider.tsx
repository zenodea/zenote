"use client";

import { useEffect, type ReactNode } from "react";
import { interceptLinkClicks } from "@/lib/navigation";
import { bootVault } from "@/lib/vault/boot";
import { vaultStore } from "@/lib/vault/store";

let booting: Promise<void> | null = null;

export function VaultProvider({
  desktop,
  children,
}: {
  desktop: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    vaultStore.patch({ desktop });
    booting ??= bootVault().finally(() => {
      booting = null;
    });
    return interceptLinkClicks();
  }, [desktop]);

  return children;
}
