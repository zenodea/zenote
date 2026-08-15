"use client";

import { useState } from "react";
import { sanitizeName } from "@/lib/slug";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export function RenameNoteModal({
  slug,
  onClose,
  onSubmit,
}: {
  slug: string;
  onClose: () => void;
  onSubmit: (next: string | null) => void;
}) {
  const [name, setName] = useState(slug);

  return (
    <Modal title="Rename note" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(sanitizeName(name));
        }}
        className="mt-3 flex flex-col gap-3"
      >
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="New note name"
          className="w-full"
        />
        <p className="text-xs opacity-60">
          Include a path to move it, e.g. ideas/spark.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 opacity-60 hover:bg-foreground/10 hover:opacity-100"
          >
            Cancel
          </button>
          <Button variant="solid" type="submit">
            Rename
          </Button>
        </div>
      </form>
    </Modal>
  );
}
