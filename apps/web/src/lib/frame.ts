// Keep in step with the body[data-leaving]/[data-entering] rules in app/styles/frame.css.
export const LEAVE_MS = 260;
export const ENTER_MS = 260;

export const HEADER_HEIGHT = 56;
export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 60;

// 1px border-t + p-2 around a 28px row; collapsed stacks three with gap-1. Cold login only.
export const FOOTER_HEIGHT = 45;
export const FOOTER_COLLAPSED_HEIGHT = 105;

export type PanelGeometry = {
  /** The assistant panel's left border. */
  x: number;
  /** Its input bar's top border; null while the panel has no input row. */
  foot: number | null;
};

export type Geometry = {
  /** Sidebar's right border. */
  x: number;
  /** Header's bottom border. */
  head: number;
  /** Sidebar footer's top border. */
  foot: number;
  sidebar: number;
  /** The assistant panel's edges, when it was open. */
  panel: PanelGeometry | null;
};

export function sidebarWidth(collapsed: boolean) {
  return collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
}

export function fallbackGeometry(
  collapsed: boolean,
  viewportHeight: number,
  rails = true,
): Geometry {
  // No sidebar on a phone: the header seam is the whole frame.
  if (!rails) {
    return {
      x: 0,
      head: HEADER_HEIGHT - 0.5,
      foot: viewportHeight,
      sidebar: 0,
      panel: null,
    };
  }

  const width = sidebarWidth(collapsed);
  const footer = collapsed ? FOOTER_COLLAPSED_HEIGHT : FOOTER_HEIGHT;

  return {
    x: width - 0.5,
    head: HEADER_HEIGHT - 0.5,
    foot: viewportHeight - footer + 0.5,
    sidebar: width,
    panel: null,
  };
}

// Scoped to the sidebar so other top/bottom seams can't match.
export function measureGeometry(): Geometry | null {
  const nav = document.querySelector<HTMLElement>('nav[data-seam="right"]');
  const head = nav?.querySelector<HTMLElement>('[data-seam="bottom"]');
  const foot = nav?.querySelector<HTMLElement>('[data-seam="top"]');
  if (!nav || !head || !foot) return null;

  const bar = nav.getBoundingClientRect();

  const panelEdge = document.querySelector<HTMLElement>(
    'aside[aria-label="AI assistant"] [data-seam="left"]',
  );
  const panelFoot = panelEdge?.querySelector<HTMLElement>('[data-seam="top"]');

  return {
    x: bar.right - 0.5,
    head: head.getBoundingClientRect().bottom - 0.5,
    foot: foot.getBoundingClientRect().top + 0.5,
    sidebar: bar.width,
    panel: panelEdge
      ? {
          x: panelEdge.getBoundingClientRect().left + 0.5,
          foot: panelFoot
            ? panelFoot.getBoundingClientRect().top + 0.5
            : null,
        }
      : null,
  };
}
