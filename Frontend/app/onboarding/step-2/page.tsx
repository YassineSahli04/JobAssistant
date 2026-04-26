"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableMultiSelect from "../../../components/SearchableMultiSelect";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const WORK_EXPERIENCE_OPTIONS = [
  "Software Engineer", "Senior Software Engineer", "Frontend Developer",
  "Backend Developer", "Full Stack Developer", "Product Manager",
  "Project Manager", "Data Scientist", "Data Analyst", "Machine Learning Engineer",
  "DevOps Engineer", "Cloud Architect", "UX Designer", "UI Designer",
  "Graphic Designer", "Marketing Manager", "Growth Hacker", "Content Strategist",
  "Sales Representative", "Account Executive", "Business Analyst",
  "Operations Manager", "HR Manager", "Recruiter", "Finance Analyst",
  "Accountant", "Legal Counsel", "Customer Success Manager", "QA Engineer",
  "Security Engineer",
];

const SKILLS_OPTIONS = [
  "JavaScript", "TypeScript", "React", "Next.js", "Vue.js", "Angular",
  "Node.js", "Python", "Django", "FastAPI", "Java", "Spring Boot", "Go",
  "Rust", "C++", "SQL", "PostgreSQL", "MongoDB", "Redis", "GraphQL",
  "REST APIs", "Docker", "Kubernetes", "AWS", "Google Cloud", "Azure",
  "Terraform", "CI/CD", "Git", "Agile / Scrum", "Figma", "Tailwind CSS",
  "Product Strategy", "Data Analysis", "Machine Learning", "Prompt Engineering",
  "Technical Writing", "Public Speaking", "Team Leadership", "Project Management",
];

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Freelance", "Internship", "Remote"];

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "Education", "Retail & E-commerce",
  "Media & Entertainment", "Government", "Non-profit", "Consulting", "Manufacturing",
];

interface ProfileData {
  workExperience: string[];
  skills: string[];
  jobType: string;
  industry: string;
}

export default function CareerProfileStep() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData>({
    workExperience: [],
    skills: [],
    jobType: "",
    industry: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserId = () => localStorage.getItem("user_id") ?? "";

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch existing profile data from Supabase via backend
    fetch(`${API_BASE}/users/${userId}/profile`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        setProfile({
          workExperience: Array.isArray(data.work_experience) ? data.work_experience : [],
          skills: Array.isArray(data.skills) ? data.skills : [],
          jobType: data.desired_job_type ?? data.employment_type ?? "",
          industry: data.preferred_industry ?? data.preferred_industries ?? "",
        });
      })
      .catch(() => {
        // No profile yet — start fresh
      })
      .finally(() => setLoading(false));
  }, []);

  const isValid =
    profile.workExperience.length > 0 &&
    profile.skills.length > 0 &&
    profile.jobType !== "" &&
    profile.industry !== "";

  const handleContinue = async () => {
    if (!isValid) return;
    setError(null);
    setSaving(true);

    const userId = getUserId();
    if (!userId) {
      setError("User session not found. Please restart onboarding.");
      setSaving(false);
      return;
    }

    const payload = {
      work_experience: profile.workExperience,
      skills: profile.skills,
      desired_job_type: profile.jobType,
      preferred_industry: profile.industry,
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

      router.push("/onboarding/step-3");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-3 text-center">
            Step 2 of 3
          </p>
          <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: "66.666%" }}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-[#131820] border border-gray-800 rounded-2xl p-6 flex flex-col gap-6">
            <SearchableMultiSelect
              label="Work Experience"
              options={WORK_EXPERIENCE_OPTIONS}
              selected={profile.workExperience}
              onChange={(val) => setProfile((p) => ({ ...p, workExperience: val }))}
              placeholder="e.g. Software Engineer, Product Manager..."
            />

            <SearchableMultiSelect
              label="Skills"
              options={SKILLS_OPTIONS}
              selected={profile.skills}
              onChange={(val) => setProfile((p) => ({ ...p, skills: val }))}
              placeholder="e.g. React, Python, Project Management..."
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Desired Job Type</label>
              <select
                value={profile.jobType}
                onChange={(e) => setProfile((p) => ({ ...p, jobType: e.target.value }))}
                className="w-full bg-[#1a1f2e] border border-gray-700 hover:border-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-sm text-gray-200 rounded-xl px-3 py-2.5 outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled className="text-gray-500">Select a job type...</option>
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-[#1a1f2e]">{t}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Preferred Industry</label>
              <select
                value={profile.industry}
                onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))}
                className="w-full bg-[#1a1f2e] border border-gray-700 hover:border-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-sm text-gray-200 rounded-xl px-3 py-2.5 outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled className="text-gray-500">Select an industry...</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} className="bg-[#1a1f2e]">{ind}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {error}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={() => router.push("/onboarding/step-1")}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!isValid || saving || loading}
            className={`
              px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-2
              ${isValid && !saving
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 active:scale-95"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }
            `}
          >
            {saving && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {saving ? "Saving…" : "Continue →"}
          </button>
        </div>
      </div>
    </div>
  );
}