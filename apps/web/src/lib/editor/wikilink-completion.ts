import type {
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { WIKILINK_TARGET } from "@/lib/wikilinks";

const OPEN_TARGET = new RegExp(String.raw`\[\[(${WIKILINK_TARGET}*)$`);
const TARGET_TEXT = new RegExp(String.raw`^${WIKILINK_TARGET}*$`);

/** Completes `[[` with the vault's note titles, closing the link on pick. */
export function wikilinkCompletions(targets: string[]) {
  return (context: CompletionContext): CompletionResult | null => {
    const match = context.matchBefore(OPEN_TARGET);
    if (!match) return null;

    return {
      from: match.from + 2,
      options: targets.map((target) => ({
        label: target,
        apply: `${target}]]`,
      })),
      validFor: TARGET_TEXT,
    };
  };
}
