export const LEAVE_MS = 260;
export const ENTER_MS = 260;

export const HEADER_HEIGHT = 56;
export const SIDEBAR_WIDTH = 256;
export const SIDEBAR_COLLAPSED_WIDTH = 60;

export const FOOTER_HEIGHT = 45;

export type PanelGeometry = {
  x: number;
  foot: number | null;
};

export type Geometry = {
  x: number;
  head: number;
  foot: number;
  sidebar: number;
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

  return {
    x: width - 0.5,
    head: HEADER_HEIGHT - 0.5,
    foot: viewportHeight - FOOTER_HEIGHT + 0.5,
    sidebar: width,
    panel: null,
  };
}

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
