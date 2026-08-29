"use client";
import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
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
    title: "Steve Jobs Stanford Speech",
    url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
  },
  {
    title: "Fireship - Next.js in 100s",
    url: "https://www.youtube.com/watch?v=SqcY0GlETPk",
  },
  {
    title: "Veritasium - Math Mystery",
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

  // Filter & View options
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"segments" | "paragraph">("segments");
  const [selectedLang, setSelectedLang] = useState<string>("default");

  // Copy state
  const [copiedType, setCopiedType] = useState<"full" | "timestamps" | null>(null);
  const [, startTransition] = useTransition();

  // Handle Form Submission
  const handleFetchTranscript = async (
    targetUrl: string = url,
    langCode: string = selectedLang
  ) => {
    if (!targetUrl.trim()) {
      setError("দয়া করে একটি সঠিক YouTube লিংক প্রদান করুন।");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getTranscriptAction({
        url: targetUrl.trim(),
        lang: langCode === "default" ? undefined : langCode,
        cookie: cookie.trim() || undefined,
      });

      if (!result.success || !result.data) {
        throw new Error(result.message || "ট্রান্সক্রিপ্ট আনতে সমস্যা হয়েছে।");
      }

      setData(result.data);
      if (result.data.selectedLanguage) {
        setSelectedLang(result.data.selectedLanguage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "অপ্রত্যাশিত সমস্যা হয়েছে।";
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

  // Copy helpers
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center selection:bg-red-500 selection:text-white">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-red-600/10 via-red-900/5 to-transparent blur-3xl -z-10 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl px-4 py-10 sm:py-16 flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col items-center text-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider shadow-inner">
            <YoutubeIcon className="w-4 h-4 text-red-500" />
            <span>YouTube InnerTube AI Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            YouTube Transcript Extractor
          </h1>

          <p className="text-neutral-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            যেকোনো YouTube ভিডিওর লিংক দিন এবং নিমেষেই টাইমস্ট্যাম্পসহ সম্পূর্ণ ট্রান্সক্রিপ্ট, সাবটাইটেল এবং মেটাডেটা বের করে নিন।
          </p>
        </header>

        {/* Search & Input Form */}
        <div className="flex flex-col gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleFetchTranscript();
            }}
            className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl backdrop-blur-xl focus-within:border-red-500/60 focus-within:ring-2 focus-within:ring-red-500/20 transition-all"
          >
            <div className="relative flex-1 w-full flex items-center">
              <YoutubeIcon className="absolute left-4 w-5 h-5 text-neutral-500 pointer-events-none" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="YouTube লিংক পেস্ট করুন (যেমন https://www.youtube.com/watch?v=...)"
                className="w-full pl-12 pr-10 py-3.5 bg-transparent text-sm sm:text-base text-neutral-100 placeholder-neutral-500 focus:outline-none"
              />
              {url && (
                <button
                  type="button"
                  onClick={() => setUrl("")}
                  className="absolute right-3 p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition"
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
                  className="px-3 py-3 text-xs sm:text-sm font-medium text-neutral-300 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 rounded-xl transition flex items-center gap-1.5"
                  title="Paste from clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="w-full sm:w-auto px-6 py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 disabled:pointer-events-none"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Fetching...</span>
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

          {/* Sample quick picks */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400 pt-1">
            <span className="font-medium text-neutral-500">Quick Test:</span>
            {SAMPLE_VIDEOS.map((sample) => (
              <button
                key={sample.url}
                type="button"
                onClick={() => {
                  setUrl(sample.url);
                  handleFetchTranscript(sample.url);
                }}
                className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:text-neutral-200 transition text-neutral-400"
              >
                {sample.title}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="ml-auto text-neutral-500 hover:text-neutral-300 text-xs flex items-center gap-1 transition"
            >
              <Sliders className="w-3 h-3" />
              <span>{showAdvanced ? "Hide Advanced" : "Advanced (Cookies/Private)"}</span>
            </button>
          </div>

          {/* Advanced Session Cookie Box */}
          {showAdvanced && (
            <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80 flex flex-col gap-2 mt-1 transition">
              <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>YouTube Session Cookie (Optional for Private/Members-only videos)</span>
              </div>
              <input
                type="password"
                value={cookie}
                onChange={(e) => setCookie(e.target.value)}
                placeholder="Paste YouTube cookie string (e.g. VISITOR_INFO1_LIVE=...; SID=...)"
                className="w-full px-3 py-2 bg-neutral-950/80 border border-neutral-800 rounded-lg text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-red-500/50"
              />
              <p className="text-[11px] text-neutral-500">
                প্রাইভেট বা শুধুমাত্র মেম্বারদের জন্য সংরক্ষিত ভিডিও ফেচ করার ক্ষেত্রে আপনার ব্রাউজার থেকে কুকি দিলে তা কাজ করবে। পাবলিক ভিডিওর জন্য এটি ফাঁকা রাখুন।
              </p>
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/50 flex items-start gap-3 text-red-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold text-red-300">ট্রান্সক্রিপ্ট আনা যায়নি</p>
              <p className="text-red-300/80">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="flex flex-col gap-6 animate-pulse p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800">
            <div className="flex gap-4 items-center">
              <div className="w-32 h-20 bg-neutral-800 rounded-xl" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-5 bg-neutral-800 rounded w-3/4" />
                <div className="h-4 bg-neutral-800/60 rounded w-1/3" />
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-neutral-800/60">
              <div className="h-4 bg-neutral-800/50 rounded w-full" />
              <div className="h-4 bg-neutral-800/50 rounded w-5/6" />
              <div className="h-4 bg-neutral-800/50 rounded w-4/6" />
            </div>
          </div>
        )}

        {/* Results View */}
        {data && !loading && (
          <div className="flex flex-col gap-6">
            {/* Video Metadata Card */}
            <div className="p-5 sm:p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative w-full sm:w-48 h-32 sm:h-28 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800">
                <Image
                  src={data.metadata.thumbnail}
                  alt={data.metadata.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[11px] font-mono font-medium text-neutral-200 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{data.metadata.durationFormatted}</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-1.5">
                <a
                  href={`https://www.youtube.com/watch?v=${data.metadata.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 font-bold text-base sm:text-lg text-neutral-100 hover:text-red-400 transition leading-snug line-clamp-2"
                >
                  <span>{data.metadata.title}</span>
                  <ExternalLink className="w-4 h-4 text-neutral-500 group-hover:text-red-400 shrink-0 transition" />
                </a>

                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                  <span className="font-medium text-neutral-300">{data.metadata.author}</span>
                  {data.metadata.viewCount && (
                    <>
                      <span>•</span>
                      <span>{data.metadata.viewCount} views</span>
                    </>
                  )}
                  <span>•</span>
                  <span>{data.segments.length} segments</span>
                </div>
              </div>
            </div>

            {/* Controls & Actions Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/70 border border-neutral-800">
              {/* Left Controls: Search & Language */}
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Transcript Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search inside transcript..."
                    className="w-full pl-9 pr-8 py-2 bg-neutral-950/90 border border-neutral-800 rounded-xl text-xs sm:text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-red-500/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Language Selector */}
                {data.availableLanguages && data.availableLanguages.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedLang}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="appearance-none bg-neutral-950/90 border border-neutral-800 text-xs sm:text-sm text-neutral-300 py-2 pl-3 pr-8 rounded-xl focus:outline-none focus:border-red-500/50 cursor-pointer"
                    >
                      <option value="default">Default Language</option>
                      {data.availableLanguages.map((l) => (
                        <option key={l.languageCode} value={l.languageCode}>
                          {l.name} {l.isAutoGenerated ? "(Auto)" : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Right Controls: View mode & Export */}
              <div className="flex flex-wrap items-center gap-2">
                {/* View Switcher */}
                <div className="flex items-center p-1 bg-neutral-950/90 border border-neutral-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setViewMode("segments")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      viewMode === "segments"
                        ? "bg-neutral-800 text-neutral-100 shadow"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                    title="Timestamped Segments View"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Segments</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode("paragraph")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      viewMode === "paragraph"
                        ? "bg-neutral-800 text-neutral-100 shadow"
                        : "text-neutral-400 hover:text-neutral-200"
                    }`}
                    title="Continuous Paragraph View"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Full Text</span>
                  </button>
                </div>

                {/* Copy Buttons */}
                <button
                  type="button"
                  onClick={() => handleCopy(false)}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-950/90 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition flex items-center gap-1.5"
                  title="Copy full text"
                >
                  {copiedType === "full" ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                  <span>{copiedType === "full" ? "Copied!" : "Copy"}</span>
                </button>

                {/* Download Dropdown / Buttons */}
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-950/90 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition flex items-center gap-1.5"
                  title="Download TXT"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  <span>.TXT</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSrt}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-950/90 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition flex items-center gap-1.5"
                  title="Download SRT Subtitle file"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-400" />
                  <span>.SRT</span>
                </button>
              </div>
            </div>

            {/* Transcript Box */}
            <div className="rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-2xl p-5 sm:p-7 flex flex-col gap-4">
              {searchQuery && (
                <div className="text-xs text-neutral-400 pb-2 border-b border-neutral-800/80 flex items-center justify-between">
                  <span>
                    Found <strong className="text-neutral-200">{filteredSegments.length}</strong> matching segments for &ldquo;{searchQuery}&rdquo;
                  </span>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-red-400 hover:underline"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              {filteredSegments.length === 0 ? (
                <div className="py-12 text-center text-neutral-500 text-sm">
                  কোনো ম্যাচিং ট্রান্সক্রিপ্ট টেক্সট পাওয়া যায়নি।
                </div>
              ) : viewMode === "segments" ? (
                <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-2 divide-y divide-neutral-800/40">
                  {filteredSegments.map((segment: TranscriptSegment, index: number) => {
                    const youtubeJumpUrl = `https://www.youtube.com/watch?v=${data.metadata.id}&t=${Math.floor(
                      segment.start_ms / 1000
                    )}s`;

                    return (
                      <div
                        key={`${segment.start_ms}-${index}`}
                        className="group pt-2.5 first:pt-0 flex items-start gap-4 hover:bg-neutral-800/30 p-2 rounded-xl transition"
                      >
                        <a
                          href={youtubeJumpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800/80 group-hover:border-red-500/40 text-neutral-400 group-hover:text-red-400 font-mono text-xs font-semibold shrink-0 transition flex items-center gap-1 mt-0.5"
                          title="Click to play at this time on YouTube"
                        >
                          <Clock className="w-3 h-3 text-neutral-500 group-hover:text-red-400" />
                          <span>{segment.startFormatted}</span>
                        </a>

                        <p className="text-sm sm:text-base text-neutral-200 leading-relaxed flex-1">
                          {highlightText(segment.text, searchQuery)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto pr-2 text-sm sm:text-base text-neutral-200 leading-relaxed whitespace-pre-wrap select-text">
                  {highlightText(data.fullText, searchQuery)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty State Banner */}
        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 text-center gap-3">
            <div className="p-4 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-500">
              <YoutubeIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-neutral-300">
              উপরে একটি YouTube ভিডিওর লিংক পেস্ট করুন
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md">
              যেকোনো পাবলিক, আনলিস্টেড অথবা শর্টস ভিডিওর ক্যাপশন নিমেষেই দেখতে পাবেন।
            </p>
          </div>
        )}
      </div>
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
        className="bg-amber-400/30 text-amber-200 px-0.5 rounded border-b border-amber-400/60"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}
