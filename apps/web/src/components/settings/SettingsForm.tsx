"use client";

import type { ReactNode } from "react";
import { SEARCH_MODES } from "@/lib/search";
import { updateSettings, useSettings } from "@/lib/stores/settings";
import { Segmented } from "@/components/ui/Segmented";

export function SettingsForm() {
  const settings = useSettings();

  return (
    <ul className="divide-y divide-foreground/15">
      <Row
        title="Linked from"
        description="Show the notes that link to the current note at the bottom of the document."
      >
        <Toggle
          checked={settings.showBacklinks}
          ariaLabel="Show Linked from section"
          onChange={(checked) => updateSettings({ showBacklinks: checked })}
        />
      </Row>
      <Row
        title="Graph"
        description="Show a local graph of linked notes at the bottom of the document."
      >
        <Toggle
          checked={settings.showGraph}
          ariaLabel="Show Graph section"
          onChange={(checked) => updateSettings({ showGraph: checked })}
        />
      </Row>
      <Row
        title="Start in editing mode"
        description="Open notes in the editor instead of the reading view. Empty notes always open in the editor."
      >
        <Toggle
          checked={settings.openInEditMode}
          ariaLabel="Start notes in editing mode"
          onChange={(checked) => updateSettings({ openInEditMode: checked })}
        />
      </Row>
      <Row
        title="Vim keybindings"
        description="Edit notes with Vim motions, operators and modes."
      >
        <Toggle
          checked={settings.vimMode}
          ariaLabel="Use Vim keybindings in the editor"
          onChange={(checked) => updateSettings({ vimMode: checked })}
        />
      </Row>
      <Row
        title="Search in"
        description="What sidebar search matches by default: note titles only, or note content too."
      >
        <Segmented
          options={SEARCH_MODES}
          value={settings.searchMode}
          onChange={(searchMode) => updateSettings({ searchMode })}
          ariaLabel="Default search mode"
          className="shrink-0"
          size="md"
        />
      </Row>
    </ul>
  );
}

export function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-6 py-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm opacity-60">{description}</p>
      </div>
      {children}
    </li>
  );
}

export function Toggle({
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
