import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Frame } from "@/components/frame/Frame";
import { ThemeFavicon } from "@/components/frame/ThemeFavicon";
import { THEME_IDS, THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

// Runs before paint so the stored theme applies without a flash.
const themeInit = `(function () {
  try {
    var themes = ${JSON.stringify(THEME_IDS)};
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var theme = themes.indexOf(stored) >= 0
      ? stored
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? "default-dark"
        : "default-light";
    document.documentElement.dataset.theme = theme;
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
};

// Deliberately thin: this layout is shared with /login, so anything rendered
// here survives the sign-in navigation untouched. The signed-in chrome lives in
// (app)/layout.tsx, which mounts fresh on the way in.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="relative flex h-full overflow-hidden">
        {children}
        {/* Permanent: owns the seams and junction marks across both auth states. */}
        <Frame />
        <ThemeFavicon />
      </body>
    </html>
  );
}
