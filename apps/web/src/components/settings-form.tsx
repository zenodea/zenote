"use client";

import { SEARCH_MODES } from "@/lib/search";
import { updateSettings, useSettings } from "@/lib/settings";
import { Segmented } from "@/components/segmented";

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
      <li className="flex items-center justify-between gap-6 py-4">
        <div>
          <p className="font-medium">Start in editing mode</p>
          <p className="mt-1 text-sm opacity-60">
            Open notes in the editor instead of the reading view. Empty notes
            always open in the editor.
          </p>
        </div>
        <Toggle
          checked={settings.openInEditMode}
          ariaLabel="Start notes in editing mode"
          onChange={(checked) => updateSettings({ openInEditMode: checked })}
        />
      </li>
      <li className="flex items-center justify-between gap-6 py-4">
        <div>
          <p className="font-medium">Vim keybindings</p>
          <p className="mt-1 text-sm opacity-60">
            Edit notes with Vim motions, operators and modes.
          </p>
        </div>
        <Toggle
          checked={settings.vimMode}
          ariaLabel="Use Vim keybindings in the editor"
          onChange={(checked) => updateSettings({ vimMode: checked })}
        />
      </li>
      <li className="flex items-center justify-between gap-6 py-4">
        <div>
          <p className="font-medium">Search in</p>
          <p className="mt-1 text-sm opacity-60">
            What sidebar search matches by default: note titles only, or note
            content too.
          </p>
        </div>
        <Segmented
          options={SEARCH_MODES}
          value={settings.searchMode}
          onChange={(searchMode) => updateSettings({ searchMode })}
          ariaLabel="Default search mode"
          className="shrink-0"
          size="md"
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
