"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MatchScoreCard from "../../components/MatchScoreCard";
import AIAnswerGenerator from "../../components/AIAnswerGenerator";
import { getResumeMetadata, scoreResume, tailorAnswer, uploadResume } from "../../lib/api";

import { Search, FileText, Sparkles, CheckCircle2, AlertCircle, X } from "lucide-react";

type AnalysisResult = {
  score: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  summary: string;
};

function ScoreRing({ score, size = 110 }: { score: number; size?: number }) {
  const safeScore = Math.max(0, Math.min(100, score));
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeScore / 100);

  return (
    <div
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#22c55e"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.7s ease" }}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 700,
          color: "#22c55e",
        }}
      >
        {safeScore}%
      </div>
    </div>
  );
}

function ButtonSpinner({ color = "#ffffff" }: { color?: string }) {
  return (
    <span className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "999px",
            background: color,
            display: "inline-block",
            animation: `dashboard-button-bounce 0.9s ${dot * 0.12}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const resultsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [jobUrl, setJobUrl] = useState("");
  const [JobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const [showResults, setShowResults] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);



  // ── AI Answer ──────────────────────────────────────────────────────────

  const handleCloseModal = () => {
    setShowDetails(false);
    setShowResults(true);
    // Scroll to results after a short paint delay
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const getUserId = (): string => {
    let id = localStorage.getItem("user_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("user_id", id);
    }
    return id;
  };

  const handleGenerateAnswer = async () => {
    if (!aiQuestion.trim() || !jobUrl.trim()) return;
    setIsGeneratingAnswer(true);
    setAiAnswer(null);
    try {
      const userId = getUserId();
      const answer = await tailorAnswer(userId, jobUrl, aiQuestion);
      setAiAnswer(answer);
    } catch (err) {
      setAiAnswer(`Error: ${err instanceof Error ? err.message : "Failed to generate answer."}`);
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  const handleResumeUpload = async (file: File) => {
    setError("");
    setIsUploading(true);

    try {
      const userId = getUserId();
      await uploadResume(userId, file);
      setResumeFileName(file.name);
      if (!isGuest) {
        localStorage.setItem("resumeFileName", file.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resume upload failed.");
      setResumeFileName(null);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    const guestMode = sessionStorage.getItem("guest_mode") === "true";
    setIsGuest(guestMode);
    setResumeFileName(guestMode ? null : localStorage.getItem("resumeFileName"));

    const userId = localStorage.getItem("user_id");
    if (!guestMode && userId) {
      void getResumeMetadata(userId).then((resume) => {
        if (resume.file_name) {
          localStorage.setItem("resumeFileName", resume.file_name);
          setResumeFileName(resume.file_name);
        }
      }).catch(() => {});
    }
  }, []);

  const handleAnalyze = async () => {
    setError("");

    if (!resumeFileName) {
      setError(
        isGuest
          ? "As a guest, please upload your resume first for this session."
          : "Please upload your resume first before running analysis."
      );
      return;
    }

    if (!jobUrl.trim()) {
      setError("Please enter a job URL.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const userId = getUserId();
      const result = await scoreResume(userId, jobUrl);

      const verdict =
        result.match_score >= 80
          ? "Excellent Match"
          : result.match_score >= 70
          ? "Strong Match"
          : "Moderate Match";

      setAnalysisResult({
        score: result.match_score,
        verdict,
        strengths: result.matched_skills,
        improvements: result.missing_skills,
        summary: result.summary,
      });
      setShowResults(false);
      setShowDetails(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while analyzing the job.";

      if (
        message.includes("No resume found") ||
        message.includes("/resume") ||
        message.includes("404 Not Found")
      ) {
        setError("No resume is saved for this user yet. Please upload your resume first.");
      } else {
        setError(message);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      <style>{`
        @keyframes dashboard-button-bounce {
          0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[220px] right-[-100px] h-[320px] w-[320px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-[-120px] left-[25%] h-[260px] w-[260px] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-16 pb-12 md:px-10 md:pt-20">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
            <Sparkles className="h-4 w-4" />
            AI-Powered • Instant Analysis
          </div>

          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            AI{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-violet-400">
              Job Assistant
            </span>
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm md:text-base text-white/45">
            Analyze how well your resume matches job descriptions — in seconds.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-[#0b1022]/90 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Job Analysis</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                  Job URL
                </label>
                <input
                  type="text"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://company.com/jobs/senior-engineer"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-indigo-400/50 focus:bg-white/[0.06]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                  Job Description
                </label>
                <textarea
                  value={JobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  rows={8}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-indigo-400/50 focus:bg-white/[0.06]"
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-400 disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-2">
                  {isAnalyzing && <ButtonSpinner />}
                  {isAnalyzing ? "Analyzing Job Match..." : "Analyze Job Match"}
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#0b1022]/90 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <FileText className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">Stored Resume</h3>
            </div>

            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6">
              {resumeFileName ? (
                <>
                  <p className="text-base font-medium text-white">{resumeFileName}</p>
                  <p className="mt-3 text-sm leading-6 text-white/45">
                    {isGuest
                      ? "This resume is available for this guest session."
                      : "Your resume is already stored and ready for analysis. You can update or replace it from your profile settings page."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base font-medium text-white">No resume uploaded yet</p>
                  <p className="mt-3 text-sm leading-6 text-white/45">
                    {isGuest
                      ? "As a guest, upload your resume here before running analysis."
                      : "You have not uploaded a resume yet. Add one from your profile settings page."}
                  </p>
                </>
              )}
            </div>

            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleResumeUpload(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mt-6 w-full rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-6 py-4 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-60"
              >
                {isUploading
                  ? "Uploading Resume..."
                  : resumeFileName
                  ? isGuest
                    ? "Replace Resume for Guest Session"
                    : "Replace Stored Resume"
                  : isGuest
                  ? "Upload Resume for Guest Session"
                  : "Upload Resume"}
              </button>
            </>
          </div>
        </div>
        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ── AI Results (revealed after modal close) ── */}
        {showResults && analysisResult && (
          <div ref={resultsRef} className="mt-12 space-y-6">

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-white/25">
                AI Results
              </span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">

              {/* AI Answer Generator — takes 2/3 width */}
              <div className="md:col-span-2 rounded-3xl border border-white/10 bg-[#0b1022]/90 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">AI Answer Generator</h3>
                </div>

                <AIAnswerGenerator
                  question={aiQuestion}
                  answer={aiAnswer}
                  onQuestionChange={setAiQuestion}
                  onGenerate={handleGenerateAnswer}
                  isLoading={isGeneratingAnswer}
                />
              </div>

              {/* Match Score Summary — takes 1/3 width */}
              <div className="rounded-3xl border border-white/10 bg-[#0b1022]/90 p-7 shadow-2xl shadow-black/30 backdrop-blur-xl flex flex-col">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold">Match Score</h3>
                </div>

                {/* Score */}
                <div className="text-5xl font-bold text-[#22c55e] leading-none">
                  {analysisResult.score}%
                </div>
                <p className="mt-2 text-sm text-white/40">{analysisResult.verdict}</p>

                {/* Progress bar */}
                <div className="mt-4 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#22c55e] transition-all duration-700"
                    style={{ width: `${analysisResult.score}%` }}
                  />
                </div>

                {/* Mini strengths / improvements summary */}
                <div className="mt-6 space-y-2 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#22c55e]/80 mb-2">
                    Top Strengths
                  </p>
                  {analysisResult.strengths.slice(0, 2).map((s) => (
                    <div key={s} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#22c55e]" />
                      <p className="text-xs leading-5 text-white/60 line-clamp-2">{s}</p>
                    </div>
                  ))}
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/80 mb-2 mt-4">
                    To Improve
                  </p>
                  {analysisResult.improvements.slice(0, 2).map((i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                      <p className="text-xs leading-5 text-white/60 line-clamp-2">{i}</p>
                    </div>
                  ))}
                </div>

                {/* View Full Details button */}
                <button
                  onClick={() => setShowDetails(true)}
                  className="mt-6 w-full rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
                >
                  View Details
                </button>
              </div>
            </div>


            <div className="h-10" />
          </div>
        )}
      </section>

      {showDetails && analysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-[#081021] p-6 shadow-2xl">
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-500/40 bg-white/[0.03] text-white/60 transition hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-white">Resume Match Analysis</h3>
            <p className="mt-1 text-sm text-white/40">
              Compared against the job description
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="grid grid-cols-[110px_1fr] gap-4 items-center">
                <ScoreRing score={analysisResult.score} />

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                    Match Score
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#22c55e]">
                    {analysisResult.verdict}
                  </p>

                  <div className="mt-4 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#22c55e]"
                      style={{ width: `${analysisResult.score}%` }}
                    />
                  </div>

                  <p className="mt-2 text-sm text-white/35">
                    {analysisResult.score}% alignment with requirements
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#22c55e]">
                  Strengths
                </p>
                <span className="rounded-full bg-[#22c55e]/15 px-2.5 py-1 text-xs text-[#22c55e]">
                  {analysisResult.strengths.length}
                </span>
              </div>

              <div className="space-y-3">
                {analysisResult.strengths.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]" />
                    <p className="text-sm leading-6 text-white/85">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                  Areas to Improve
                </p>
                <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs text-amber-400">
                  {analysisResult.improvements.length}
                </span>
              </div>

              <div className="space-y-3">
                {analysisResult.improvements.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <p className="text-sm leading-6 text-white/85">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleCloseModal}
              className="mt-8 w-full rounded-2xl bg-indigo-500/10 px-6 py-3.5 text-sm font-semibold text-indigo-300 transition hover:bg-indigo-500/15"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
