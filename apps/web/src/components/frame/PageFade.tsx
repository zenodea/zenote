"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { endPageFade, usePageFading } from "@/lib/page-fade";

export function PageFade({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const fading = usePageFading();

  useEffect(() => {
    endPageFade();
  }, [pathname]);

  useEffect(() => endPageFade, []);

  return (
    <div
      className="page-fade flex min-h-0 flex-1 flex-col"
      data-fading={fading || undefined}
    >
      {children}
    </div>
  );
}
