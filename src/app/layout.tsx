import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";

export const metadata: Metadata = {
  title: "unpolished - 99stud sample pack",
  description: "",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
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
