"use client";

import { useState, useTransition, useMemo, useRef } from "react";
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
  Sparkles,
  RefreshCw,
  Sliders,
  ChevronDown,
  X,
  Key,
  Play,
  Volume2,
  Zap,
  Globe,
  Radio,
  Share2,
  CheckCircle2,
  FileCode,
  ArrowRight,
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

// Sample URLs for quick testing
const SAMPLE_VIDEOS = [
  {
    title: "Steve Jobs Speech",
    tag: "Commencement",
    url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
  },
  {
    title: "React Tutorial",
    tag: "Programming",
    url: "https://www.youtube.com/watch?v=SqcY0GlETPk",
  },
  {
    title: "Math Mystery",
    tag: "Science",
    url: "https://www.youtube.com/watch?v=HeQX2HjkcNo",
  },
];

const FEATURES = [
  {
    icon: Play,
    title: "Click-to-Play Video Sync",
    desc: "Click any transcript sentence to instantly seek the video to that exact timestamp and start playing.",
  },
  {
    icon: Globe,
    title: "Multi-Language Captions",
    desc: "Switch between manual and auto-generated subtitle tracks across multiple languages.",
  },
  {
    icon: Search,
    title: "Real-Time Search & Highlight",
    desc: "Instantly search inside long transcripts and highlight matching keywords with millisecond precision.",
  },
  {
    icon: Download,
    title: "Export to .TXT & .SRT",
    desc: "Download clean plain text transcripts or standard SubRip (.SRT) subtitle files for video editing.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Paste Video Link",
    desc: "Enter any standard YouTube, Shorts, or Unlisted video URL into the input field.",
  },
  {
    step: "02",
    title: "Extract Transcripts",
    desc: "Our serverless engine parses timestamps, speaker subtitles, and video metadata in milliseconds.",
  },
  {
    step: "03",
    title: "Search, Play & Export",
    desc: "Navigate through timestamped segments, jump to moments in video, or export to your favorite format.",
  },
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [cookie, setCookie] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TranscriptResponse | null>(null);

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
      setError("Please provide a valid YouTube video URL.");
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
        throw new Error(result.message || "Failed to fetch transcript.");
      }

      setData(result.data);
      if (result.data.selectedLanguage) {
        setSelectedLang(result.data.selectedLanguage);
      }

      // Smooth scroll to player on mobile/desktop
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
    <div className="min-h-screen bg-[#09090b] text-neutral-100 flex flex-col items-center selection:bg-red-500 selection:text-white relative overflow-x-hidden">
      {/* Background Decorative Gradients & Mesh */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-radial from-red-600/15 via-orange-600/5 to-transparent blur-3xl -z-10 pointer-events-none" />
      <div className="absolute top-96 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px] -z-10 pointer-events-none" />
      <div className="absolute top-48 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-[128px] -z-10 pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] -z-10 pointer-events-none" />

      {/* Top Navbar */}
      <nav className="w-full border-b border-neutral-800/80 bg-neutral-950/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-600/25 border border-red-400/30">
              <YoutubeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                Transcript<span className="text-red-500 font-extrabold">Tube</span>
              </span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-wide uppercase">
                Interactive Video AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
              <Radio className="w-3 h-3 text-green-400 animate-pulse" />
              <span>Cloudflare Edge Active</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
              title="Open repository"
            >
              <Share2 className="w-4 h-4" />
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="w-full max-w-6xl px-4 py-10 sm:py-16 flex flex-col gap-10">
        {/* Hero Section */}
        <section className="flex flex-col items-center text-center gap-5 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-semibold tracking-wide shadow-inner backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>Instant YouTube Transcript & Video Sync</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.12]">
            Turn Any YouTube Video into{" "}
            <span className="bg-gradient-to-r from-red-500 via-rose-400 to-amber-400 bg-clip-text text-transparent">
              Interactive Transcripts
            </span>
          </h1>

          {/* Description */}
          <p className="text-neutral-400 text-base sm:text-lg leading-relaxed max-w-2xl">
            Extract timestamps, subtitles, and metadata in seconds. Click any transcript line to jump and play the video right from that moment.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-neutral-400">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Extraction</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800">
              <Play className="w-3.5 h-3.5 text-red-400 fill-current" />
              <span>Click-to-Seek Video</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Multi-Language Subtitles</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export .TXT & .SRT</span>
            </span>
          </div>
        </section>

        {/* Search & Input Box Section */}
        <section className="w-full max-w-3xl mx-auto flex flex-col gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchTranscript();
            }}
            className="group relative flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-[0_0_50px_-12px_rgba(239,68,68,0.2)] backdrop-blur-2xl focus-within:border-red-500/80 focus-within:ring-4 focus-within:ring-red-500/20 transition-all duration-300"
          >
            <div className="relative flex-1 w-full flex items-center">
              <div className="absolute left-3.5 p-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800 text-neutral-400 group-focus-within:text-red-500 group-focus-within:border-red-500/40 transition">
                <YoutubeIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
                className="w-full pl-14 pr-10 py-3 bg-transparent text-sm sm:text-base text-neutral-100 placeholder-neutral-500 focus:outline-none"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="absolute right-3 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {!url && (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-3.5 py-3 text-xs sm:text-sm font-medium text-neutral-300 bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-700/60 rounded-xl transition flex items-center gap-1.5 active:scale-95 shrink-0"
                  title="Paste from clipboard"
                >
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Paste</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 disabled:from-neutral-800 disabled:to-neutral-800 disabled:text-neutral-500 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 active:scale-95 disabled:pointer-events-none shrink-0 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Get Transcript</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Sample quick test tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 pt-1">
            <span className="font-medium text-neutral-500 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Try Samples:</span>
            </span>
            {SAMPLE_VIDEOS.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => {
                  setUrl(sample.url);
                  handleFetchTranscript(sample.url);
                }}
                className="px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 hover:text-neutral-200 transition text-neutral-400 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                  {sample.tag}
                </span>
                <span>{sample.title}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="ml-auto text-neutral-500 hover:text-neutral-300 text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>{showAdvanced ? "Hide Advanced" : "Advanced (Cookies/Private)"}</span>
            </button>
          </div>

          {/* Advanced Session Cookie Box */}
          {showAdvanced && (
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col gap-2.5 mt-1 transition animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>YouTube Session Cookie (Optional for Private/Members-only videos)</span>
              </div>
              <input
                type="password"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="Paste YouTube cookie string (e.g. VISITOR_INFO1_LIVE=...; SID=...)"
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-red-500/50"
              />
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Use your browser session cookie to access private, age-restricted, or members-only videos you have permission to view. Leave empty for public and unlisted videos.
              </p>
            </div>
          )}
        </section>

        {/* Error Notification Banner */}
        {error && (
          <div className="max-w-3xl mx-auto w-full p-4 rounded-2xl bg-red-950/40 border border-red-800/60 flex items-start gap-3.5 text-red-200 shadow-xl shadow-red-950/20 animate-in fade-in">
            <div className="p-2 rounded-xl bg-red-900/40 border border-red-700/50 text-red-400 shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold text-red-300">Could not fetch transcript</p>
              <p className="text-red-300/80 text-xs sm:text-sm leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-6 animate-pulse p-6 sm:p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800/80">
            <div className="w-full aspect-video bg-neutral-800/50 rounded-2xl" />
            <div className="space-y-3 pt-2">
              <div className="h-5 bg-neutral-800/60 rounded w-2/3" />
              <div className="h-4 bg-neutral-800/40 rounded w-1/3" />
            </div>
            <div className="space-y-2.5 pt-4 border-t border-neutral-800/60">
              <div className="h-4 bg-neutral-800/30 rounded w-full" />
              <div className="h-4 bg-neutral-800/30 rounded w-5/6" />
              <div className="h-4 bg-neutral-800/30 rounded w-4/6" />
            </div>
          </div>
        )}

        {/* Results Section (Interactive Video + Transcript) */}
        {data && !loading && (
          <section ref={playerSectionRef} className="flex flex-col gap-6 pt-4">
            {/* Top Video Cinema & Actions Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Embedded Player & Video Info (5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-4 lg:sticky lg:top-24">
                {/* 16:9 Video Player */}
                <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl relative group">
                  <iframe
                    ref={iframeRef}
                    src={`https://www.youtube.com/embed/${data.metadata.id}?enablejsapi=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`}
                    title={data.metadata.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>

                {/* Video Info Details Card */}
                <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl flex flex-col gap-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${data.metadata.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-start justify-between gap-2 font-bold text-base text-neutral-100 hover:text-red-400 transition leading-snug"
                  >
                    <span>{data.metadata.title}</span>
                    <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-red-400 shrink-0 mt-1 transition" />
                  </a>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 pt-1 border-t border-neutral-800/80">
                    <span className="font-semibold text-neutral-300">{data.metadata.author}</span>
                    {data.metadata.viewCount && (
                      <>
                        <span>•</span>
                        <span>{data.metadata.viewCount} views</span>
                      </>
                    )}
                    <span>•</span>
                    <span className="flex items-center gap-1 text-neutral-300">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      <span>{data.metadata.durationFormatted}</span>
                    </span>
                  </div>

                  {/* Synchronized Notice Badge */}
                  <div className="mt-1 inline-flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                    <Play className="w-3.5 h-3.5 fill-current text-red-500 shrink-0" />
                    <span>Click any line on the right to jump video to that moment.</span>
                  </div>

                  {/* Export Actions Box */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/80">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Export & Download
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(false)}
                        className="px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Copy full text"
                      >
                        {copiedType === "full" ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                        <span>{copiedType === "full" ? "Copied!" : "Copy Full Text"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(true)}
                        className="px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Copy with timestamps"
                      >
                        {copiedType === "timestamps" ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                        <span>{copiedType === "timestamps" ? "Copied!" : "Copy + Time"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadTxt}
                        className="px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Download TXT file"
                      >
                        <FileText className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Download .TXT</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadSrt}
                        className="px-3 py-2 text-xs font-medium text-neutral-200 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Download SRT Subtitle file"
                      >
                        <FileCode className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Download .SRT</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Transcript Viewer & Search (7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                {/* Toolbar */}
                <div className="p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search inside transcript..."
                      className="w-full pl-10 pr-8 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-500/50"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200 p-1"
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
                          className="appearance-none bg-neutral-950 border border-neutral-800 text-xs sm:text-sm text-neutral-300 py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-red-500/50 cursor-pointer"
                        >
                          <option value="default">Default Language</option>
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
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
                      </div>
                    )}

                    {/* View Mode Toggle */}
                    <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setViewMode("segments")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                          viewMode === "segments"
                            ? "bg-neutral-800 text-white shadow"
                            : "text-neutral-400 hover:text-neutral-200"
                        }`}
                        title="Timestamped Segments View"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Segments</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setViewMode("paragraph")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                          viewMode === "paragraph"
                            ? "bg-neutral-800 text-white shadow"
                            : "text-neutral-400 hover:text-neutral-200"
                        }`}
                        title="Continuous Paragraph View"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Full Text</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Main Transcript Card */}
                <div className="rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-2xl p-5 sm:p-7 flex flex-col gap-4">
                  {/* Search Match Info */}
                  {searchQuery && (
                    <div className="text-xs text-neutral-400 pb-3 border-b border-neutral-800/80 flex items-center justify-between">
                      <span>
                        Found <strong className="text-neutral-200 font-semibold">{filteredSegments.length}</strong> matching segments for &ldquo;{searchQuery}&rdquo;
                      </span>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-red-400 hover:underline cursor-pointer"
                      >
                        Clear Filter
                      </button>
                    </div>
                  )}

                  {/* Empty Search Result */}
                  {filteredSegments.length === 0 ? (
                    <div className="py-16 text-center text-neutral-500 text-sm flex flex-col items-center gap-2">
                      <Search className="w-8 h-8 text-neutral-600" />
                      <span>No matching transcript segments found.</span>
                    </div>
                  ) : viewMode === "segments" ? (
                    /* Segments View */
                    <div className="flex flex-col gap-2 max-h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                      {filteredSegments.map((segment: TranscriptSegment, index: number) => {
                        const isActive = activeSegmentMs === segment.start_ms;

                        return (
                          <div
                            key={`${segment.start_ms}-${index}`}
                            onClick={() => handleSeek(segment.start_ms)}
                            className={`group relative flex items-start gap-3.5 p-3.5 rounded-2xl transition cursor-pointer border ${
                              isActive
                                ? "bg-red-500/10 border-red-500/50 shadow-lg shadow-red-500/5 ring-1 ring-red-500/30"
                                : "hover:bg-neutral-800/50 border-neutral-800/50 hover:border-neutral-700/80"
                            }`}
                          >
                            {/* Timestamp Play Badge */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSeek(segment.start_ms);
                              }}
                              className={`px-2.5 py-1.5 rounded-xl border font-mono text-xs font-semibold shrink-0 transition flex items-center gap-1.5 mt-0.5 cursor-pointer ${
                                isActive
                                  ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-600/40"
                                  : "bg-neutral-950 border-neutral-800 text-neutral-400 group-hover:border-red-500/50 group-hover:text-red-400 group-hover:bg-red-500/10"
                              }`}
                              title="Click to play from this moment"
                            >
                              {isActive ? (
                                <Volume2 className="w-3.5 h-3.5 text-white animate-pulse" />
                              ) : (
                                <Play className="w-3.5 h-3.5 text-neutral-500 group-hover:text-red-400 fill-current" />
                              )}
                              <span>{segment.startFormatted}</span>
                            </button>

                            {/* Spoken Text */}
                            <p
                              className={`text-sm sm:text-base leading-relaxed flex-1 transition ${
                                isActive
                                  ? "text-white font-medium"
                                  : "text-neutral-300 group-hover:text-neutral-100"
                              }`}
                            >
                              {highlightText(segment.text, searchQuery)}
                            </p>

                            {/* Copy Single Segment Button on Hover */}
                            <button
                              type="button"
                              onClick={(e) => handleCopySegment(segment.text, index, e)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white transition shrink-0 cursor-pointer"
                              title="Copy this line"
                            >
                              {copiedSegmentIdx === index ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Paragraph / Full Text View */
                    <div className="max-h-[650px] overflow-y-auto pr-3 text-sm sm:text-base leading-loose select-text space-y-1 custom-scrollbar">
                      {data.segments.map((seg, idx) => {
                        const isActive = activeSegmentMs === seg.start_ms;
                        return (
                          <span
                            key={idx}
                            onClick={() => handleSeek(seg.start_ms)}
                            className={`cursor-pointer px-1 py-0.5 rounded-lg transition inline-block ${
                              isActive
                                ? "bg-red-500/30 text-white font-semibold border-b-2 border-red-500 shadow-sm"
                                : "text-neutral-300 hover:bg-neutral-800/80 hover:text-white"
                            }`}
                            title={`Click to play from ${seg.startFormatted}`}
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

        {/* Landing Page Content (Shown when no video is loaded) */}
        {!data && !loading && (
          <div className="flex flex-col gap-16 pt-8 pb-12">
            {/* How It Works Section */}
            <section className="flex flex-col items-center gap-8">
              <div className="text-center flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                  Workflow
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100">
                  How It Works in 3 Simple Steps
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                {HOW_IT_WORKS.map((item) => (
                  <div
                    key={item.step}
                    className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-4 relative overflow-hidden group hover:border-neutral-700 transition"
                  >
                    <div className="text-3xl font-black text-neutral-800 group-hover:text-red-500/40 transition">
                      {item.step}
                    </div>
                    <h3 className="text-lg font-bold text-neutral-100">{item.title}</h3>
                    <p className="text-neutral-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Features Grid */}
            <section className="flex flex-col items-center gap-8">
              <div className="text-center flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-red-500">
                  Features
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100">
                  Everything You Need for Video Transcription
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
                {FEATURES.map((feature, idx) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={idx}
                      className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800/70 hover:border-red-500/30 hover:bg-neutral-900/70 transition flex flex-col gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-red-500 group-hover:scale-110 transition">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-base font-bold text-neutral-200">{feature.title}</h3>
                      <p className="text-neutral-400 text-xs leading-relaxed">{feature.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-800/80 bg-neutral-950/80 mt-auto py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <YoutubeIcon className="w-4 h-4 text-red-500" />
            <span className="font-semibold text-neutral-400">TranscriptTube</span>
            <span>• Next.js & Cloudflare Workers</span>
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            <span>Fast & Free</span>
            <span>•</span>
            <span>Zero Tracking</span>
            <span>•</span>
            <span>Serverless Edge</span>
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
        className="bg-amber-400/30 text-amber-200 px-1 py-0.5 rounded border-b-2 border-amber-400/80 font-medium"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}
