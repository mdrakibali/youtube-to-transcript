import type { Metadata } from "next";
import { Noto_Sans, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSansBengali = Noto_Sans_Bengali({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["bengali"],
  variable: "--font-noto-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TranscriptTube - YouTube Transcript Extractor & Video Tools",
  description:
    "Extract, search, and download YouTube video transcripts and subtitles with timestamps in seconds. Supports multi-language captions and synchronized video playback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSansBengali.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${notoSans.className} ${notoSansBengali.className} antialiased bg-[#fcfcfd] dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 min-h-screen transition-colors duration-200 selection:bg-red-500 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
