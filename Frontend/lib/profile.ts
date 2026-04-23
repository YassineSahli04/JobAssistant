"use client";

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

export const EMPTY_PROFILE: UserProfile = {
  fullName: "",
  email: "",
  dateOfBirth: "",
  phone: "",
  location: "",
  linkedin: "",
  workExperience: [],
  skills: [],
  employmentType: "",
  preferredIndustry: "",
  currentJobTitle: "",
  yearsOfExperience: "",
  summary: "",
  desiredJobTitle: "",
  salaryRange: "",
  preferredWorkLocation: "",
  preferredIndustries: "",
  profileSaved: false,
  onboardingCompleted: false,
};

export function loadProfileFromLocalStorage(): UserProfile {
  return {
    fullName: localStorage.getItem("profile_fullName") || "",
    email: localStorage.getItem("profile_email") || "",
    dateOfBirth: localStorage.getItem("profile_dateOfBirth") || "",
    phone: localStorage.getItem("profile_phone") || "",
    location: localStorage.getItem("profile_location") || "",
    linkedin: localStorage.getItem("profile_linkedin") || "",
    workExperience: parseList(localStorage.getItem("profile_workExperience")),
    skills: parseList(localStorage.getItem("profile_skills")),
    employmentType: localStorage.getItem("profile_employmentType") || "",
    preferredIndustry: localStorage.getItem("profile_preferredIndustry") || "",
    currentJobTitle: localStorage.getItem("profile_currentJobTitle") || "",
    yearsOfExperience: localStorage.getItem("profile_yearsOfExperience") || "",
    summary: localStorage.getItem("profile_summary") || "",
    desiredJobTitle: localStorage.getItem("profile_desiredJobTitle") || "",
    salaryRange: localStorage.getItem("profile_salaryRange") || "",
    preferredWorkLocation: localStorage.getItem("profile_preferredWorkLocation") || "",
    preferredIndustries: localStorage.getItem("profile_preferredIndustries") || "",
    profileSaved: localStorage.getItem("profile_saved") === "true",
    onboardingCompleted: localStorage.getItem("hasCompletedOnboarding") === "true",
  };
}

export function writeProfileToLocalStorage(profile: Partial<UserProfile>): void {
  writeValue("profile_fullName", profile.fullName);
  writeValue("profile_email", profile.email);
  writeValue("profile_dateOfBirth", profile.dateOfBirth);
  writeValue("profile_phone", profile.phone);
  writeValue("profile_location", profile.location);
  writeValue("profile_linkedin", profile.linkedin);
  writeList("profile_workExperience", profile.workExperience);
  writeList("profile_skills", profile.skills);
  writeValue("profile_employmentType", profile.employmentType);
  writeValue("profile_preferredIndustry", profile.preferredIndustry);
  writeValue("profile_currentJobTitle", profile.currentJobTitle);
  writeValue("profile_yearsOfExperience", profile.yearsOfExperience);
  writeValue("profile_summary", profile.summary);
  writeValue("profile_desiredJobTitle", profile.desiredJobTitle);
  writeValue("profile_salaryRange", profile.salaryRange);
  writeValue("profile_preferredWorkLocation", profile.preferredWorkLocation);
  writeValue("profile_preferredIndustries", profile.preferredIndustries);

  if (typeof profile.profileSaved === "boolean") {
    localStorage.setItem("profile_saved", String(profile.profileSaved));
  }

  if (typeof profile.onboardingCompleted === "boolean") {
    localStorage.setItem("hasCompletedOnboarding", String(profile.onboardingCompleted));
  }
}

function parseList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeValue(key: string, value: string | undefined): void {
  if (typeof value === "string") {
    localStorage.setItem(key, value);
  }
}

function writeList(key: string, value: string[] | undefined): void {
  if (Array.isArray(value)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
