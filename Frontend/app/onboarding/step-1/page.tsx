"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getProfile, saveProfile } from "../../../lib/api";
import { loadProfileFromLocalStorage, writeProfileToLocalStorage } from "../../../lib/profile";

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

  useEffect(() => {
    const localProfile = loadProfileFromLocalStorage();
    setFormData({
      fullName: localProfile.fullName,
      email: localProfile.email,
      phone: localProfile.phone,
      location: localProfile.location,
    });

    const userId = localStorage.getItem("user_id");
    if (!userId || sessionStorage.getItem("guest_mode") === "true") return;

    void getProfile(userId).then((profile) => {
      writeProfileToLocalStorage(profile);
      setFormData({
        fullName: profile.fullName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        location: profile.location || "",
      });
    }).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleContinue = async () => {
    writeProfileToLocalStorage({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
    });

    const userId = localStorage.getItem("user_id");
    if (userId && sessionStorage.getItem("guest_mode") !== "true") {
      await saveProfile(userId, {
        ...loadProfileFromLocalStorage(),
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
      });
    }

    router.push("/onboarding/step-2");
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
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

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label
                htmlFor="fullName"
                className="block text-xs font-medium text-white/60 tracking-wide uppercase"
              >
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full bg-white/[0.04] border border-white/[0.10] hover:border-white/20 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-white/60 tracking-wide uppercase"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-white/[0.04] border border-white/[0.10] hover:border-white/20 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="phone"
                className="block text-xs font-medium text-white/60 tracking-wide uppercase"
              >
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-white/[0.04] border border-white/[0.10] hover:border-white/20 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="location"
                className="block text-xs font-medium text-white/60 tracking-wide uppercase"
              >
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                autoComplete="address-level2"
                placeholder="San Francisco, CA"
                value={formData.location}
                onChange={handleChange}
                className="w-full bg-white/[0.04] border border-white/[0.10] hover:border-white/20 focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all duration-200"
              />
            </div>
          </div>

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
              className="flex-[2] px-5 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-200"
            >
              Continue
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
