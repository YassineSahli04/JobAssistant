const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export interface UserProfile {
  fullName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  location: string;
  linkedin: string;
  workExperience: string[];
  skills: string[];
  employmentType: string;
  preferredIndustry: string;
  currentJobTitle: string;
  yearsOfExperience: string;
  summary: string;
  desiredJobTitle: string;
  salaryRange: string;
  preferredWorkLocation: string;
  preferredIndustries: string;
  profileSaved: boolean;
  onboardingCompleted: boolean;
}

async function readErrorDetail(res: Response, fallback: string): Promise<string> {
  const text = await res.text();
  if (!text) return fallback;

  try {
    const data = JSON.parse(text) as { detail?: string };
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }
  } catch {
    // Response was not JSON; use raw text.
  }

  return text;
}

export interface ScoreResult {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_gap: string;
  top_improvements: { action: string; reason: string; priority: string }[];
  summary: string;
}

export async function getProfile(userId: string): Promise<Partial<UserProfile>> {
  const res = await fetch(`${BACKEND_URL}/users/${userId}/profile`);
  if (!res.ok) {
    throw new Error(await readErrorDetail(res, `Request failed with status ${res.status}`));
  }
  return res.json();
}

export async function saveProfile(userId: string, profile: Partial<UserProfile>): Promise<Partial<UserProfile>> {
  const res = await fetch(`${BACKEND_URL}/users/${userId}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res, `Request failed with status ${res.status}`));
  }
  return res.json();
}

export async function getResumeMetadata(userId: string): Promise<{ file_name: string; file_path: string | null }> {
  const res = await fetch(`${BACKEND_URL}/users/${userId}/resume-metadata`);
  if (!res.ok) {
    throw new Error(await readErrorDetail(res, `Request failed with status ${res.status}`));
  }
  return res.json();
}

export async function scoreResume(userId: string, jobUrl: string): Promise<ScoreResult> {
  const res = await fetch(`${BACKEND_URL}/users/${userId}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_url: jobUrl }),
  });
  if (!res.ok) {
    throw new Error(await readErrorDetail(res, `Request failed with status ${res.status}`));
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
    throw new Error(await readErrorDetail(res, `Upload failed with status ${res.status}`));
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
    throw new Error(await readErrorDetail(res, `Request failed with status ${res.status}`));
  }
  const data = await res.json();
  return data.answer;
}
