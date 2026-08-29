import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TranscriptTube - Fast YouTube Transcript & Video Sync",
  description:
    "Extract, search, and download YouTube video transcripts and subtitles with timestamps in seconds. Supports multi-language captions and synchronized video playback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={hindSiliguri.variable}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${hindSiliguri.className} antialiased bg-[#09090b] text-neutral-100 min-h-screen font-sans`}
      >
        {children}
      </body>
    </html>
  );
}
