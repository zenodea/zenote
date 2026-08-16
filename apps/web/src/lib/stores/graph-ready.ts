"use client";

import { createStore } from "../store";

// False on the server too, so chrome that waits on the graph is absent rather than taken away.
const store = createStore(false);

export const useGraphReady = store.use;
export const setGraphReady = store.set;
