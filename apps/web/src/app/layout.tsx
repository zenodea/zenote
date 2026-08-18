import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Frame } from "@/components/frame/Frame";
import { KeyboardInset } from "@/components/frame/KeyboardInset";
import { ThemeFavicon } from "@/components/frame/ThemeFavicon";
import { SETTINGS_STORAGE_KEY } from "@/lib/stores/settings";
import {
  DEFAULT_DARK_THEME,
  DEFAULT_THEME,
  THEME_IDS,
  THEME_STORAGE_KEY,
} from "@/lib/theme";
import "./globals.css";

const boot = `(function () {
  try {
    var themes = ${JSON.stringify(THEME_IDS)};
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme = themes.indexOf(stored) >= 0
      ? stored
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? ${JSON.stringify(DEFAULT_DARK_THEME)}
        : ${JSON.stringify(DEFAULT_THEME)};
    document.documentElement.dataset.theme = theme;
  } catch (error) {}

  try {
    var settings = JSON.parse(
      localStorage.getItem(${JSON.stringify(SETTINGS_STORAGE_KEY)}) || "{}",
    );
    if (settings.sidebarCollapsed) {
      document.documentElement.dataset.sidebar = "collapsed";
    }
  } catch (error) {}
})()`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Zenote", template: "%s — Zenote" },
  description: "Read your notes online",
  appleWebApp: { capable: true, title: "Zenote", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body className="relative flex h-full overflow-hidden">
        {children}
        <Frame />
        <KeyboardInset />
        <ThemeFavicon />
      </body>
    </html>
  );
}
