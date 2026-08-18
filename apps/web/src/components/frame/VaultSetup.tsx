"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Text } from "@/components/ui/Text";
import { useTitle } from "@/hooks/use-title";
import { createVault } from "@/lib/vault/vaults";

export function VaultSetup() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useTitle(null);

  async function submit() {
    if (busy) return;
    setBusy(true);
    await createVault(name);
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-semibold">Create a vault</h1>
        <Text variant="muted" className="mt-1 block">
          Your notes live in a vault on this device. Sign in later to sync it.
        </Text>
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
          placeholder="Vault name…"
          aria-label="Vault name"
          className="mt-4 w-full"
        />
        <div className="mt-4 flex items-center justify-between">
          <Button variant="accent" onClick={() => void submit()} disabled={busy}>
            Create vault
          </Button>
          <Link href="/login" className="text-sm underline hover:opacity-70">
            Sign in instead
          </Link>
        </div>
      </div>
    </div>
  );
}
