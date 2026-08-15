"use client";

import { useState, type KeyboardEvent } from "react";

export function useListNavigation(
  length: number,
  onSelect: (index: number) => void,
) {
  const [active, setActive] = useState(0);
  const highlighted = Math.min(active, Math.max(length - 1, 0));

  function onKeyDown(event: KeyboardEvent) {
    if (length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((highlighted + 1) % length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((highlighted - 1 + length) % length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      onSelect(highlighted);
    }
  }

  return { highlighted, setActive, onKeyDown };
}
