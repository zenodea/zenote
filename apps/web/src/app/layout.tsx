import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { getAllNotes } from "@/lib/notes";
import { THEME_IDS, THEME_STORAGE_KEY } from "@/lib/theme";
import { buildTree } from "@/lib/tree";
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
  title: "file-visualiser",
  description: "Read your notes online",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const tree = buildTree(await getAllNotes());

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="flex h-full">
        <Sidebar tree={tree} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
