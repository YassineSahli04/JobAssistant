const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export interface ScoreResult {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_gap: string;
  top_improvements: { action: string; reason: string; priority: string }[];
  summary: string;
}

export async function scoreResume(userId: string, jobUrl: string): Promise<ScoreResult> {
  const res = await fetch(`${BACKEND_URL}/users/${userId}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_url: jobUrl }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export async function uploadResume(userId: string, file: File): Promise<{ message: string; file_path: string; user_id: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BACKEND_URL}/users/upload?user_id=${encodeURIComponent(userId)}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Upload failed with status ${res.status}`);
  }
  return res.json();
}

export async function tailorAnswer(
  userId: string,
  jobUrl: string,
  userQuestion: string
): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/users/${userId}/answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_url: jobUrl, user_question: userQuestion }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || `Request failed with status ${res.status}`);
  }

  const payload = await res.json();
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.answer === "string") return record.answer;
    if (typeof record.text === "string") return record.text;
  }

  return String(payload ?? "");
}