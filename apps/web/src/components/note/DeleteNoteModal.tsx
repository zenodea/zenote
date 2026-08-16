"use client";

import { Modal } from "@/components/ui/Modal";

export function DeleteNoteModal({
  title,
  onClose,
  onConfirm,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Delete note" onClose={onClose}>
      <p className="mt-3 opacity-70">
        Delete “{title}”? This cannot be undone.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 opacity-60 hover:bg-foreground/10 hover:opacity-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded border border-[#ef4444]/40 px-3 py-1.5 font-medium text-[#ef4444] hover:bg-[#ef4444]/10"
        >
          Delete
        </button>
      </div>
    </Modal>
  );
}
