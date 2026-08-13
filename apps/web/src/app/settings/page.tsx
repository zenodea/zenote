import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SettingsForm } from "@/components/settings-form";
import { ThemeSettings } from "@/components/theme-settings";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />

      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide opacity-60">
            Document
          </h2>
          <SettingsForm />
        </section>

        <details className="group mt-10">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold uppercase tracking-wide opacity-60 hover:opacity-100 [&::-webkit-details-marker]:hidden">
            <span aria-hidden className="inline-block w-3">
              <span className="group-open:hidden">▸</span>
              <span className="hidden group-open:inline">▾</span>
            </span>
            Colour theme
          </summary>
          <div className="mt-4">
            <ThemeSettings />
          </div>
        </details>
      </div>
    </>
  );
}
