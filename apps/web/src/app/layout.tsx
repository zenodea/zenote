import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AiAssistantProvider, AiPanel } from "@/components/AiAssistant";
import { FindBar } from "@/components/navigation/FindBar";
import { Junctions } from "@/components/frame/Junctions";
import { Sidebar } from "@/components/navigation/Sidebar";
import { ThemeFavicon } from "@/components/frame/ThemeFavicon";
import { getAllNotes } from "@/lib/notes";
import type { SearchDoc } from "@/lib/search";
import { noteTags } from "@/lib/tags";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const notes = await getAllNotes();
  const titles = Object.fromEntries(
    notes.map((note) => [note.slug, note.title]),
  );
  const docs: SearchDoc[] = notes.map((note) => ({
    slug: note.slug,
    title: note.title,
    tags: noteTags(note),
    body: note.body,
  }));

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
        <AiAssistantProvider>
          <Sidebar docs={docs} />
          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
            {children}
            <FindBar />
          </main>
          <AiPanel titles={titles} />
        </AiAssistantProvider>
        {/* Zed-style markers wherever data-seam separators intersect. */}
        <Junctions />
        <ThemeFavicon />
      </body>
    </html>
  );
}
