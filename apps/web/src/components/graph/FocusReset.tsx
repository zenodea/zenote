"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { setGraphFocus } from "@/lib/stores/graph-focus";

/** Leaving the graph puts the selection down. */
export function FocusReset() {
  const pathname = usePathname();
  const lastRef = useRef(pathname);

  useEffect(() => {
    const last = lastRef.current;
    lastRef.current = pathname;
    if (last === "/graph" && pathname !== "/graph") {
      setGraphFocus([], "reader");
    }
  }, [pathname]);

  return null;
}
