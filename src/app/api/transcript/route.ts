import { NextRequest, NextResponse } from "next/server";
import { extractVideoId, fetchYouTubeTranscript } from "@/lib/youtube";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, lang, cookie } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_INPUT",
          message: "দয়া করে একটি সঠিক YouTube ভিডিও লিংক দিন। (Please provide a valid YouTube video URL).",
        },
        { status: 400 }
      );
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_URL",
          message:
            "YouTube লিংকটি সঠিক নয়। (Invalid YouTube URL. Please provide a standard watch, youtu.be, or shorts link).",
        },
        { status: 400 }
      );
    }

    // Optional environment variable cookie fallback
    const effectiveCookie = cookie || process.env.YOUTUBE_COOKIE;

    const data = await fetchYouTubeTranscript(videoId, {
      lang,
      cookie: effectiveCookie,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "অপ্রত্যাশিত সমস্যা হয়েছে।";

    let statusCode = 500;
    let errorCode = "INTERNAL_ERROR";

    if (errorMessage.startsWith("NO_TRANSCRIPT:")) {
      statusCode = 404;
      errorCode = "NO_TRANSCRIPT";
    } else if (errorMessage.startsWith("PRIVATE_VIDEO:")) {
      statusCode = 403;
      errorCode = "PRIVATE_VIDEO";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorCode,
        message: errorMessage.replace(/^[A-Z_]+:\s*/, ""),
      },
      { status: statusCode }
    );
  }
}

