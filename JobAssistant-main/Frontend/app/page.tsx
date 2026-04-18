"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import AnalysisModal from "../components/AnalysisModal";
import ResumeUploader from "../components/ResumeUploader";
import JobAnalyzer from "../components/JobAnalyzer";
import MatchScoreCard from "../components/MatchScoreCard";
import SaveProfilePrompt from "../components/SaveProfilePrompt";
import AIAnswerGenerator from "../components/AIAnswerGenerator";

// ── Types ──────────────────────────────────────────────────────────────────

interface AnalysisResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
}

// ── Mock data ──────────────────────────────────────────────────────────────

const MOCK_RESULT: AnalysisResult = {
  score: 78,
  strengths: [
    "Strong alignment with required TypeScript & React skills",
    "5+ years of frontend experience matches seniority level",
    "Portfolio projects demonstrate relevant domain knowledge",
    "Clear quantified achievements in past roles",
  ],
  weaknesses: [
    "Missing explicit mention of GraphQL (listed as preferred)",
    "No mention of CI/CD or DevOps experience",
    "Team leadership examples could be more prominent",
  ],
};



export default function HomePage() {
  const router = useRouter();

  // Form state
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Modal + results state
  const [showModal, setShowModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [savePromptDismissed, setSavePromptDismissed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // ── File handling ──────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    const valid = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!valid.includes(file.type)) return alert("Please upload a PDF or DOC/DOCX file.");
    if (file.size > 10 * 1024 * 1024) return alert("File must be under 10 MB.");
    setFileName(file.name);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // ── Analyze ────────────────────────────────────────────────────────────

  const handleAnalyze = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (!showResults) {
      setShowResults(true);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // ── AI Answer ──────────────────────────────────────────────────────────

  const handleGenerateAnswer = () => {
    if (!aiQuestion.trim()) return;
    setAiAnswer(
      `Based on your resume and the job description, here's a tailored response: You have demonstrated strong proficiency in the required skills through your previous roles. Highlight your experience with ${aiQuestion.toLowerCase().includes("team") ? "cross-functional collaboration and mentoring junior engineers" : "technical problem-solving and delivering measurable business impact"} to make a compelling case.`
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::placeholder { color: #4b5563; }
        textarea { resize: vertical; }
        html { scroll-behavior: smooth; }
      `}</style>

      <div
        className="min-h-screen"
        style={{
          background: "#080c17",
          fontFamily: "'DM Sans', sans-serif",
          color: "#e2e8f0",
        }}
      >
        {/* Ambient glow */}
        <div
          className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-4 py-16">

          {/* ── Hero ── */}
          <div className="text-center mb-14">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-6"
              style={{
                background: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: "#818cf8",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#818cf8" }}
              />
              AI-Powered • Instant Analysis
            </div>

            <h1
              className="text-5xl md:text-6xl font-black leading-none tracking-tight mb-4"
              style={{ color: "#f1f5f9" }}
            >
              AI Job{" "}
              <span
                className="relative inline-block"
                style={{ color: "#818cf8" }}
              >
                Assistant
              </span>
            </h1>

            <p
              className="text-lg max-w-md mx-auto"
              style={{ color: "#64748b" }}
            >
              Analyze how well your resume matches job descriptions — in seconds.
            </p>
          </div>

          {/* ── Main two-column layout ── */}
          <div className="grid md:grid-cols-2 gap-6 mb-10">

            <JobAnalyzer
              jobUrl={jobUrl}
              jobDescription={jobDescription}
              onJobUrlChange={setJobUrl}
              onJobDescriptionChange={setJobDescription}
              onAnalyze={handleAnalyze}
            />

            <ResumeUploader
              fileName={fileName}
              isDragging={isDragging}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onUploadClick={() => fileInputRef.current?.click()}
              onFileChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              fileInputRef={fileInputRef}
            />
          </div>
          {/* ── AI Results (revealed after modal close) ── */}
          {showResults && (
            <div ref={resultsRef} className="space-y-6 mt-4">

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px" style={{ background: "#1e2538" }} />
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#4b5563" }}
                >
                  AI Results
                </span>
                <div className="flex-1 h-px" style={{ background: "#1e2538" }} />
              </div>

              <div className="grid md:grid-cols-3 gap-6">

                <AIAnswerGenerator
                  className="md:col-span-2"
                  question={aiQuestion}
                  answer={aiAnswer}
                  onQuestionChange={setAiQuestion}
                  onGenerate={handleGenerateAnswer}
                />

                <MatchScoreCard
                  score={MOCK_RESULT.score}
                  onViewDetails={() => setShowModal(true)}
                />
              </div>

              {!savePromptDismissed && (
                <SaveProfilePrompt
                  onCreateProfile={() => router.push("/onboarding/step-1")}
                  onDismiss={() => setSavePromptDismissed(true)}
                />
              )}

              {/* Bottom spacer */}
              <div className="h-10" />
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {showModal && (
      <AnalysisModal result={MOCK_RESULT} onClose={handleCloseModal} open={true} />
    )}
    </>
  );
}
