"use client";

import { useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AnalysisResult {
  score: number;
  strengths: string[];
  weaknesses: string[];
}

export interface AnalysisModalProps {
  open: boolean;
  result: AnalysisResult;
  onClose: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 75) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent Match";
  if (score >= 65) return "Strong Match";
  if (score >= 50) return "Moderate Match";
  return "Needs Work";
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  const color = getScoreColor(value);
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Match score: ${value}%`}
      className="relative w-full h-2 rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.06)" }}
    >
      {/* Track glow */}
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          width: `${value}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          boxShadow: `0 0 12px ${color}66`,
          transition: "width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      />
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="flex-shrink-0 mt-0.5"
    >
      <circle cx="8" cy="8" r="8" fill="rgba(34,197,94,0.15)" />
      <path
        d="M5 8l2 2 4-4"
        stroke="#22c55e"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="flex-shrink-0 mt-0.5"
    >
      <circle cx="8" cy="8" r="8" fill="rgba(245,158,11,0.15)" />
      <path
        d="M8 5v3.5M8 10.5v.5"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ListItemProps {
  children: React.ReactNode;
  icon: "check" | "warning";
  index: number;
}

function ListItem({ children, icon, index }: ListItemProps) {
  return (
    <li
      className="flex items-start gap-3 text-sm leading-relaxed"
      style={{
        color: "#cbd5e1",
        animationDelay: `${index * 60}ms`,
      }}
    >
      {icon === "check" ? <CheckIcon /> : <WarningIcon />}
      <span>{children}</span>
    </li>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function AnalysisModal({
  open,
  result,
  onClose,
}: AnalysisModalProps) {
  const { score, strengths, weaknesses } = result;
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  // Focus management
  useEffect(() => {
    if (open) {
      // Delay to let animation start first
      const timer = setTimeout(() => closeButtonRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Trap focus within modal
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  if (!open) return null;

  // Circumference for the SVG ring
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <>
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes am-backdrop { from { opacity: 0 } to { opacity: 1 } }
        @keyframes am-panel {
          from { opacity: 0; transform: scale(0.93) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes am-ring {
          from { stroke-dashoffset: ${circumference}px; }
          to   { stroke-dashoffset: ${dashOffset}px;   }
        }
        @keyframes am-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .am-backdrop {
          animation: am-backdrop 0.22s ease forwards;
        }
        .am-panel {
          animation: am-panel 0.28s cubic-bezier(0.34, 1.3, 0.64, 1) forwards;
        }
        .am-ring-path {
          animation: am-ring 0.9s cubic-bezier(0.34, 1.1, 0.64, 1) 0.15s both;
        }
        .am-fade-up {
          opacity: 0;
          animation: am-fade-up 0.3s ease forwards;
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        className="am-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(4,7,18,0.82)", backdropFilter: "blur(8px)" }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
        aria-hidden="true"
      >
        {/* ── Dialog panel ── */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="am-title"
          aria-describedby="am-description"
          className="am-panel relative w-full max-w-md focus:outline-none"
          onKeyDown={handleKeyDown}
          tabIndex={-1}
        >
          {/* Card shell */}
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: "linear-gradient(160deg, #0f1320 0%, #0a0e1a 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.03), 0 32px 64px rgba(0,0,0,0.6), 0 0 80px rgba(99,102,241,0.06)",
            }}
          >
            {/* Subtle top edge glow */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)",
              }}
            />

            {/* ── Header ── */}
            <div className="px-7 pt-7 pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="am-title"
                    className="text-xl font-bold tracking-tight"
                    style={{
                      color: "#f1f5f9",
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                    }}
                  >
                    Resume Match Analysis
                  </h2>
                  <p
                    id="am-description"
                    className="text-xs mt-1"
                    style={{ color: "#475569" }}
                  >
                    Compared against the job description
                  </p>
                </div>

                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  aria-label="Close modal"
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#64748b",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.10)";
                    e.currentTarget.style.color = "#e2e8f0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "#64748b";
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Score section ── */}
            <div
              className="am-fade-up mx-7 mb-6 rounded-xl p-5 flex items-center gap-6"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                animationDelay: "0.08s",
              }}
            >
              {/* SVG ring */}
              <div className="relative flex-shrink-0 w-[120px] h-[120px]">
                <svg
                  width="120"
                  height="120"
                  viewBox="0 0 120 120"
                  className="rotate-[-90deg]"
                >
                  {/* Background track */}
                  <circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                  />
                  {/* Animated progress */}
                  <circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke={scoreColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={circumference}
                    className="am-ring-path"
                    style={{ filter: `drop-shadow(0 0 6px ${scoreColor}88)` }}
                  />
                </svg>
                {/* Score label in center */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-3xl font-black leading-none"
                    style={{
                      color: scoreColor,
                      fontFamily: "'DM Sans', system-ui, sans-serif",
                    }}
                  >
                    {score}%
                  </span>
                </div>
              </div>

              {/* Right side text */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-1"
                  style={{ color: "#475569" }}
                >
                  Match Score
                </p>
                <p
                  className="text-lg font-bold mb-3 leading-tight"
                  style={{
                    color: scoreColor,
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                  }}
                >
                  {scoreLabel}
                </p>
                <ProgressBar value={score} />
                <p className="text-xs mt-2" style={{ color: "#334155" }}>
                  {score}% alignment with requirements
                </p>
              </div>
            </div>

            {/* ── Divider ── */}
            <div
              className="mx-7 h-px mb-5"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />

            {/* ── Strengths ── */}
            <div
              className="am-fade-up px-7 mb-5"
              style={{ animationDelay: "0.16s" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-1.5 h-4 rounded-full"
                  style={{ background: "#22c55e" }}
                />
                <h3
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#22c55e" }}
                >
                  Strengths
                </h3>
                <span
                  className="ml-auto text-xs font-medium rounded-full px-2 py-0.5"
                  style={{
                    background: "rgba(34,197,94,0.12)",
                    color: "#22c55e",
                  }}
                >
                  {strengths.length}
                </span>
              </div>
              <ul className="space-y-2.5" role="list" aria-label="Strengths">
                {strengths.map((item, i) => (
                  <ListItem key={i} icon="check" index={i}>
                    {item}
                  </ListItem>
                ))}
              </ul>
            </div>

            {/* ── Weaknesses ── */}
            <div
              className="am-fade-up px-7 mb-7"
              style={{ animationDelay: "0.22s" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-1.5 h-4 rounded-full"
                  style={{ background: "#f59e0b" }}
                />
                <h3
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#f59e0b" }}
                >
                  Areas to Improve
                </h3>
                <span
                  className="ml-auto text-xs font-medium rounded-full px-2 py-0.5"
                  style={{
                    background: "rgba(245,158,11,0.12)",
                    color: "#f59e0b",
                  }}
                >
                  {weaknesses.length}
                </span>
              </div>
              <ul className="space-y-2.5" role="list" aria-label="Areas to improve">
                {weaknesses.map((item, i) => (
                  <ListItem key={i} icon="warning" index={i}>
                    {item}
                  </ListItem>
                ))}
              </ul>
            </div>

            {/* ── Footer ── */}
            <div
              className="am-fade-up px-7 pb-7"
              style={{ animationDelay: "0.28s" }}
            >
              <button
                onClick={onClose}
                className="w-full rounded-xl py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1320]"
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
                Close
              </button>
            </div>

            {/* Bottom edge glow matching score color */}
            <div
              className="absolute inset-x-0 bottom-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${scoreColor}55, transparent)`,
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
