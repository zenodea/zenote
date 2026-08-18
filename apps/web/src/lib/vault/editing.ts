"use client";

let editingId: string | null = null;
let dirty = false;

export function setEditingNote(id: string | null): void {
  if (id !== editingId) dirty = false;
  editingId = id;
}

export function markEditingDirty(): void {
  dirty = true;
}

export function dirtyEditingId(): string | null {
  return dirty ? editingId : null;
}
