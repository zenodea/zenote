"use client";

import type { ReactNode } from "react";
import { SEARCH_MODES } from "@/lib/search";
import { updateSettings, useSettings } from "@/lib/stores/settings";
import { useTouchPhone } from "@/hooks/use-media-query";
import { Segmented } from "@/components/ui/Segmented";

export function SettingsForm() {
  const settings = useSettings();
  const touchPhone = useTouchPhone();

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
      {!touchPhone && (
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
      )}
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
      className="relative h-6 w-12 shrink-0"
    >
      <svg
        aria-hidden
        viewBox="0 0 40 20"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M1 10 L10 1 H30 L39 10 L30 19 H10 Z"
          className={`transition-colors duration-200 ${
            checked
              ? "fill-accent/10 stroke-accent/50"
              : "fill-foreground/5 stroke-foreground/20"
          }`}
        />
      </svg>
      <span
        aria-hidden
        className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border transition-[left,background-color,border-color] duration-200 motion-reduce:transition-none ${
          checked
            ? "left-[calc(100%-1.05rem)] border-accent bg-accent"
            : "left-[1.05rem] border-foreground/40 bg-background"
        }`}
      />
    </button>
  );
}
