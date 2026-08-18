"use client";

import { useEffect, useState } from "react";

export function useLinger(value: boolean, ms: number): boolean {
  const [held, setHeld] = useState(value);

  if (value && !held) setHeld(true);

  useEffect(() => {
    if (value) return;
    const id = setTimeout(() => setHeld(false), ms);
    return () => clearTimeout(id);
  }, [value, ms]);

  return value || held;
}
