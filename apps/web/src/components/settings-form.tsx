"use client";

import { updateSettings, useSettings } from "@/lib/settings";

export function SettingsForm() {
  const settings = useSettings();

  return (
    <ul className="divide-y divide-foreground/15">
      <li className="flex items-center justify-between gap-6 py-4">
        <div>
          <p className="font-medium">Linked from</p>
          <p className="mt-1 text-sm opacity-60">
            Show the notes that link to the current note at the bottom of the
            document.
          </p>
        </div>
        <Toggle
          checked={settings.showBacklinks}
          ariaLabel="Show Linked from section"
          onChange={(checked) => updateSettings({ showBacklinks: checked })}
        />
      </li>
    </ul>
  );
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-foreground/25"
      }`}
    >
      <span
        aria-hidden
        className={`absolute top-1 size-3 rounded-full bg-background transition-[left] ${
          checked ? "left-5" : "left-1"
        }`}
      />
    </button>
  );
}
