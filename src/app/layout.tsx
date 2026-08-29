import type { Metadata } from "next";
import { Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_Bengali({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["bengali", "latin"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TranscriptTube - YouTube Transcript Extractor & Video Sync",
  description:
    "Extract, search, and download YouTube video transcripts and subtitles with timestamps in seconds. Supports multi-language captions and synchronized video playback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSans.variable} dark`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${notoSans.className} antialiased bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 min-h-screen transition-colors duration-300 selection:bg-red-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
