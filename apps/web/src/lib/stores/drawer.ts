"use client";

import { createStore } from "../store";

type Drawer = { open: boolean };

const store = createStore<Drawer>({ open: false });

export const useDrawer = store.use;
export const openDrawer = () => store.patch({ open: true });
export const closeDrawer = () => store.patch({ open: false });
export const toggleDrawer = () => store.patch({ open: !store.get().open });
