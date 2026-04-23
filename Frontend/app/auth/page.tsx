"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getProfile, getResumeMetadata, saveProfile } from "../../lib/api";
import { writeProfileToLocalStorage } from "../../lib/profile";

type Mode = "signin" | "signup";

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "12px",
  padding: "11px 14px",
  fontSize: "14px",
  color: "#e2e8f0",
  outline: "none",
  fontFamily: "'DM Sans', system-ui, sans-serif",
  transition: "border-color 0.2s",
  boxSizing: "border-box" as const,
};

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const confirmed = searchParams.get("confirmed");
    const authError = searchParams.get("error_description") || searchParams.get("error");

    if (authError) {
      setError(decodeURIComponent(authError).replace(/\+/g, " "));
      setSuccessMsg(null);
      return;
    }

    if (confirmed === "1") {
      router.push("/onboarding/step-1");
    }
  }, [searchParams, router]);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in both fields.");
      return;
    }

    if (mode === "signup") {
      if (!confirmPassword.trim() || !dateOfBirth.trim()) {
        setError("Please complete all signup fields.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("guest_mode");
        sessionStorage.removeItem("guest_user_id");
        localStorage.setItem("auth_user", "true");
      }

      if (mode === "signup") {
        localStorage.setItem("profile_email", email);
        localStorage.setItem("profile_dateOfBirth", dateOfBirth);

        const emailRedirectTo =
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/auth?confirmed=1`;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: {
              date_of_birth: dateOfBirth,
            },
          },
        });
        if (error) throw error;

        // Supabase can return an obfuscated user for existing confirmed emails
        // when email confirmation is enabled. In that case, treat it as an
        // already-registered account and ask the user to sign in instead.
        if (
          data.user &&
          Array.isArray(data.user.identities) &&
          data.user.identities.length === 0
        ) {
          setError("There is already an associated account with this email. Please sign in.");
          return;
        }

        if (data.user?.id) {
          localStorage.setItem("user_id", data.user.id);
          await saveProfile(data.user.id, {
            email,
            dateOfBirth,
          });
        }

        if (data.session) {
          // Email confirmation is OFF — session granted immediately
          router.push("/onboarding/step-1");
        } else {
          // Email confirmation is ON — ask user to check inbox
          setSuccessMsg(
            "Account created! Check your email for a confirmation link, then come back and sign in."
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user?.id) {
          localStorage.setItem("user_id", data.user.id);
          const savedProfile = await getProfile(data.user.id);
          writeProfileToLocalStorage(savedProfile);

          try {
            const resume = await getResumeMetadata(data.user.id);
            if (resume.file_name) {
              localStorage.setItem("resumeFileName", resume.file_name);
            }
          } catch {
            localStorage.removeItem("resumeFileName");
          }
        }
        localStorage.setItem("profile_email", email);
        router.push("/dashboard");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      if (message.toLowerCase().includes("already registered")) {
        setError("There is already an associated account with this email. Please sign in.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestEnter = () => {
    const guestId = crypto.randomUUID();
    sessionStorage.setItem("guest_mode", "true");
    sessionStorage.setItem("guest_user_id", guestId);
    sessionStorage.removeItem("guest_resume_uploaded");

    localStorage.removeItem("auth_user");
    localStorage.removeItem("profile_saved");
    localStorage.removeItem("resumeFileName");
    localStorage.removeItem("profile_fullName");
    localStorage.removeItem("profile_email");
    localStorage.removeItem("profile_phone");
    localStorage.removeItem("profile_location");
    localStorage.removeItem("profile_linkedin");
    localStorage.removeItem("profile_currentJobTitle");
    localStorage.removeItem("profile_yearsOfExperience");
    localStorage.removeItem("profile_summary");
    localStorage.removeItem("profile_desiredJobTitle");
    localStorage.removeItem("profile_salaryRange");
    localStorage.removeItem("profile_preferredWorkLocation");
    localStorage.removeItem("profile_employmentType");
    localStorage.removeItem("profile_preferredIndustry");
    localStorage.removeItem("profile_preferredIndustries");
    localStorage.removeItem("profile_workExperience");
    localStorage.removeItem("profile_skills");
    localStorage.setItem("user_id", guestId);
    router.push("/dashboard");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { border-color: rgba(99,102,241,0.6) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          background: "#080c17",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px",
          fontFamily: "'DM Sans', system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glows */}
        <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "700px", height: "400px", background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.14) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "fixed", bottom: "-160px", right: "-160px", width: "500px", height: "500px", borderRadius: "50%", background: "rgba(139,92,246,0.07)", filter: "blur(120px)", pointerEvents: "none" }} />

        <div style={{ position: "relative", width: "100%", maxWidth: "420px" }}>

          {/* Step indicator */}
          <p style={{ textAlign: "center", fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#818cf8", marginBottom: "12px" }}>
            Step 1 of 3
          </p>
          <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "999px", marginBottom: "32px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "33.33%", borderRadius: "999px", background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
          </div>

          {/* Card */}
          <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "40px 36px", backdropFilter: "blur(12px)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>

            {/* Icon */}
            <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: "rgba(99,102,241,0.14)", border: "1px solid rgba(99,102,241,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="3" stroke="#818cf8" strokeWidth="1.5" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1.5" fill="#818cf8" />
              </svg>
            </div>

            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#f1f5f9", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p style={{ fontSize: "14px", color: "#475569", margin: "0 0 28px", lineHeight: 1.6 }}>
              {mode === "signup"
                ? "Sign up to save your resume and personalize your job match analysis."
                : "Sign in to pick up where you left off."}
            </p>

            {/* Mode toggle */}
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "3px", marginBottom: "24px" }}>
              {(["signup", "signin"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setError(null); setSuccessMsg(null); }}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "'DM Sans', system-ui, sans-serif",
                    background: mode === m ? "rgba(99,102,241,0.25)" : "transparent",
                    color: mode === m ? "#a5b4fc" : "#475569",
                  }}
                >
                  {m === "signup" ? "Sign Up" : "Sign In"}
                </button>
              ))}
            </div>

            {/* Fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  style={inputStyle}
                />
              </div>
              {mode === "signup" && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Retype your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    style={inputStyle}
                  />
                </div>
              )}
              {mode === "signup" && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "6px" }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginTop: "16px", padding: "10px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5", fontSize: "13px" }}>
                {error}
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div style={{ marginTop: "16px", padding: "12px 14px", borderRadius: "10px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#86efac", fontSize: "13px", lineHeight: 1.5 }}>
                ✅ {successMsg}
              </div>
            )}

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "20px",
                padding: "13px",
                borderRadius: "12px",
                border: "none",
                background: loading ? "rgba(99,102,241,0.5)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                letterSpacing: "0.01em",
                boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.35)",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create Account →" : "Sign In →"}
            </button>

            <button
              type="button"
              onClick={handleGuestEnter}
              style={{
                width: "100%",
                marginTop: "12px",
                padding: "13px",
                borderRadius: "12px",
                border: "1px solid rgba(45,212,191,0.28)",
                background: "rgba(20,184,166,0.12)",
                color: "#99f6e4",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans', system-ui, sans-serif",
                letterSpacing: "0.01em",
              }}
            >
              Enter as Guest
            </button>

            <p style={{ textAlign: "center", fontSize: "12px", color: "#1e293b", marginTop: "20px", marginBottom: 0 }}>
              🔒 Stored securely in Supabase. We never share your data.
            </p>
          </div>

          {/* Back link */}
          <p style={{ textAlign: "center", fontSize: "12px", color: "#1e293b", marginTop: "20px" }}>
            Changed your mind?{" "}
            <a href="/" style={{ color: "#475569", textDecoration: "underline", cursor: "pointer" }}>
              Go back
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
