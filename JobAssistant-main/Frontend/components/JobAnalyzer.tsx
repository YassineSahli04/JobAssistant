"use client";

import React from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface JobAnalyzerProps {
  jobUrl: string;
  jobDescription: string;
  onJobUrlChange: (value: string) => void;
  onJobDescriptionChange: (value: string) => void;
  onAnalyze: () => void;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-xs font-semibold uppercase tracking-widest mb-2"
      style={{ color: "#94a3b8" }}
    >
      {children}
    </label>
  );
}

function TextInput({
  id,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      id={id}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
  );
}

function Textarea({
  id,
  placeholder,
  value,
  onChange,
  rows = 7,
}: {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      placeholder={placeholder}
      value={value}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-150 focus-visible:ring-2 focus-visible:ring-indigo-500"
      style={{
        background: "#1a1f2e",
        border: "1px solid #2a3147",
        color: "#e2e8f0",
        caretColor: "#6366f1",
        resize: "vertical",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "#2a3147")}
    />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function JobAnalyzer({
  jobUrl,
  jobDescription,
  onJobUrlChange,
  onJobDescriptionChange,
  onAnalyze,
}: JobAnalyzerProps) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col h-full"
      style={{ background: "#0f1320", border: "1px solid #1e2538" }}
    >
      {/* ── Card header ── */}
      <div className="flex items-center gap-2 mb-6">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(99,102,241,0.15)" }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle
              cx="7" cy="7" r="4.5"
              stroke="#818cf8"
              strokeWidth="1.25"
            />
            <path
              d="M10.5 10.5L13 13"
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
          Job Analysis
        </h2>
      </div>

      {/* ── Fields ── */}
      <div className="flex flex-col gap-4 flex-1">
        {/* Job URL */}
        <div>
          <Label htmlFor="job-url">Job URL</Label>
          <TextInput
            id="job-url"
            placeholder="https://company.com/jobs/senior-engineer"
            value={jobUrl}
            onChange={onJobUrlChange}
          />
        </div>

        {/* Job Description */}
        <div className="flex flex-col flex-1">
          <Label htmlFor="job-description">Job Description</Label>
          <Textarea
            id="job-description"
            placeholder="Paste the full job description here…"
            value={jobDescription}
            onChange={onJobDescriptionChange}
            rows={7}
          />
        </div>

        {/* ── Analyze button ── */}
        <button
          type="button"
          onClick={onAnalyze}
          className="w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1320]"
          style={{ background: "#6366f1", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#4f52e0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#6366f1")}
        >
          Analyze Job Match →
        </button>
      </div>
    </div>
  );
}