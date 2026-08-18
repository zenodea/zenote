"use client";

import { createStore } from "../store";

export type SyncState = "synced" | "syncing" | "offline" | "error" | "local";

const store = createStore<SyncState>("synced");

export const useSyncState = store.use;
export const setSyncState = store.set;
export const getSyncState = store.get;
