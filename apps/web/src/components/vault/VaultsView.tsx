"use client";

import { useEffect, useState } from "react";
import { SignInButton } from "@/components/auth/SignInButton";
import { PageHeader } from "@/components/frame/PageHeader";
import { Row } from "@/components/settings/SettingsForm";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Scroller } from "@/components/ui/Scroller";
import { useTitle } from "@/hooks/use-title";
import { useSyncState } from "@/lib/stores/sync-status";
import type { VaultEntry } from "@/lib/vault/registry";
import { useVault } from "@/lib/vault/store";
import {
  attachVault,
  createVault,
  listServerVaults,
  removeVaultFromDevice,
  renameVault,
  switchVault,
  syncVaultUp,
} from "@/lib/vault/vaults";

function when(iso: string | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Section({
  title,
  children,
  first = false,
}: {
  title: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <section className={first ? undefined : "mt-10"}>
      <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
        {title}
      </h2>
      {children}
    </section>
  );
}

function RenameRow({ vault }: { vault: VaultEntry }) {
  const [name, setName] = useState(vault.name);

  return (
    <Row
      title="Name"
      description="Renaming keeps every note, link and device pointed at it."
    >
      <div className="flex min-w-0 items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void renameVault(name);
          }}
          aria-label="Vault name"
          className="w-44 min-w-0"
        />
        <Button
          variant="solid"
          onClick={() => void renameVault(name)}
          disabled={!name.trim() || name.trim() === vault.name}
        >
          Rename
        </Button>
      </div>
    </Row>
  );
}

function SyncRow({
  vault,
  ownerId,
}: {
  vault: VaultEntry;
  ownerId: string | null;
}) {
  const state = useSyncState();
  const synced = when(vault.lastSyncedAt);

  if (!vault.synced) {
    return (
      <Row
        title="Only on this device"
        description={
          ownerId
            ? "Sync it to your account to reach it anywhere."
            : "Sign in to sync it to your account."
        }
      >
        {ownerId ? (
          <Button variant="accent" onClick={() => void syncVaultUp()}>
            Sync vault
          </Button>
        ) : (
          <SignInButton className="shrink-0" />
        )}
      </Row>
    );
  }

  return (
    <Row
      title="Synced to your account"
      description={
        state === "syncing"
          ? "Syncing…"
          : synced
            ? `Last synced ${synced}.`
            : "Waiting for the first sync."
      }
    >
      <span aria-hidden className="pr-1.5 opacity-60">
        <span
          className={`inline-block h-2 w-2 rotate-45 border border-current ${
            state === "synced" ? "bg-current" : ""
          }`}
        />
      </span>
    </Row>
  );
}

export function VaultsView() {
  const { vault, vaults, ownerId, notes, folders, desktop } = useVault();
  const [creating, setCreating] = useState("");
  const [remote, setRemote] = useState<{ id: string; name: string }[]>([]);
  useTitle("Vaults");

  useEffect(() => {
    if (!ownerId) return;
    let alive = true;
    listServerVaults()
      .then((rows) => alive && setRemote(rows))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [ownerId]);

  const attachable = remote.filter(
    (row) => !vaults.some((entry) => entry.id === row.id),
  );
  const everywhere = [
    ...vaults.map((entry) => ({ id: entry.id, name: entry.name, entry })),
    ...attachable.map((row) => ({ ...row, entry: null })),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const pending = notes.filter((note) => note.pending !== null).length;

  return (
    <>
      <PageHeader
        title="Vaults"
        meta={
          <span>
            {desktop
              ? `${vaults.length === 1 ? "1 vault" : `${vaults.length} vaults`} on this device`
              : `${everywhere.length === 1 ? "1 vault" : `${everywhere.length} vaults`} on your account`}
          </span>
        }
      />

      <Scroller className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-3xl px-6 py-6">
          {vault && (
            <Section title="This vault" first>
              <ul className="divide-y divide-foreground/15">
                <RenameRow key={vault.id} vault={vault} />
                <SyncRow vault={vault} ownerId={ownerId} />
                <Row
                  title="Contents"
                  description={`${notes.length === 1 ? "1 note" : `${notes.length} notes`} · ${
                    folders.length === 1 ? "1 folder" : `${folders.length} folders`
                  }${pending > 0 ? ` · ${pending} waiting to sync` : ""}`}
                >
                  <span />
                </Row>
              </ul>
            </Section>
          )}

          {!desktop && (
            <Section title="Your vaults">
              <ul className="divide-y divide-foreground/15">
                {everywhere.map(({ id, name, entry }) => {
                  const active = id === vault?.id;
                  const opened = when(entry?.lastOpened);
                  return (
                    <li key={id} className="py-1">
                      <button
                        type="button"
                        onClick={() =>
                          void (entry
                            ? switchVault(entry.id)
                            : attachVault({ id, name }))
                        }
                        className="group w-full py-3 text-left"
                      >
                        <p
                          className={`flex items-center gap-2 font-medium ${
                            active ? "text-accent" : "group-hover:text-accent"
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`h-2 w-2 shrink-0 rotate-45 border border-current ${
                              active ? "bg-current" : ""
                            }`}
                          />
                          <span className="truncate">{name}</span>
                        </p>
                        <p className="mt-1 text-sm opacity-60">
                          {active
                            ? "Open now"
                            : opened
                              ? `Last opened ${opened}`
                              : "Click to open"}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {desktop && (
          <Section title="On this device">
            <ul className="divide-y divide-foreground/15">
              {vaults.map((entry) => {
                const active = entry.id === vault?.id;
                const opened = when(entry.lastOpened);
                return (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-6 py-4"
                  >
                    <button
                      type="button"
                      onClick={() => void switchVault(entry.id)}
                      className="group min-w-0 flex-1 text-left"
                    >
                      <p
                        className={`flex items-center gap-2 font-medium ${
                          active ? "text-accent" : "group-hover:text-accent"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`h-2 w-2 shrink-0 rotate-45 border border-current ${
                            active ? "bg-current" : ""
                          }`}
                        />
                        <span className="truncate">{entry.name}</span>
                      </p>
                      <p className="mt-1 text-sm opacity-60">
                        {[
                          active
                            ? "Open now"
                            : opened
                              ? `Last opened ${opened}`
                              : "Not opened yet",
                          entry.synced ? "synced" : "only on this device",
                        ].join(" · ")}
                      </p>
                    </button>
                    {!active && vaults.length > 1 && (
                      <Button
                        variant="solid"
                        className="shrink-0"
                        onClick={() => {
                          if (
                            entry.synced ||
                            confirm(
                              `“${entry.name}” only exists on this device. Delete it for good?`,
                            )
                          ) {
                            void removeVaultFromDevice(entry.id);
                          }
                        }}
                      >
                        {entry.synced ? "Remove from device" : "Delete"}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
          )}

          {desktop && attachable.length > 0 && (
            <Section title="On your account">
              <ul className="divide-y divide-foreground/15">
                {attachable.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-6 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{row.name}</p>
                      <p className="mt-1 text-sm opacity-60">
                        Synced, but not on this device yet.
                      </p>
                    </div>
                    <Button variant="solid" onClick={() => void attachVault(row)}>
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="New vault">
            <div className="flex items-center gap-3 py-4">
              <Input
                value={creating}
                onChange={(event) => setCreating(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && creating.trim()) {
                    void createVault(creating);
                  }
                }}
                placeholder="Vault name…"
                aria-label="New vault name"
                className="min-w-0 flex-1"
              />
              <Button
                variant="solid"
                onClick={() => void createVault(creating)}
                disabled={!creating.trim()}
              >
                Create
              </Button>
            </div>
          </Section>
        </div>
      </Scroller>
    </>
  );
}
