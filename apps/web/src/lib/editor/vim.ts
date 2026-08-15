import type { EditorView } from "@codemirror/view";
import { getCM, vim } from "@replit/codemirror-vim";

// status:true hosts vim's mode/keys/dialogs in a statusbar we retarget.
export const vimExtensions = [vim({ status: true })];

/** Points vim's statusbar at the app footer instead of the in-editor panel. */
export function adoptStatusBar(
  view: EditorView | null,
  bar: HTMLElement | null | undefined,
) {
  const cm = view && getCM(view);
  if (!cm || !bar) return;

  const state = cm.state as {
    statusbar?: HTMLElement;
    vimPlugin?: { updateStatus: () => void };
  };
  // The in-editor panel may hold stale mode text from before adoption.
  if (state.statusbar && state.statusbar !== bar) {
    state.statusbar.textContent = "";
  }
  state.statusbar = bar;
  state.vimPlugin?.updateStatus();
}
