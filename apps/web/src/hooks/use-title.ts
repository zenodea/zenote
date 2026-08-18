"use client";

import { useEffect } from "react";

export function useTitle(title: string | null) {
  useEffect(() => {
    document.title = title ? `${title} — Zenote` : "Zenote";
  }, [title]);
}
