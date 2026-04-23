"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isGuest, setIsGuest] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    setIsGuest(sessionStorage.getItem("guest_mode") === "true");
    setIsSignedIn(localStorage.getItem("auth_user") === "true");
  }, [pathname]);

  const handlePrimaryAction = () => {
    if (isGuest || !isSignedIn) {
      if (isGuest) {
        sessionStorage.removeItem("guest_mode");
        sessionStorage.removeItem("guest_user_id");
        sessionStorage.removeItem("guest_resume_uploaded");
        localStorage.removeItem("resumeFileName");
        localStorage.removeItem("user_id");
      }
      router.push("/auth");
      return;
    }

    router.push("/profile");
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,12,23,0.82)",
        backdropFilter: "blur(14px)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          style={{
            border: "none",
            background: "transparent",
            color: "#f1f5f9",
            fontSize: "16px",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            cursor: "pointer",
          }}
        >
          JobAssistant
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handlePrimaryAction}
            style={{
              padding: "9px 14px",
              borderRadius: "10px",
              border: "1px solid rgba(99,102,241,0.28)",
              background: "rgba(99,102,241,0.14)",
              color: "#a5b4fc",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isGuest || !isSignedIn ? "Login" : "Profile Settings"}
          </button>
        </div>
      </div>
    </header>
  );
}
