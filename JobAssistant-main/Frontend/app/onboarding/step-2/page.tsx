"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableMultiSelect from "../../../components/SearchableMultiSelect";

const WORK_EXPERIENCE_OPTIONS = [
  "Software Engineer",
  "Senior Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Product Manager",
  "Project Manager",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Cloud Architect",
  "UX Designer",
  "UI Designer",
  "Graphic Designer",
  "Marketing Manager",
  "Growth Hacker",
  "Content Strategist",
  "Sales Representative",
  "Account Executive",
  "Business Analyst",
  "Operations Manager",
  "HR Manager",
  "Recruiter",
  "Finance Analyst",
  "Accountant",
  "Legal Counsel",
  "Customer Success Manager",
  "QA Engineer",
  "Security Engineer",
];

const SKILLS_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Vue.js",
  "Angular",
  "Node.js",
  "Python",
  "Django",
  "FastAPI",
  "Java",
  "Spring Boot",
  "Go",
  "Rust",
  "C++",
  "SQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST APIs",
  "Docker",
  "Kubernetes",
  "AWS",
  "Google Cloud",
  "Azure",
  "Terraform",
  "CI/CD",
  "Git",
  "Agile / Scrum",
  "Figma",
  "Tailwind CSS",
  "Product Strategy",
  "Data Analysis",
  "Machine Learning",
  "Prompt Engineering",
  "Technical Writing",
  "Public Speaking",
  "Team Leadership",
  "Project Management",
];

const JOB_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Freelance",
  "Internship",
  "Remote",
];

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail & E-commerce",
  "Media & Entertainment",
  "Government",
  "Non-profit",
  "Consulting",
  "Manufacturing",
];

export default function CareerProfileStep() {
  const router = useRouter();

  const [workExperience, setWorkExperience] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [jobType, setJobType] = useState("");
  const [industry, setIndustry] = useState("");

  useEffect(() => {
    const savedWorkExperience = localStorage.getItem("profile_workExperience");
    const savedSkills = localStorage.getItem("profile_skills");
    const savedJobType = localStorage.getItem("profile_employmentType");
    const savedIndustry = localStorage.getItem("profile_preferredIndustry");

    if (savedWorkExperience) {
      try {
        setWorkExperience(JSON.parse(savedWorkExperience));
      } catch {
        setWorkExperience([]);
      }
    }

    if (savedSkills) {
      try {
        setSkills(JSON.parse(savedSkills));
      } catch {
        setSkills([]);
      }
    }

    if (savedJobType) setJobType(savedJobType);
    if (savedIndustry) setIndustry(savedIndustry);
  }, []);

  const isValid =
    workExperience.length > 0 &&
    skills.length > 0 &&
    jobType !== "" &&
    industry !== "";

  const handleContinue = () => {
    if (!isValid) return;

    localStorage.setItem(
      "profile_workExperience",
      JSON.stringify(workExperience)
    );
    localStorage.setItem("profile_skills", JSON.stringify(skills));
    localStorage.setItem("profile_employmentType", jobType);
    localStorage.setItem("profile_preferredIndustry", industry);

    router.push("/onboarding/step-3");
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

        <div className="bg-[#131820] border border-gray-800 rounded-2xl p-6 flex flex-col gap-6">
          <SearchableMultiSelect
            label="Work Experience"
            options={WORK_EXPERIENCE_OPTIONS}
            selected={workExperience}
            onChange={setWorkExperience}
            placeholder="e.g. Software Engineer, Product Manager..."
          />

          <SearchableMultiSelect
            label="Skills"
            options={SKILLS_OPTIONS}
            selected={skills}
            onChange={setSkills}
            placeholder="e.g. React, Python, Project Management..."
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">
              Desired Job Type
            </label>
            <select
              value={jobType}
              onChange={(e) => setJobType(e.target.value)}
              className="w-full bg-[#1a1f2e] border border-gray-700 hover:border-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-sm text-gray-200 rounded-xl px-3 py-2.5 outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="" disabled className="text-gray-500">
                Select a job type...
              </option>
              {JOB_TYPES.map((t) => (
                <option key={t} value={t} className="bg-[#1a1f2e]">
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">
              Preferred Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-[#1a1f2e] border border-gray-700 hover:border-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 text-sm text-gray-200 rounded-xl px-3 py-2.5 outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="" disabled className="text-gray-500">
                Select an industry...
              </option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind} className="bg-[#1a1f2e]">
                  {ind}
                </option>
              ))}
            </select>
          </div>
        </div>

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
            disabled={!isValid}
            className={`
              px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${
                isValid
                  ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30 active:scale-95"
                  : "bg-gray-800 text-gray-600 cursor-not-allowed"
              }
            `}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}