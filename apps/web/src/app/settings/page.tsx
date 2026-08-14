import type { Metadata } from "next";
import { ChevronIcon } from "@/components/ui/Icons";
import { PageHeader } from "@/components/frame/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { ThemeSettings } from "@/components/settings/ThemeSettings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl px-6 py-6">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
              Document
            </h2>
            <SettingsForm />
          </section>

          <details className="group mt-10">
            <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold uppercase tracking-wide opacity-60 hover:opacity-100 [&::-webkit-details-marker]:hidden">
              <ChevronIcon className="w-3 shrink-0 transition-transform group-open:rotate-90" />
              Colour theme
            </summary>
            <div className="mt-4">
              <ThemeSettings />
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
