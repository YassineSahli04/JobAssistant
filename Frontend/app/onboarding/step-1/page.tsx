"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
}

export default function OnboardingStep1() {
  const router = useRouter();
  const [formData, setFormData] = useState<PersonalInfo>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Retrieve userId from localStorage (set during upload or first visit)
  const getUserId = () => localStorage.getItem("user_id") ?? "";

  useEffect(() => {
    const userId = getUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch profile from Supabase via backend
    fetch(`${API_BASE}/users/${userId}/profile`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        setFormData({
          fullName: data.full_name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          location: data.location ?? "",
        });
      })
      .catch(() => {
        // If no profile yet, start with empty form — not an error worth showing
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContinue = async () => {
    setError(null);
    setSaving(true);

    let userId = getUserId();
    if (!userId) {
      // Generate a temporary userId if none exists yet (before resume upload)
      userId = crypto.randomUUID();
      localStorage.setItem("user_id", userId);
    }

    const payload = {
      full_name: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
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

      router.push("/onboarding/step-2");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  const fields: { id: keyof PersonalInfo; label: string; type: string; placeholder: string; autoComplete: string }[] = [
    { id: "fullName",  label: "Full Name",      type: "text",  placeholder: "Jane Doe",             autoComplete: "name" },
    { id: "email",     label: "Email Address",  type: "email", placeholder: "jane@example.com",     autoComplete: "email" },
    { id: "phone",     label: "Phone Number",   type: "tel",   placeholder: "+1 (555) 000-0000",   autoComplete: "tel" },
    { id: "location",  label: "Location",       type: "text",  placeholder: "San Francisco, CA",    autoComplete: "address-level2" },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-700/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-lg">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-indigo-400 mb-3 text-center">
          Step 1 of 3
        </p>

        <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: "33.33%" }}
          />
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-8 py-10 shadow-2xl backdrop-blur-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
              Personal Information
            </h1>
            <p className="text-sm text-white/50 leading-relaxed">
              Enter your personal details below to set up your AI Job Assistant
              profile. This helps us personalize your experience.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-500/40 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              {fields.map(({ id, label, type, placeholder, autoComplete }) => (
                <div key={id} className="space-y-1.5">
                  <label
                    htmlFor={id}
                    className="block text-xs font-medium text-white/60 tracking-wide uppercase"
                  >
                    {label}
                  </label>
                  <input
                    id={id}
                    name={id}
                    type={type}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    value={formData[id]}
                    onChange={handleChange}
                    className="w-full bg-white/[0.04] border border-white/[0.10] hover:border-white/20 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200"
                  />
                </div>
              ))}
            </div>
          )}

          {error && (
            <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <div className="my-8 border-t border-white/[0.06]" />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 px-5 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white/80 transition-all duration-200"
            >
              Back
            </button>

            <button
              type="button"
              onClick={handleContinue}
              disabled={saving || loading}
              className="flex-[2] px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {saving ? "Saving…" : "Continue"}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          Your information is securely stored and never shared.
        </p>
      </div>
    </main>
  );
}