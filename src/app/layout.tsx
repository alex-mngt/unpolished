import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

import { readSiteConfig } from "@/lib/site/config";
import {
  NO_INDEX_ROBOTS,
  OPEN_GRAPH,
  SITE_DESCRIPTION,
  SITE_TITLE,
} from "@/lib/site/metadata";

import "./globals.css";

const site = readSiteConfig();

export const metadata: Metadata = {
  metadataBase: site.url,
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: OPEN_GRAPH,
  // Next.js fills the Twitter title and description from Open Graph.
  twitter: { card: "summary_large_image" },
  robots: site.indexable ? { index: true, follow: true } : NO_INDEX_ROBOTS,
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const herbusBold = localFont({
  src: "./assets/fonts/Herbus-Bold.woff2",
  weight: "700",
  variable: "--font-herbus-bold-local",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${herbusBold.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col cursor-crosshair">
        {children}
      </body>
    </html>
  );
}
