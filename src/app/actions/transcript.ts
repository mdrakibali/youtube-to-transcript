"use server";

import { extractVideoId, fetchYouTubeTranscript, type TranscriptResponse } from "@/lib/youtube";
import { fetchTranscriptViaYoutubeTranscript } from "@/lib/youtube-transcript";

export interface TranscriptActionResult {
  success: boolean;
  data?: TranscriptResponse;
  error?: string;
  message?: string;
}

/**
 * Next.js Server Action to fetch YouTube transcripts with dual-engine fallback.
 * Engine 1: InnerTube Android + Web scraping (Full metadata & multi-language)
 * Engine 2: youtube-transcript package (Secondary extractor)
 */
export async function getTranscriptAction(input: {
  url: string;
  lang?: string;
  cookie?: string;
}): Promise<TranscriptActionResult> {
  try {
    const { url, lang, cookie } = input;

    if (!url || typeof url !== "string" || !url.trim()) {
      return {
        success: false,
        error: "INVALID_INPUT",
        message: "Please provide a valid YouTube video URL.",
      };
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return {
        success: false,
        error: "INVALID_URL",
        message:
          "Invalid YouTube URL. Please provide a standard watch, youtu.be, embed, or shorts link.",
      };
    }

    // Support optional environment variable cookie
    const effectiveCookie = cookie?.trim() || process.env.YOUTUBE_COOKIE;

    // 1. Try Primary Engine (InnerTube + Web Scraper)
    try {
      const data = await fetchYouTubeTranscript(videoId, {
        lang: lang === "default" ? undefined : lang,
        cookie: effectiveCookie,
      });

      return {
        success: true,
        data,
      };
    } catch (primaryError: unknown) {
      console.warn("Primary transcript engine failed, trying secondary youtube-transcript engine:", primaryError);

      // 2. Fallback to Secondary Engine (youtube-transcript)
      try {
        const fallbackData = await fetchTranscriptViaYoutubeTranscript(videoId, lang);
        return {
          success: true,
          data: fallbackData,
        };
      } catch (fallbackError: unknown) {
        console.error("Secondary transcript engine also failed:", fallbackError);
        // Throw original primary error to provide best error message
        throw primaryError;
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";

    let errorCode = "INTERNAL_ERROR";
    if (errorMessage.startsWith("NO_TRANSCRIPT:")) {
      errorCode = "NO_TRANSCRIPT";
    } else if (errorMessage.startsWith("PRIVATE_VIDEO:")) {
      errorCode = "PRIVATE_VIDEO";
    }

    return {
      success: false,
      error: errorCode,
      message: errorMessage.replace(/^[A-Z_]+:\s*/, ""),
    };
  }
}
