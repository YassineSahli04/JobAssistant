"use client";

import React from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ResumeUploaderProps {
  fileName: string | null;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onUploadClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

// ── Icons ──────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="10" fill="rgba(99,102,241,0.1)" />
      <path
        d="M16 20V12M16 12l-3 3M16 12l3 3"
        stroke="#818cf8"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 22h12"
        stroke="#818cf8"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="10" fill="rgba(34,197,94,0.12)" />
      <path
        d="M10 16.5l4.5 4.5 7.5-9"
        stroke="#22c55e"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <path
        d="M3 2a1 1 0 011-1h4.586a1 1 0 01.707.293l2.414 2.414A1 1 0 0112 4.414V12a1 1 0 01-1 1H4a1 1 0 01-1-1V2z"
        stroke="#22c55e"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 1.5V4a1 1 0 001 1h2.5"
        stroke="#22c55e"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function ResumeUploader({
  fileName,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onUploadClick,
  onFileChange,
  fileInputRef,
}: ResumeUploaderProps) {
  const hasFile = Boolean(fileName);

  return (
    <div
      className="rounded-2xl p-6 flex flex-col h-full"
      style={{ background: "#0f1320", border: "1px solid #1e2538" }}
    >
      {/* ── Card header ── */}
      <div className="flex items-center gap-2 mb-6">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.12)" }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 2a1 1 0 011-1h3.586a1 1 0 01.707.293l2.414 2.414A1 1 0 0112 4.414V14a1 1 0 01-1 1H5a1 1 0 01-1-1V2z"
              stroke="#22c55e"
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
            <path
              d="M9 1.5V4.5a1 1 0 001 1H12"
              stroke="#22c55e"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
            <path
              d="M6.5 9l1.5 1.5 1.5-1.5M8 10.5V7"
              stroke="#22c55e"
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
          Resume Upload
        </h2>
      </div>

      {/* ── Drop zone ── */}
      <div
        role="button"
        tabIndex={0}
        aria-label={
          hasFile
            ? `${fileName} uploaded. Click to replace.`
            : "Drag and drop your resume here, or click to browse files"
        }
        className="relative flex flex-col items-center justify-center text-center rounded-xl p-8 cursor-pointer transition-all duration-200 mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        style={{
          border: `2px dashed ${
            isDragging
              ? "#6366f1"
              : hasFile
              ? "rgba(34,197,94,0.4)"
              : "#2a3147"
          }`,
          background: isDragging
            ? "rgba(99,102,241,0.06)"
            : hasFile
            ? "rgba(34,197,94,0.04)"
            : "rgba(26,31,46,0.5)",
          minHeight: "180px",
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={onUploadClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onUploadClick();
          }
        }}
      >
        {/* Dragging overlay pulse */}
        {isDragging && (
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)",
            }}
          />
        )}

        {hasFile ? (
          <>
            <SuccessIcon />
            <div className="mt-3 flex items-center gap-1.5">
              <DocumentIcon />
              <p
                className="font-semibold text-sm truncate max-w-[200px]"
                style={{ color: "#22c55e" }}
                title={fileName ?? ""}
              >
                {fileName}
              </p>
            </div>
            <p className="text-xs mt-1" style={{ color: "#4b5563" }}>
              Click to replace
            </p>
          </>
        ) : (
          <>
            <UploadIcon />
            <p
              className="font-semibold text-sm mt-3 mb-1"
              style={{ color: isDragging ? "#818cf8" : "#94a3b8" }}
            >
              {isDragging ? "Drop to upload" : "Drag & drop your resume here"}
            </p>
            <p className="text-xs" style={{ color: "#4b5563" }}>
              or click to browse files
            </p>
          </>
        )}
      </div>

      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onFileChange}
      />

      {/* ── Upload button ── */}
      <button
        type="button"
        onClick={onUploadClick}
        className="w-full rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        style={{
          background: "transparent",
          border: "1px solid #2a3147",
          color: "#94a3b8",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "#6366f1";
          e.currentTarget.style.color = "#818cf8";
          e.currentTarget.style.background = "rgba(99,102,241,0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "#2a3147";
          e.currentTarget.style.color = "#94a3b8";
          e.currentTarget.style.background = "transparent";
        }}
      >
        {hasFile ? "Replace Resume" : "Upload Resume"}
      </button>

      {/* ── Helper text ── */}
      <p className="text-center text-xs" style={{ color: "#4b5563" }}>
        PDF, DOC, DOCX&nbsp;&nbsp;·&nbsp;&nbsp;Max 10 MB
      </p>
    </div>
  );
}