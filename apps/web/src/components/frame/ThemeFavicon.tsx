"use client";

import { useEffect } from "react";
import { iconSvg } from "@/lib/icon";
import { subscribeToTheme } from "@/lib/theme";

export function ThemeFavicon() {
  useEffect(() => {
    const LINK_ID = "zenote-theme-favicon";

    function update() {
      const style = getComputedStyle(document.documentElement);
      const accent = style.getPropertyValue("--accent").trim();

      // Installed, the theme is also the status bar: every meta gets the live value.
      const background = style.getPropertyValue("--background").trim();
      if (background) {
        for (const meta of document.querySelectorAll<HTMLMetaElement>(
          'meta[name="theme-color"]',
        )) {
          meta.content = background;
        }
      }

      if (!accent) return;

      let link = document.getElementById(LINK_ID) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = LINK_ID;
        link.rel = "icon";
        link.type = "image/svg+xml";
      }
      const href = `data:image/svg+xml,${encodeURIComponent(iconSvg(accent))}`;
      if (link.href !== href) link.href = href;
      if (link !== document.head.lastElementChild) {
        document.head.appendChild(link);
      }
    }

    update();
    const unsubscribeTheme = subscribeToTheme(update);
    const headObserver = new MutationObserver(update);
    headObserver.observe(document.head, { childList: true });
    return () => {
      unsubscribeTheme();
      headObserver.disconnect();
      document.getElementById(LINK_ID)?.remove();
    };
  }, []);

  return null;
}
