import type { ReactNode } from "react";
import { Scroller } from "@/components/ui/Scroller";

export function PageBody({ children }: { children: ReactNode }) {
  return (
    <Scroller className="min-h-0 flex-1">
      <div className="mx-auto w-full max-w-3xl px-4 py-4 md:px-6 md:py-6">
        {children}
      </div>
    </Scroller>
  );
}

export function noteCount(total: number): string {
  return total === 1 ? "1 note" : `${total} notes`;
}
