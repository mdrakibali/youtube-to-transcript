"use server";

import {
  extractVideoId,
  fetchYouTubeTranscript,
  fetchTranscriptViaYoutubeTranscript,
  type TranscriptResponse,
} from "@/lib/youtube-transcript";

export interface TranscriptActionResult {
  success: boolean;
  data?: TranscriptResponse;
  error?: string;
  message?: string;
}

/**
 * Next.js Server Action to fetch YouTube transcripts with dual-engine fallback.
 * Primary: Multi-Track InnerTube & Web Engine (Smart language selection & full metadata)
 * Fallback: youtube-transcript package engine
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

    // 1. Try Primary Engine (Smart Language Selection & Multi-Track InnerTube)
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
      console.warn("Primary engine failed, falling back to secondary engine:", primaryError);

      // 2. Fallback to Secondary Engine (youtube-transcript)
      try {
        const fallbackData = await fetchTranscriptViaYoutubeTranscript(videoId, lang);
        return {
          success: true,
          data: fallbackData,
        };
      } catch (fallbackError: unknown) {
        console.error("Both transcript engines failed:", fallbackError);
        const errorMessage =
          primaryError instanceof Error ? primaryError.message : String(primaryError);

        let errorCode = "NO_TRANSCRIPT";
        if (errorMessage.startsWith("PRIVATE_VIDEO:")) {
          errorCode = "PRIVATE_VIDEO";
        }

        return {
          success: false,
          error: errorCode,
          message: errorMessage.replace(/^[A-Z_]+:\s*/, ""),
        };
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
