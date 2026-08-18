import type { EditorView } from "@codemirror/view";
import { getCM, vim } from "@replit/codemirror-vim";

export const vimExtensions = [vim({ status: true })];

export function adoptStatusBar(
  view: EditorView | null,
  bar: HTMLElement | null | undefined,
): boolean {
  const cm = view && getCM(view);
  if (!cm || !bar) return false;

  const state = cm.state as {
    statusbar?: HTMLElement;
    vimPlugin?: { updateStatus: () => void };
  };
  if (state.statusbar && state.statusbar !== bar) {
    state.statusbar.textContent = "";
  }
  state.statusbar = bar;
  state.vimPlugin?.updateStatus();
  return true;
}
