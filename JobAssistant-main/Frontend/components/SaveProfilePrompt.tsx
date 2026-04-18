"use client";

import React from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SaveProfilePromptProps {
  onCreateProfile: () => void;
  onDismiss: () => void;
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SaveProfilePrompt({
  onCreateProfile,
  onDismiss,
}: SaveProfilePromptProps) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "#0f1320", border: "1px solid #1e2538" }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-5">

        {/* ── Text area ── */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: "rgba(99,102,241,0.12)" }}
            aria-hidden="true"
          >
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path
                d="M3 4a1 1 0 011-1h9a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V4z"
                stroke="#818cf8"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
              <path
                d="M6 3v3.5a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V3"
                stroke="#818cf8"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
              <path
                d="M5 10.5h7M5 12.5h4.5"
                stroke="#818cf8"
                strokeWidth="1.25"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div>
            <p
              className="font-semibold text-sm mb-1 leading-snug"
              style={{
                color: "#e2e8f0",
                fontFamily: "'DM Sans', system-ui, sans-serif",
              }}
            >
              Save your resume for future analysis?
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
              Would you like to save your resume for future job match analysis?
            </p>
          </div>
        </div>

        {/* ── Buttons ── */}
        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
          {/* Primary — Yes */}
          <button
            type="button"
            onClick={onCreateProfile}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1320] active:scale-[0.98] whitespace-nowrap"
            style={{ background: "#6366f1", color: "#fff" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#4f52e0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#6366f1")}
          >
            Yes, Create Profile
          </button>

          {/* Ghost — No */}
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1320] active:scale-[0.98] whitespace-nowrap"
            style={{
              background: "transparent",
              border: "1px solid #2a3147",
              color: "#64748b",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#3a4157";
              e.currentTarget.style.color = "#94a3b8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#2a3147";
              e.currentTarget.style.color = "#64748b";
            }}
          >
            No, Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}