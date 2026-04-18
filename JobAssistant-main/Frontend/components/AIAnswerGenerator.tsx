"use client";

import React from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AIAnswerGeneratorProps {
  question: string;
  answer: string | null;
  onQuestionChange: (value: string) => void;
  onGenerate: () => void;
  className?: string;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function AIAnswerGenerator({
  question,
  answer,
  onQuestionChange,
  onGenerate,
  className = "",
}: AIAnswerGeneratorProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && question.trim()) {
      onGenerate();
    }
  };

  return (
    <div
      className={`rounded-2xl p-6 flex flex-col ${className}`}
      style={{ background: "#0f1320", border: "1px solid #1e2538" }}
    >
      {/* ── Card header ── */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(99,102,241,0.15)" }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 4.5A1.5 1.5 0 013.5 3h9A1.5 1.5 0 0114 4.5v5A1.5 1.5 0 0112.5 11H9l-3 2v-2H3.5A1.5 1.5 0 012 9.5v-5z"
              stroke="#818cf8"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <path
              d="M5.5 6.5h5M5.5 8.5h3"
              stroke="#818cf8"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h2
          className="font-bold text-base"
          style={{
            color: "#e2e8f0",
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          AI Answer Generator
        </h2>
      </div>

      {/* ── Input + Button ── */}
      <div className="space-y-3">
        <input
          id="ai-question-input"
          type="text"
          placeholder="e.g. Why should we hire you? How do you handle conflict?"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Interview question"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500"
          style={{
            background: "#1a1f2e",
            border: "1px solid #2a3147",
            color: "#e2e8f0",
            caretColor: "#6366f1",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a3147")}
        />

        <button
          type="button"
          onClick={onGenerate}
          disabled={!question.trim()}
          className="w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1320] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          style={{ background: "#6366f1", color: "#fff" }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled)
              e.currentTarget.style.background = "#4f52e0";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#6366f1";
          }}
        >
          Generate Answer
        </button>
      </div>

      {/* ── Answer display ── */}
      {answer && (
        <div
          className="mt-4 rounded-xl p-4 leading-relaxed"
          style={{
            background: "#1a1f2e",
            border: "1px solid #2a3147",
          }}
          role="region"
          aria-label="Generated answer"
          aria-live="polite"
        >
          {/* Answer header */}
          <div className="flex items-center gap-1.5 mb-2">
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="5.5" fill="rgba(99,102,241,0.2)" />
              <path
                d="M4 6l1.5 1.5L8 4"
                stroke="#818cf8"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#6366f1" }}
            >
              AI Response
            </span>
          </div>

          <p
            className="text-sm"
            style={{
              color: "#cbd5e1",
              fontFamily: "'DM Mono', 'Fira Mono', monospace",
              fontSize: "0.8rem",
              lineHeight: "1.65",
            }}
          >
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}