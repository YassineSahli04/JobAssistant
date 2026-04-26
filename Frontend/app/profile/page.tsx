"use client";

import { useEffect, useRef, useState } from "react";
import { uploadResume } from "../../lib/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Briefcase,
  FileText,
  SlidersHorizontal,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getUserId(): string {
  let id = localStorage.getItem("user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("user_id", id);
  }
  return id;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Personal
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");

  // Career
  const [workExperience, setWorkExperience] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [currentJobTitle, setCurrentJobTitle] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState("");
  const [summary, setSummary] = useState("");

  // Preferences
  const [employmentType, setEmploymentType] = useState("");
  const [preferredIndustry, setPreferredIndustry] = useState("");
  const [preferredIndustries, setPreferredIndustries] = useState("");
  const [desiredJobTitle, setDesiredJobTitle] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [preferredWorkLocation, setPreferredWorkLocation] = useState("");

  // Resume
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Load from Supabase on mount ─────────────────────────────────────────────
  useEffect(() => {
    const userId = getUserId();

    fetch(`${API_BASE}/users/${userId}/profile`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        // users table fields
        setFullName(data.full_name ?? "");
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
        setLocation(data.location ?? "");
        setLinkedin(data.linkedin ?? data.linkedin_profile ?? "");

        // profiles table fields
        setWorkExperience(Array.isArray(data.work_experience) ? data.work_experience : []);
        setSkills(Array.isArray(data.skills) ? data.skills : []);
        setCurrentJobTitle(data.current_job ?? "");
        setYearsOfExperience(data.experience_years ?? "");
        setSummary(data.prof_summary ?? "");
        setDesiredJobTitle(data.desired_job ?? "");
        setSalaryRange(data.salary_range ?? "");
        setPreferredWorkLocation(data.preferred_location ?? "");
        setEmploymentType(data.desired_job_type ?? "");
        setPreferredIndustry(data.preferred_industry ?? "");
        setPreferredIndustries(data.preferred_industries ?? "");
      })
      .catch(() => {
        // No profile yet — start with empty form
      })
      .finally(() => setLoading(false));

    setResumeFileName(localStorage.getItem("resumeFileName"));
  }, []);

  // ── Save to Supabase ────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    setSaving(true);

    const userId = getUserId();

    const payload = {
      full_name: fullName,
      email,
      phone,
      location,
      linkedin,
      current_job_title: currentJobTitle,
      years_of_experience: yearsOfExperience,
      summary,
      desired_job_title: desiredJobTitle,
      desired_job_type: employmentType,
      employment_type: employmentType,
      salary_range: salaryRange,
      preferred_work_location: preferredWorkLocation,
      preferred_industry: preferredIndustry,
      preferred_industries: preferredIndustries,
      work_experience: workExperience,
      skills,
    };

    try {
      const res = await fetch(`${API_BASE}/users/${userId}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.detail ?? "Failed to save profile");
      }

      setSaveSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  // ── Resume upload ───────────────────────────────────────────────────────────
  const handleResumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const userId = getUserId();
      await uploadResume(userId, file);
      localStorage.setItem("resumeFileName", file.name);
      setResumeFileName(file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inputClass =
    "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-indigo-400/50 focus:bg-white/[0.06]";

  const sectionClass =
    "rounded-3xl border border-white/10 bg-[#0b1022]/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl";

  const pillClass =
    "inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/80";

  const handleWorkExperienceInputChange = (value: string) => {
    const items = value
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    setWorkExperience(items);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      {/* Background glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[260px] right-[-100px] h-[320px] w-[320px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-[-120px] left-[30%] h-[260px] w-[260px] rounded-full bg-blue-500/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/[0.02] backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-indigo-300 shadow-lg shadow-indigo-500/10">
            AI
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10 md:px-10">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Profile Settings</h2>
          <p className="mt-3 text-sm text-white/45">
            Manage your profile, resume, and job preferences in one place.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* ── Personal Information ── */}
            <div className={sectionClass}>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                  <User className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Personal Information</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Full Name</label>
                  <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Email Address</label>
                  <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Phone Number</label>
                  <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Location</label>
                  <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">LinkedIn Profile</label>
                <input className={inputClass} value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
              </div>
            </div>

            {/* ── Career Profile ── */}
            <div className={sectionClass}>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                  <Briefcase className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Career Profile</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Current Job Title</label>
                  <input className={inputClass} value={currentJobTitle} onChange={(e) => setCurrentJobTitle(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Years of Experience</label>
                  <input className={inputClass} value={yearsOfExperience} onChange={(e) => setYearsOfExperience(e.target.value)} />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Professional Summary</label>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>

              <div className="mt-6">
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Work Experience</label>
                <input
                  className={inputClass}
                  value={workExperience.join(", ")}
                  onChange={(e) => handleWorkExperienceInputChange(e.target.value)}
                  placeholder="Ex: Software Engineer, Product Manager, Data Analyst"
                />
                <p className="mt-2 text-xs text-white/40">Separate items with comma, semicolon, or new line.</p>
                <div className="flex flex-wrap gap-2">
                  {workExperience.length > 0 ? (
                    workExperience.map((item) => <span key={item} className={pillClass}>{item}</span>)
                  ) : (
                    <p className="text-sm text-white/35">No work experience selected yet.</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Skills</label>
                <div className="flex flex-wrap gap-2">
                  {skills.length > 0 ? (
                    skills.map((skill) => <span key={skill} className={pillClass}>{skill}</span>)
                  ) : (
                    <p className="text-sm text-white/35">No skills selected yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── Resume Management ── */}
            <div className={sectionClass}>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Resume Management</h3>
              </div>

              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-base font-medium text-white">
                  Current Resume: {resumeFileName || "No resume uploaded"}
                </p>
                <p className="mt-2 text-sm text-white/45">Upload a new resume to replace the current one</p>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? "Uploading..." : "Upload New Resume"}
                </button>

                {uploadError && <p className="mt-3 text-sm text-red-400">{uploadError}</p>}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={handleResumeChange}
                />
              </div>
            </div>

            {/* ── Job Preferences ── */}
            <div className={sectionClass}>
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <SlidersHorizontal className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">Job Preferences</h3>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Desired Job Title</label>
                  <input className={inputClass} value={desiredJobTitle} onChange={(e) => setDesiredJobTitle(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Salary Range</label>
                  <input className={inputClass} value={salaryRange} onChange={(e) => setSalaryRange(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Preferred Work Location</label>
                  <input className={inputClass} value={preferredWorkLocation} onChange={(e) => setPreferredWorkLocation(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Employment Type</label>
                  <input className={inputClass} value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} />
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Preferred Industry</label>
                <input className={inputClass} value={preferredIndustry} onChange={(e) => setPreferredIndustry(e.target.value)} />
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/45">Preferred Industries</label>
                <input className={inputClass} value={preferredIndustries} onChange={(e) => setPreferredIndustries(e.target.value)} />
              </div>
            </div>

            {/* ── Actions ── */}
            {saveError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {saveError}
              </p>
            )}

            {saveSuccess && (
              <p className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                Profile saved successfully! Redirecting…
              </p>
            )}

            <div className="flex justify-end gap-4 pb-8">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/85 transition hover:bg-white/[0.08] hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:from-indigo-400 hover:to-violet-400 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving && (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}