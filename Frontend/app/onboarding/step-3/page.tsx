"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getResumeMetadata, saveProfile, uploadResume } from "../../../lib/api";
import { writeProfileToLocalStorage } from "../../../lib/profile";

export default function OnboardingStep3() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  useEffect(() => {
    const guestMode = sessionStorage.getItem("guest_mode") === "true";
    const savedResume = localStorage.getItem("resumeFileName");
    if (savedResume) {
      setUploadedFile(savedResume);
    }

    const userId = localStorage.getItem("user_id");
    if (!userId || guestMode) return;

    void getResumeMetadata(userId).then((resume) => {
      if (resume.file_name) {
        localStorage.setItem("resumeFileName", resume.file_name);
        setUploadedFile(resume.file_name);
      }
    }).catch(() => {});
  }, []);

  const getUserId = (): string => {
    let id = localStorage.getItem("user_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("user_id", id);
    }
    return id;
  };

  const handleFile = async (file: File) => {
    setError(null);

    if (!acceptedTypes.includes(file.type)) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }

    setIsUploading(true);
    try {
      const userId = getUserId();
      await uploadResume(userId, file);
      setUploadedFile(file.name);
      localStorage.setItem("resumeFileName", file.name);
      localStorage.setItem("hasCompletedOnboarding", "true");
    } catch (err) {
      setUploadedFile(null);
      setError(err instanceof Error ? err.message : "Resume upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  const handleFinish = async () => {
    writeProfileToLocalStorage({ onboardingCompleted: true, profileSaved: true });

    if (uploadedFile) {
      localStorage.setItem("resumeFileName", uploadedFile);
    }

    const userId = localStorage.getItem("user_id");
    if (userId && sessionStorage.getItem("guest_mode") !== "true") {
      await saveProfile(userId, {
        onboardingCompleted: true,
        profileSaved: true,
      });
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-700/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-3 text-center">
          Step 3 of 3
        </p>

        <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: "100%" }}
          />
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-8 py-10 shadow-2xl backdrop-blur-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
              Resume Upload
            </h1>
            <p className="text-sm text-white/50 leading-relaxed">
              Upload your resume so we can store it for future job match
              analysis. It will be used to personalize your results.
            </p>
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center gap-4
              rounded-xl border-2 border-dashed px-6 py-12 cursor-pointer
              transition-all duration-200
              ${
                isDragging
                  ? "border-indigo-500/70 bg-indigo-500/10"
                  : uploadedFile
                  ? "border-violet-500/50 bg-violet-500/[0.06]"
                  : "border-white/[0.12] bg-white/[0.02] hover:border-indigo-500/40 hover:bg-white/[0.04]"
              }
            `}
          >
            <div
              className={`
                flex items-center justify-center w-14 h-14 rounded-2xl transition-colors duration-200
                ${
                  uploadedFile
                    ? "bg-violet-500/20"
                    : isDragging
                    ? "bg-indigo-500/20"
                    : "bg-white/[0.06]"
                }
              `}
            >
              {uploadedFile ? (
                <svg
                  className="w-7 h-7 text-violet-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  className={`w-7 h-7 transition-colors duration-200 ${
                    isDragging ? "text-indigo-400" : "text-white/40"
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </div>

            {uploadedFile ? (
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-violet-300 break-all">
                  {uploadedFile}
                </p>
                <p className="text-xs text-white/40">Click to replace the file</p>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <p
                  className={`text-sm font-medium transition-colors duration-200 ${
                    isDragging ? "text-indigo-300" : "text-white/70"
                  }`}
                >
                  {isUploading
                    ? "Uploading your resume..."
                    : isDragging
                    ? "Drop your file here"
                    : "Drag & drop your resume here"}
                </p>
                <p className="text-xs text-white/35">or click to browse</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={handleInputChange}
          />

          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-200 transition-all duration-200"
            >
              {isUploading ? "Uploading..." : uploadedFile ? "Replace Resume" : "Upload Resume"}
            </button>
            <p className="text-xs text-white/30">Supported formats: PDF, DOCX</p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="my-8 border-t border-white/[0.06]" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/onboarding/step-2")}
              className="flex-1 px-5 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/80 transition-all duration-200"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleFinish}
              disabled={isUploading}
              className="flex-[2] px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200"
            >
              Finish
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          Your information is stored locally and never shared.
        </p>
      </div>
    </main>
  );
}
