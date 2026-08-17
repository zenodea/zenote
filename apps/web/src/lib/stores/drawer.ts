"use client";

import { createStore } from "../store";

/** The sidebar as a phone drawer. `newNote` is a request counter, not a flag. */
type Drawer = { open: boolean; newNote: number };

const store = createStore<Drawer>({ open: false, newNote: 0 });

export const useDrawer = store.use;
export const openDrawer = () => store.patch({ open: true });
export const closeDrawer = () => store.patch({ open: false });
export const toggleDrawer = () => store.patch({ open: !store.get().open });

/** Opens the drawer with the tree's new-note field already asking for a name. */
export const startNoteInDrawer = () =>
  store.set({ open: true, newNote: store.get().newNote + 1 });
