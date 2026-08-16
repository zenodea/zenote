"use client";

import { Row, Toggle } from "@/components/settings/SettingsForm";
import { updateSettings, useSettings } from "@/lib/stores/settings";

export function AssistantSettings() {
  const settings = useSettings();

  return (
    <ul className="divide-y divide-foreground/15">
      <Row
        title="Can change the vault"
        description="Let the AI propose new notes, additions and moves — each one still waits for your approval."
      >
        <Toggle
          checked={settings.aiWrites}
          ariaLabel="Allow the assistant to change the vault"
          onChange={(checked) => updateSettings({ aiWrites: checked })}
        />
      </Row>
      <Row
        title="Answer from notes only"
        description="When your notes don't cover something, the assistant says so and stops, instead of answering from general knowledge."
      >
        <Toggle
          checked={settings.aiVaultOnly}
          ariaLabel="Answer from notes only"
          onChange={(checked) => updateSettings({ aiVaultOnly: checked })}
        />
      </Row>
    </ul>
  );
}
