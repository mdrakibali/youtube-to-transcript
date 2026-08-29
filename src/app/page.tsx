"use client";

import { useState, useEffect, useTransition, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Copy,
  Check,
  Download,
  Clock,
  FileText,
  List,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Sliders,
  ChevronDown,
  X,
  Key,
  Play,
  Volume2,
  FileCode,
  Sun,
  Moon,
  ArrowRight,
} from "lucide-react";
import type { TranscriptResponse, TranscriptSegment } from "@/lib/youtube";
import { getTranscriptAction } from "@/app/actions/transcript";

// Dynamically import ReactPlayer with SSR disabled
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = dynamic<any>(() => import("react-player"), {
  ssr: false,
});

function YoutubeIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// Sample practical videos
const SAMPLE_VIDEOS = [
  {
    title: "Steve Jobs Speech",
    tag: "Stanford",
    url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
  },
  {
    title: "React Full Course",
    tag: "Programming",
    url: "https://www.youtube.com/watch?v=SqcY0GlETPk",
  },
  {
    title: "Veritasium",
    tag: "Science",
    url: "https://www.youtube.com/watch?v=HeQX2HjkcNo",
  },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [cookie, setCookie] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TranscriptResponse | null>(null);

  // Theme State (Dark / Light)
  const [isDark, setIsDark] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = savedTheme ? savedTheme === "dark" : prefersDark;

    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // React Player ref and playing state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const playerSectionRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSegmentMs, setActiveSegmentMs] = useState<number | null>(null);
  const [copiedSegmentIdx, setCopiedSegmentIdx] = useState<number | null>(null);

  // Filter & View options
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"segments" | "paragraph">("segments");
  const [selectedLang, setSelectedLang] = useState<string>("default");

  // Copy state
  const [copiedType, setCopiedType] = useState<"full" | "timestamps" | null>(null);
  const [, startTransition] = useTransition();

  // Seek video to exact timestamp and start playback
  const handleSeek = (start_ms: number) => {
    const seconds = start_ms / 1000;
    setActiveSegmentMs(start_ms);
    setIsPlaying(true);

    if (playerRef.current) {
      try {
        if (typeof playerRef.current.seekTo === "function") {
          playerRef.current.seekTo(seconds, "seconds");
        } else if ("currentTime" in playerRef.current) {
          playerRef.current.currentTime = seconds;
        }
        if (typeof playerRef.current.play === "function") {
          playerRef.current.play();
        }
      } catch (err) {
        console.warn("Player seek error:", err);
      }
    }
  };

  // Handle Form Submission
  const handleFetchTranscript = async (
    targetUrl: string = url,
    langCode: string = selectedLang
  ) => {
    if (!targetUrl.trim()) {
      setError("Please enter a valid YouTube video URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setActiveSegmentMs(null);
    setIsPlaying(false);

    try {
      const result = await getTranscriptAction({
        url: targetUrl.trim(),
        lang: langCode === "default" ? undefined : langCode,
        cookie: cookie.trim() || undefined,
      });

      if (!result.success || !result.data) {
        throw new Error(result.message || "Could not retrieve transcript for this video.");
      }

      setData(result.data);
      if (result.data.selectedLanguage) {
        setSelectedLang(result.data.selectedLanguage);
      }

      setTimeout(() => {
        playerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Filter segments based on in-page search query
  const filteredSegments = useMemo(() => {
    if (!data?.segments) return [];
    if (!searchQuery.trim()) return data.segments;
    const q = searchQuery.toLowerCase();
    return data.segments.filter((seg) => seg.text.toLowerCase().includes(q));
  }, [data, searchQuery]);

  // Copy full transcript helpers
  const handleCopy = (withTimestamps: boolean) => {
    if (!data) return;

    let textToCopy = "";
    if (withTimestamps) {
      textToCopy = data.segments
        .map((s) => `[${s.startFormatted}] ${s.text}`)
        .join("\n");
      setCopiedType("timestamps");
    } else {
      textToCopy = data.fullText;
      setCopiedType("full");
    }

    navigator.clipboard.writeText(textToCopy);
    setTimeout(() => {
      startTransition(() => setCopiedType(null));
    }, 2000);
  };

  // Copy single segment
  const handleCopySegment = (text: string, idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedSegmentIdx(idx);
    setTimeout(() => {
      setCopiedSegmentIdx(null);
    }, 1500);
  };

  // Download TXT
  const handleDownloadTxt = () => {
    if (!data) return;
    const content = `Title: ${data.metadata.title}\nChannel: ${data.metadata.author}\nURL: https://www.youtube.com/watch?v=${data.metadata.id}\nDuration: ${data.metadata.durationFormatted}\n\n--- TRANSCRIPT ---\n\n${data.segments.map((s) => `[${s.startFormatted}] ${s.text}`).join("\n")}`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${data.metadata.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_transcript.txt`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  // Download SRT Subtitle format
  const handleDownloadSrt = () => {
    if (!data) return;
    const formatSrtTime = (ms: number) => {
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const milli = ms % 1000;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(milli).padStart(3, "0")}`;
    };

    let srtContent = "";
    data.segments.forEach((seg, idx) => {
      srtContent += `${idx + 1}\n`;
      srtContent += `${formatSrtTime(seg.start_ms)} --> ${formatSrtTime(seg.end_ms)}\n`;
      srtContent += `${seg.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${data.metadata.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.srt`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  // Paste from clipboard helper
  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setUrl(clipText);
        handleFetchTranscript(clipText);
      }
    } catch {
      // Clipboard permission denied
    }
  };

  // Language switch
  const handleLanguageChange = (newLang: string) => {
    setSelectedLang(newLang);
    handleFetchTranscript(url, newLang);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#fcfcfd] dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 transition-colors duration-200 selection:bg-red-500 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Ambient Background Glow Mesh */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-red-500/15 via-rose-500/5 to-transparent dark:from-red-600/20 dark:via-red-950/10 blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-96 right-0 w-96 h-96 bg-indigo-500/10 dark:bg-purple-600/10 rounded-full blur-[140px] -z-10 pointer-events-none" />
      <div className="absolute top-48 left-0 w-96 h-96 bg-red-500/10 dark:bg-rose-600/10 rounded-full blur-[140px] -z-10 pointer-events-none" />

      {/* Dot & Grid Matrix Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800f_1px,transparent_1px),linear-gradient(to_bottom,#8080800f_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10 pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full glass-header sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-red-600/25">
              <YoutubeIcon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                Transcript<span className="text-red-600">Tube</span>
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border border-slate-200 dark:border-neutral-700/60">
                v1.0 • Edge
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dark/Light Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-neutral-800/80 transition cursor-pointer"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="w-full max-w-6xl px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-10">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>YouTube Transcripts with Real-Time Video Sync</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.18]">
            Read, Search & Sync{" "}
            <span className="bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
              YouTube Transcripts
            </span>
          </h1>

          <p className="text-slate-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed max-w-2xl">
            Turn any video into timestamped, searchable text in seconds. Click any line to sync video playback, or export subtitles with one click.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1 text-xs text-slate-600 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ui-card-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Instant Extraction</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ui-card-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>Click-to-Seek Video</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ui-card-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>Multi-Language Subtitles</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ui-card-subtle">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Export .SRT & .TXT</span>
            </span>
          </div>
        </section>

        {/* Input Bar */}
        <section className="w-full max-w-2xl mx-auto flex flex-col gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchTranscript();
            }}
            className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-2xl search-container"
          >
            <div className="relative flex-1 w-full flex items-center">
              <div className="absolute left-3.5 text-red-600">
                <YoutubeIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube video or Shorts URL..."
                className="w-full pl-10 pr-9 py-2.5 bg-transparent text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              {!url && (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-3.5 py-2.5 text-xs font-medium text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Paste from clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 dark:disabled:bg-neutral-800 disabled:text-slate-400 dark:disabled:text-neutral-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-red-600/20 active:scale-95 disabled:pointer-events-none cursor-pointer shrink-0"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <span>Get Transcript</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Samples & Options */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 px-1">
            <span>Examples:</span>
            {SAMPLE_VIDEOS.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => {
                  setUrl(sample.url);
                  handleFetchTranscript(sample.url);
                }}
                className="px-2.5 py-1 rounded-lg ui-card-subtle hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
              >
                {sample.title}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="ml-auto text-slate-500 dark:text-neutral-500 hover:text-slate-800 dark:hover:text-neutral-200 text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>{showAdvanced ? "Hide Options" : "Session Cookie"}</span>
            </button>
          </div>

          {/* Advanced Session Cookie Box */}
          {showAdvanced && (
            <div className="p-4 rounded-2xl ui-card flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-neutral-200">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>YouTube Session Cookie (Optional for Private/Members-only videos)</span>
              </div>
              <input
                type="password"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="Paste session cookie (e.g. VISITOR_INFO1_LIVE=...; SID=...)"
                className="w-full px-3.5 py-2 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-red-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                Only needed if you want to extract transcripts from private or members-only videos you have permission to view.
              </p>
            </div>
          )}
        </section>

        {/* Error Notification */}
        {error && (
          <div className="max-w-2xl mx-auto w-full p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3.5 text-red-900 dark:text-red-200 text-xs sm:text-sm shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold text-red-800 dark:text-red-300">Unable to load transcript</p>
              <p className="text-red-700 dark:text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-4 animate-pulse p-6 rounded-3xl ui-card">
            <div className="w-full aspect-video bg-slate-200 dark:bg-neutral-800/50 rounded-2xl" />
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-slate-200 dark:bg-neutral-800/60 rounded w-1/2" />
              <div className="h-3 bg-slate-200 dark:bg-neutral-800/40 rounded w-1/4" />
            </div>
          </div>
        )}

        {/* Results View (Video Player + Transcript Workspace) */}
        {data && !loading && (
          <section ref={playerSectionRef} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: React Player & Details (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4 lg:sticky lg:top-20">
                {/* 16:9 ReactPlayer with Clean Controls & Hidden YouTube Extras */}
                <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-slate-200 dark:border-neutral-800 shadow-xl relative">
                  {hasMounted ? (
                    <ReactPlayer
                      ref={playerRef}
                      url={`https://www.youtube.com/watch?v=${data.metadata.id}`}
                      width="100%"
                      height="100%"
                      playing={isPlaying}
                      controls={true}
                      playsinline={true}
                      config={{
                        youtube: {
                          playerVars: {
                            modestbranding: 1,
                            rel: 0,
                            showinfo: 0,
                            iv_load_policy: 3,
                            playsinline: 1,
                            disablekb: 0,
                            fs: 1,
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-black flex items-center justify-center text-neutral-500 text-xs">
                      Loading Player...
                    </div>
                  )}
                </div>

                {/* Video Info Details Card */}
                <div className="p-5 rounded-2xl ui-card flex flex-col gap-3.5">
                  <a
                    href={`https://www.youtube.com/watch?v=${data.metadata.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group font-semibold text-sm sm:text-base text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition inline-flex items-start justify-between gap-2 leading-snug"
                  >
                    <span className="line-clamp-2">{data.metadata.title}</span>
                    <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 group-hover:text-red-600 transition" />
                  </a>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                    <span className="font-semibold text-slate-800 dark:text-neutral-200">
                      {data.metadata.author}
                    </span>
                    <span>•</span>
                    <span>{data.metadata.durationFormatted}</span>
                    <span>•</span>
                    <span>{data.segments.length} segments</span>
                  </div>

                  {/* Subtitle / Transcript Export Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-neutral-800">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                      Export & Copy
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(false)}
                        className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedType === "full" ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{copiedType === "full" ? "Copied" : "Copy Full Text"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(true)}
                        className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedType === "timestamps" ? (
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{copiedType === "timestamps" ? "Copied" : "Copy + Time"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadTxt}
                        className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Download .TXT</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadSrt}
                        className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FileCode className="w-3.5 h-3.5 text-slate-400" />
                        <span>Download .SRT</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Transcript Reader (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Search & Language Bar */}
                <div className="p-3 rounded-2xl ui-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search inside transcript..."
                      className="w-full pl-10 pr-8 py-2 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {/* Language Selector */}
                    {data.availableLanguages && data.availableLanguages.length > 0 && (
                      <div className="relative">
                        <select
                          value={selectedLang}
                          onChange={(e) => handleLanguageChange(e.target.value)}
                          className="appearance-none bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs sm:text-sm text-slate-700 dark:text-neutral-300 py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-red-500 cursor-pointer"
                        >
                          <option value="default">Default Track</option>
                          {data.availableLanguages.map((l, idx) => (
                            <option
                              key={`${l.id || l.languageCode}-${idx}`}
                              value={l.id || l.languageCode}
                            >
                              {l.name}{" "}
                              {l.isAutoGenerated && !l.name.toLowerCase().includes("auto")
                                ? "(Auto)"
                                : ""}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    )}

                    {/* View Switcher */}
                    <div className="flex items-center p-1 bg-slate-200/70 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setViewMode("segments")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          viewMode === "segments"
                            ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-neutral-400"
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Segments</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("paragraph")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                          viewMode === "paragraph"
                            ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-neutral-400"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Text</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transcript Viewer Box */}
                <div className="rounded-2xl ui-card p-4 sm:p-6 flex flex-col gap-3">
                  {searchQuery && (
                    <div className="text-xs text-slate-500 dark:text-neutral-400 pb-3 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                      <span>
                        Found <strong className="text-slate-900 dark:text-white font-semibold">{filteredSegments.length}</strong> matching lines for &ldquo;{searchQuery}&rdquo;
                      </span>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-red-600 hover:underline cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </div>
                  )}

                  {filteredSegments.length === 0 ? (
                    <div className="py-14 text-center text-slate-400 dark:text-neutral-500 text-xs sm:text-sm flex flex-col items-center gap-2">
                      <Search className="w-6 h-6 text-slate-400" />
                      <span>No matching text found in transcript.</span>
                    </div>
                  ) : viewMode === "segments" ? (
                    <div className="flex flex-col gap-1.5 max-h-[620px] overflow-y-auto pr-1.5 custom-scrollbar">
                      {filteredSegments.map((segment: TranscriptSegment, index: number) => {
                        const isActive = activeSegmentMs === segment.start_ms;

                        return (
                          <div
                            key={`${segment.start_ms}-${index}`}
                            onClick={() => handleSeek(segment.start_ms)}
                            className={`group flex items-start gap-3 p-3 rounded-xl transition cursor-pointer border ${
                              isActive
                                ? "bg-red-50/80 dark:bg-red-500/10 border-red-200 dark:border-red-500/40 shadow-xs"
                                : "hover:bg-slate-100/70 dark:hover:bg-neutral-800/50 border-transparent"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeek(segment.start_ms);
                              }}
                              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-semibold shrink-0 transition flex items-center gap-1.5 mt-0.5 cursor-pointer ${
                                isActive
                                  ? "bg-red-600 text-white shadow-xs"
                                  : "bg-slate-200/80 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 group-hover:bg-red-600 group-hover:text-white"
                              }`}
                            >
                              {isActive ? (
                                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                              ) : (
                                <Play className="w-3 h-3 fill-current opacity-70 group-hover:opacity-100" />
                              )}
                              <span>{segment.startFormatted}</span>
                            </button>

                            <p
                              className={`text-sm leading-relaxed flex-1 ${
                                isActive
                                  ? "text-slate-900 dark:text-white font-medium"
                                  : "text-slate-700 dark:text-neutral-300"
                              }`}
                            >
                              {highlightText(segment.text, searchQuery)}
                            </p>

                            <button
                              type="button"
                              onClick={(e) => handleCopySegment(segment.text, index, e)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-neutral-700/60 rounded-lg transition shrink-0 cursor-pointer"
                              title="Copy line"
                            >
                              {copiedSegmentIdx === index ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="max-h-[620px] overflow-y-auto pr-2 text-sm leading-loose select-text space-y-1 custom-scrollbar">
                      {data.segments.map((seg, idx) => {
                        const isActive = activeSegmentMs === seg.start_ms;
                        return (
                          <span
                            key={idx}
                            onClick={() => handleSeek(seg.start_ms)}
                            className={`cursor-pointer px-1 py-0.5 rounded-md transition inline-block ${
                              isActive
                                ? "bg-red-100 dark:bg-red-500/20 text-slate-900 dark:text-white font-medium underline decoration-red-500"
                                : "text-slate-700 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800"
                            }`}
                            title={`Jump to ${seg.startFormatted}`}
                          >
                            {highlightText(seg.text, searchQuery)}{" "}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Empty State Showcase */}
        {!data && !loading && (
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
            <div className="p-6 rounded-2xl ui-card flex flex-col gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center">
                <Play className="w-4 h-4 fill-current" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Interactive Video Playback
              </h3>
              <p className="text-slate-600 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed">
                Click any line in the transcript to jump the video directly to that exact second.
              </p>
            </div>

            <div className="p-6 rounded-2xl ui-card flex flex-col gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Subtitle & Text Exports
              </h3>
              <p className="text-slate-600 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed">
                Export clean transcripts with timestamps as SubRip (.SRT) and plain text (.TXT).
              </p>
            </div>

            <div className="p-6 rounded-2xl ui-card flex flex-col gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Instant Keyword Search
              </h3>
              <p className="text-slate-600 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed">
                Search through long speeches, podcasts, and tutorials with live match highlights.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Modern Multi-column Footer */}
      <footer className="w-full glass-header mt-auto py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-neutral-800/80 text-xs text-slate-600 dark:text-neutral-400">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-sm">
                <YoutubeIcon className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                Transcript<span className="text-red-600">Tube</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <span>Next.js 16</span>
              <span>•</span>
              <span>Cloudflare Workers</span>
              <span>•</span>
              <span>OpenNext</span>
              <span>•</span>
              <span>Serverless Edge</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-neutral-500">
            <p>© {new Date().getFullYear()} TranscriptTube. Fast YouTube Transcript Extractor.</p>
            <p>Fast, client-side synced & privacy-respecting.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Highlights matching search query inside string
 */
function highlightText(text: string, query: string) {
  if (!query.trim()) return text;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="bg-amber-200 dark:bg-amber-400/30 text-slate-900 dark:text-amber-200 px-0.5 rounded font-medium"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}
