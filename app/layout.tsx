import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "OneRemote v2 — The Walkable 3D Video Room",
  description: "A retro 3D video room that calculates which streaming platform covers your watchlist. CRT TVs, Famicom cartridges and VHS vibes.",
};

// ✅ FIX: Adds the missing viewport meta tag for mobile rendering
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505", // Matches your dark background
};

// ✅ FIX: Replaced LayoutProps with standard React.ReactNode to prevent TS errors
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}