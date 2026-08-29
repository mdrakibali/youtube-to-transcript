"use server";

import { extractVideoId, fetchYouTubeTranscript, type TranscriptResponse } from "@/lib/youtube";

export interface TranscriptActionResult {
  success: boolean;
  data?: TranscriptResponse;
  error?: string;
  message?: string;
}

/**
 * Next.js Server Action to fetch YouTube transcripts and metadata directly.
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
    console.log("Extracted video ID:", videoId);
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

    const data = await fetchYouTubeTranscript(videoId, {
      lang: lang === "default" ? undefined : lang,
      cookie: effectiveCookie,
    });

    return {
      success: true,
      data,
    };
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

