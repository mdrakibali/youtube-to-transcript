"use client";

import { useState, useEffect, useTransition, useMemo, useRef } from "react";
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
  HelpCircle,
} from "lucide-react";
import type { TranscriptResponse, TranscriptSegment } from "@/lib/youtube";
import { getTranscriptAction } from "@/app/actions/transcript";

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
    tag: "Lecture",
    url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
  },
  {
    title: "React Full Course",
    tag: "Tutorial",
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

  useEffect(() => {
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

  // Player state & ref
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerSectionRef = useRef<HTMLDivElement>(null);
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
    const seconds = Math.floor(start_ms / 1000);
    setActiveSegmentMs(start_ms);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }),
        "*"
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "playVideo",
          args: [],
        }),
        "*"
      );
    }
  };

  // Handle Form Submission
  const handleFetchTranscript = async (
    targetUrl: string = url,
    langCode: string = selectedLang
  ) => {
    if (!targetUrl.trim()) {
      setError("Please enter a YouTube video URL.");
      return;
    }

    setLoading(true);
    setError(null);
    setActiveSegmentMs(null);

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
      // Clipboard permissions denied
    }
  };

  // Language switch
  const handleLanguageChange = (newLang: string) => {
    setSelectedLang(newLang);
    handleFetchTranscript(url, newLang);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-neutral-100 transition-colors duration-200">
      {/* Top Navbar */}
      <nav className="w-full glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm">
              <YoutubeIcon className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white">
              YouTube Transcript
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-neutral-800 transition cursor-pointer"
              title={isDark ? "Light mode" : "Dark mode"}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="w-full max-w-5xl px-4 py-8 sm:py-12 flex flex-col gap-8">
        {/* Header (Clean & Direct) */}
        <section className="flex flex-col items-center text-center gap-2.5 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Extract & Search YouTube Transcripts
          </h1>
          <p className="text-slate-600 dark:text-neutral-400 text-sm leading-relaxed">
            Enter a YouTube link to fetch timestamps, read full subtitles, and click any line to play the video.
          </p>
        </section>

        {/* Input Bar */}
        <section className="w-full max-w-2xl mx-auto flex flex-col gap-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchTranscript();
            }}
            className="flex flex-col sm:flex-row items-center gap-2 p-1.5 rounded-xl glass-search"
          >
            <div className="relative flex-1 w-full flex items-center">
              <div className="absolute left-3 text-red-600">
                <YoutubeIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube video or Shorts link..."
                className="w-full pl-9 pr-8 py-2.5 bg-transparent text-sm text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
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
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition flex items-center gap-1 cursor-pointer"
                  title="Paste from clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-200 dark:disabled:bg-neutral-800 disabled:text-slate-400 dark:disabled:text-neutral-500 text-white text-xs sm:text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <span>Fetch</span>
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
                className="hover:text-red-600 dark:hover:text-red-400 transition underline underline-offset-2 cursor-pointer"
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
            <div className="p-3 rounded-xl glass-card flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>YouTube Session Cookie (Optional for Private/Restricted videos)</span>
              </div>
              <input
                type="password"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="Paste session cookie (e.g. VISITOR_INFO1_LIVE=...; SID=...)"
                className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg text-xs text-slate-800 dark:text-neutral-200 focus:outline-none focus:border-red-500"
              />
              <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                Only needed if you want to extract transcripts from private or members-only videos you have access to.
              </p>
            </div>
          )}
        </section>

        {/* Error Notification */}
        {error && (
          <div className="max-w-2xl mx-auto w-full p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-start gap-3 text-red-900 dark:text-red-200 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <p className="font-medium text-red-800 dark:text-red-300">Unable to load transcript</p>
              <p className="text-red-700 dark:text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="max-w-4xl mx-auto w-full flex flex-col gap-4 animate-pulse p-6 rounded-2xl glass-card">
            <div className="w-full aspect-video bg-slate-200 dark:bg-neutral-800/50 rounded-xl" />
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-slate-200 dark:bg-neutral-800/60 rounded w-1/2" />
              <div className="h-3 bg-slate-200 dark:bg-neutral-800/40 rounded w-1/4" />
            </div>
          </div>
        )}

        {/* Results View (Video Player + Transcript) */}
        {data && !loading && (
          <section ref={playerSectionRef} className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Video Player & Details (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-3 lg:sticky lg:top-20">
                {/* 16:9 Embedded Player */}
                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-neutral-800 shadow-md">
                  <iframe
                    ref={iframeRef}
                    src={`https://www.youtube.com/embed/${data.metadata.id}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`}
                    title={data.metadata.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>

                {/* Video Info */}
                <div className="p-4 rounded-xl glass-card flex flex-col gap-2.5">
                  <a
                    href={`https://www.youtube.com/watch?v=${data.metadata.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group font-medium text-sm text-slate-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition inline-flex items-start justify-between gap-2"
                  >
                    <span className="line-clamp-2">{data.metadata.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  </a>

                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
                    <span className="font-medium text-slate-700 dark:text-neutral-300">
                      {data.metadata.author}
                    </span>
                    <span>•</span>
                    <span>{data.metadata.durationFormatted}</span>
                    <span>•</span>
                    <span>{data.segments.length} segments</span>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => handleCopy(false)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedType === "full" ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>{copiedType === "full" ? "Copied" : "Copy Text"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopy(true)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
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
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download .TXT</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadSrt}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5 text-slate-400" />
                      <span>Download .SRT</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Transcript Reader (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                {/* Search & Language Bar */}
                <div className="p-2.5 rounded-xl glass-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search within transcript..."
                      className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg text-xs text-slate-900 dark:text-neutral-100 placeholder-slate-400 focus:outline-none focus:border-red-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
                      >
                        <X className="w-3 h-3" />
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
                          className="appearance-none bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs text-slate-700 dark:text-neutral-300 py-1.5 pl-2.5 pr-7 rounded-lg focus:outline-none focus:border-red-500 cursor-pointer"
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
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    )}

                    {/* View Switcher */}
                    <div className="flex items-center p-0.5 bg-slate-200 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setViewMode("segments")}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                          viewMode === "segments"
                            ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-neutral-400"
                        }`}
                      >
                        Segments
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("paragraph")}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition cursor-pointer ${
                          viewMode === "paragraph"
                            ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-600 dark:text-neutral-400"
                        }`}
                      >
                        Text
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transcript Viewer Box */}
                <div className="rounded-xl glass-card p-4 sm:p-5 flex flex-col gap-3">
                  {searchQuery && (
                    <div className="text-xs text-slate-500 dark:text-neutral-400 pb-2 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                      <span>
                        Found <strong className="text-slate-900 dark:text-white">{filteredSegments.length}</strong> matching lines
                      </span>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-red-600 hover:underline cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  )}

                  {filteredSegments.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 dark:text-neutral-500 text-xs">
                      No matching text found in transcript.
                    </div>
                  ) : viewMode === "segments" ? (
                    <div className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto pr-1.5 custom-scrollbar">
                      {filteredSegments.map((segment: TranscriptSegment, index: number) => {
                        const isActive = activeSegmentMs === segment.start_ms;

                        return (
                          <div
                            key={`${segment.start_ms}-${index}`}
                            onClick={() => handleSeek(segment.start_ms)}
                            className={`group flex items-start gap-3 p-2 rounded-lg transition cursor-pointer border ${
                              isActive
                                ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/40"
                                : "hover:bg-slate-100/70 dark:hover:bg-neutral-800/50 border-transparent"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeek(segment.start_ms);
                              }}
                              className={`px-2 py-0.5 rounded font-mono text-[11px] shrink-0 transition flex items-center gap-1 mt-0.5 cursor-pointer ${
                                isActive
                                  ? "bg-red-600 text-white"
                                  : "bg-slate-200/80 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 group-hover:bg-red-600 group-hover:text-white"
                              }`}
                            >
                              {isActive ? (
                                <Volume2 className="w-3 h-3 animate-pulse" />
                              ) : (
                                <Play className="w-2.5 h-2.5 fill-current opacity-70 group-hover:opacity-100" />
                              )}
                              <span>{segment.startFormatted}</span>
                            </button>

                            <p
                              className={`text-xs sm:text-sm leading-relaxed flex-1 ${
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
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition shrink-0 cursor-pointer"
                              title="Copy line"
                            >
                              {copiedSegmentIdx === index ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="max-h-[600px] overflow-y-auto pr-2 text-xs sm:text-sm leading-relaxed select-text space-y-1 custom-scrollbar">
                      {data.segments.map((seg, idx) => {
                        const isActive = activeSegmentMs === seg.start_ms;
                        return (
                          <span
                            key={idx}
                            onClick={() => handleSeek(seg.start_ms)}
                            className={`cursor-pointer px-1 py-0.5 rounded transition inline-block ${
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

        {/* Empty State / How to use guide */}
        {!data && !loading && (
          <div className="max-w-2xl mx-auto w-full flex flex-col gap-4 text-xs text-slate-500 dark:text-neutral-400 pt-4">
            <div className="p-4 rounded-xl glass-card flex flex-col gap-2.5">
              <span className="font-semibold text-slate-800 dark:text-neutral-200">
                Supported Links:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-neutral-400">
                <li>Standard videos: <code className="text-slate-800 dark:text-neutral-300 font-mono">youtube.com/watch?v=...</code></li>
                <li>Short URLs: <code className="text-slate-800 dark:text-neutral-300 font-mono">youtu.be/...</code></li>
                <li>YouTube Shorts: <code className="text-slate-800 dark:text-neutral-300 font-mono">youtube.com/shorts/...</code></li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-neutral-800 mt-auto py-6 text-center text-xs text-slate-400 dark:text-neutral-500">
        <p>Built with Next.js & Cloudflare Workers</p>
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
