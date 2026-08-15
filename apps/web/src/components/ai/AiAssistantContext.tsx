"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type AiAssistantState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
};

const AiAssistantContext = createContext<AiAssistantState | null>(null);

export function useAiAssistant(): AiAssistantState {
  const state = useContext(AiAssistantContext);
  if (!state) {
    throw new Error("AiAssistant components need an <AiAssistantProvider>.");
  }
  return state;
}

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const pathname = usePathname();

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <AiAssistantContext.Provider value={{ open, setOpen, busy, setBusy }}>
      {children}
    </AiAssistantContext.Provider>
  );
}
