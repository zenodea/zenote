import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { getAllNotes } from "@/lib/notes";
import { buildTree } from "@/lib/tree";
import "./globals.css";

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
    >
      <body className="flex h-full">
        <Sidebar tree={tree} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
