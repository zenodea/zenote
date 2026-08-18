"use client";

import { createStore } from "../store";

const store = createStore(false);

export const useGraphReady = store.use;
export const setGraphReady = store.set;
