import type { Metadata } from "next";
import { Geist, Geist_Mono, Figtree } from "next/font/google";
import localFont from "next/font/local";

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
  title: "unpolished - 99stud sample pack",
  description: "",
};

const drowner = localFont({
  src: "./fonts/drowner.woff2",
  variable: "--font-drowner-local",
});

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${drowner.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col cursor-crosshair">
        {children}
      </body>
    </html>
  );
}
