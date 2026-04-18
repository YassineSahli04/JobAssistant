"use client";

import React from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MatchScoreCardProps {
  score: number;
  onViewDetails: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function getHelperText(score: number): string {
  if (score >= 80) return "Excellent match for this role";
  if (score >= 65) return "Strong match for this role";
  if (score >= 50) return "Moderate match for this role";
  return "Low match — consider updating your resume";
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Match score: ${value}%`}
      className="w-full h-2 rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.06)" }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 10px ${color}55`,
          transition: "width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function MatchScoreCard({
  score,
  onViewDetails,
}: MatchScoreCardProps) {
  const color = getScoreColor(score);
  const helperText = getHelperText(score);

  return (
    <div
      className="rounded-2xl p-6 flex flex-col h-full"
      style={{ background: "#0f1320", border: "1px solid #1e2538" }}
    >
      {/* ── Card header ── */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}1a` }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 8a6 6 0 1112 0A6 6 0 012 8z"
              stroke={color}
              strokeWidth="1.25"
            />
            <path
              d="M8 5v3l2 1.5"
              stroke={color}
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
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
          Match Score
        </h2>
      </div>

      {/* ── Score ── */}
      <div
        className="text-6xl font-black mb-1 leading-none"
        style={{
          color,
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
        aria-label={`${score} percent match`}
      >
        {score}%
      </div>

      {/* ── Helper text ── */}
      <p className="text-xs mb-4" style={{ color: "#4b5563" }}>
        {helperText}
      </p>

      {/* ── Progress bar ── */}
      <ProgressBar value={score} color={color} />

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── View Details button ── */}
      <button
        type="button"
        onClick={onViewDetails}
        className="mt-5 w-full rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1320] active:scale-[0.98]"
        style={{
          background: "rgba(99,102,241,0.12)",
          border: "1px solid rgba(99,102,241,0.25)",
          color: "#818cf8",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(99,102,241,0.2)";
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.45)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(99,102,241,0.12)";
          e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)";
        }}
      >
        View Details
      </button>
    </div>
  );
}