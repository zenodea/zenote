import type { Note } from "../note";

export type Pending = "create" | "update" | null;

export type LocalNote = Note & {
  pending: Pending;
  localRev: number;
};

export type LocalFolder = {
  id: string;
  path: string;
  pending: Pending;
};

export type Tombstone = {
  id: string;
  table: "notes" | "folders";
  baseUpdated: string | null;
};
