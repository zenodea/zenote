"use client";

import { Row, Toggle } from "@/components/settings/SettingsForm";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import {
  AI_PROVIDER_KEY_HINTS,
  AI_PROVIDER_LABELS,
  AI_PROVIDER_MODELS,
  AI_PROVIDERS,
  type AiProvider,
} from "@/lib/ai-providers";
import {
  aiKeyOf,
  aiModelOf,
  aiProviderOf,
  setAiKey,
  setAiModel,
  updateSettings,
  useSettings,
} from "@/lib/stores/settings";

function ProviderChoice({
  provider,
  active,
  onSelect,
}: {
  provider: AiProvider;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm ${
        active
          ? "bg-foreground/10 text-accent"
          : "opacity-60 hover:bg-foreground/10 hover:opacity-100"
      }`}
    >
      <span
        aria-hidden
        className={`size-2 shrink-0 rotate-45 border transition-colors ${
          active ? "border-accent bg-accent" : "border-foreground/40"
        }`}
      />
      {AI_PROVIDER_LABELS[provider]}
    </button>
  );
}

function ModelPicker({
  provider,
  model,
}: {
  provider: AiProvider;
  model: string;
}) {
  const known = AI_PROVIDER_MODELS[provider];
  const options = known.includes(model) ? known : [model, ...known];

  return (
    <Dropdown
      label={<span className="font-mono text-xs">{model}</span>}
      ariaLabel="Assistant model"
      align="right"
      triggerClassName="max-w-full truncate rounded border border-foreground/15 bg-background px-2.5 py-1.5 opacity-70 hover:opacity-100"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="menuitem"
          onClick={() => setAiModel(provider, option)}
          className={`block w-full rounded px-2 py-1.5 text-left font-mono text-xs hover:bg-foreground/10 ${
            option === model ? "text-accent" : ""
          }`}
        >
          {option}
        </button>
      ))}
    </Dropdown>
  );
}

export function AssistantSettings() {
  const settings = useSettings();
  const provider = aiProviderOf(settings);
  const model = aiModelOf(settings, provider);
  const key = aiKeyOf(settings, provider);

  return (
    <ul className="divide-y divide-foreground/15">
      <li className="py-4">
        <p className="font-medium">Provider</p>
        <p className="mt-1 text-sm opacity-60">
          Who answers. Each provider keeps its own key and model.
        </p>
        <div role="radiogroup" className="mt-3 grid gap-1 sm:grid-cols-2">
          {AI_PROVIDERS.map((option) => (
            <ProviderChoice
              key={option}
              provider={option}
              active={option === provider}
              onSelect={() => updateSettings({ aiProvider: option })}
            />
          ))}
        </div>
      </li>
      <Row
        title={`${AI_PROVIDER_LABELS[provider]} key`}
        description={`Kept with your account, never in the repository. Make one at ${AI_PROVIDER_KEY_HINTS[provider]}.`}
      >
        <Input
          type="password"
          value={key}
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste a key"
          aria-label={`${AI_PROVIDER_LABELS[provider]} API key`}
          onChange={(event) => setAiKey(provider, event.target.value)}
          className="w-full min-w-0 font-mono text-xs sm:w-56"
        />
      </Row>
      <Row
        title="Model"
        description={
          provider === "openrouter"
            ? "Any model slug OpenRouter serves, such as anthropic/claude-opus-5."
            : "Which model of theirs to ask."
        }
      >
        {provider === "openrouter" ? (
          <Input
            value={model}
            autoComplete="off"
            spellCheck={false}
            placeholder="vendor/model"
            aria-label="Assistant model"
            onChange={(event) => setAiModel(provider, event.target.value)}
            className="w-full min-w-0 font-mono text-xs sm:w-56"
          />
        ) : (
          <ModelPicker provider={provider} model={model} />
        )}
      </Row>
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
