"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  BookOpen, 
  ArrowLeft, 
  ArrowRight,
  TrendingUp, 
  Award, 
  Percent, 
  Activity, 
  Users,
  GraduationCap,
  Sparkles,
  School,
  BookMarked
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { getBranches } from "@/lib/api/enrollment";
import SmartUpRankingView from "@/components/curriculum-dept/SmartUpRankingView";

// Static instructor map per branch — used as fallback when DB has no Instructor records
// Sourced from Teachers & Staff pages on the SmartUp production portal
const STATIC_BRANCH_INSTRUCTORS: Record<string, { name: string; instructor_name: string; subjects: string[] }[]> = {
  "chullickal": [
    { name: "INS-CHL-BILAL",   instructor_name: "MOHAMMED BILAL K.S",  subjects: ["8th Chemistry","9th Chemistry","10th Chemistry","11th Chemistry","12th Chemistry"] },
    { name: "INS-CHL-INZAMAM", instructor_name: "Inzamam Ul Haq K Y",  subjects: ["8th Physics","9th Physics","10th Physics","11th Physics","12th Physics"] },
    { name: "INS-CHL-FARZANA", instructor_name: "Farzana Naushad",      subjects: ["8th Biology","9th Biology","10th Biology"] },
    { name: "INS-CHL-IBRAHIM", instructor_name: "Ibrahim",              subjects: ["8th Mathematics","9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-CHL-FIDHA",   instructor_name: "Fidha Hami",           subjects: ["8th Mathematics","9th Mathematics"] },
    { name: "INS-CHL-FAREEDA", instructor_name: "FAREEDA M A",          subjects: ["8th Hindi","9th Hindi","10th Hindi", "8th Language2", "9th Language2", "10th Language2"] },
    { name: "INS-CHL-ALSHAMZ", instructor_name: "Alshamz",              subjects: ["8th Malayalam","9th Malayalam","10th Malayalam", "8th Language1", "9th Language1", "10th Language1"] },
    { name: "INS-CHL-RIONA",   instructor_name: "Riona P R",            subjects: ["8th Social Science","9th Social Science","10th Social Science"] },
  ],
  "edappally": [
    { name: "INS-EDP-AFLAH",   instructor_name: "Aflah KR",             subjects: ["12th Chemistry"] },
    { name: "INS-EDP-AKHILA",  instructor_name: "Akhila",               subjects: ["8th Chemistry","9th Chemistry","10th Chemistry","11th Chemistry","12th Chemistry"] },
    { name: "INS-EDP-SREYAS",  instructor_name: "SREYAS M S",           subjects: ["8th Physics","9th Physics","10th Physics","11th Physics","12th Physics","8th Chemistry","9th Chemistry","10th Chemistry","11th Chemistry","12th Chemistry"] },
    { name: "INS-EDP-SAJITH",  instructor_name: "Sajith",               subjects: ["8th Physics","9th Physics","10th Physics","11th Physics","12th Physics"] },
    { name: "INS-EDP-RONALDO", instructor_name: "Ronaldo Biju",         subjects: ["8th Mathematics","9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-EDP-CHAIT",   instructor_name: "Chaitanya Krishna",    subjects: ["8th Mathematics","9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-EDP-RAMS",    instructor_name: "Ramseena P S",         subjects: ["8th Social Science","9th Social Science","10th Social Science"] },
  ],
  "eraveli": [
    { name: "INS-ERV-ZAMEEL",  instructor_name: "AL ZAMEEL",            subjects: ["10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-ERV-ANSAF",   instructor_name: "Ansaf P B",            subjects: ["8th Chemistry","9th Chemistry","10th Chemistry","11th Chemistry","12th Chemistry"] },
    { name: "INS-ERV-ESSATH",  instructor_name: "Essath",               subjects: ["8th English","9th English","10th English"] },
    { name: "INS-ERV-FARHA",   instructor_name: "Farhana TB",           subjects: ["8th Social Science","9th Social Science","10th Social Science"] },
    { name: "INS-ERV-HANNA",   instructor_name: "Hanna",                subjects: ["8th Hindi","9th Hindi","10th Hindi", "8th Language2", "9th Language2", "10th Language2"] },
    { name: "INS-ERV-MUHSINA", instructor_name: "Muhsina Binth hashim", subjects: ["8th Physics","9th Physics","8th Chemistry","9th Chemistry"] },
    { name: "INS-ERV-NAZRA",   instructor_name: "Nazra",                subjects: ["8th Mathematics","9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-ERV-SALEH",   instructor_name: "Saleh Lukman",         subjects: ["8th Physics","9th Physics","10th Physics","11th Physics","12th Physics"] },
    { name: "INS-ERV-THASLEE", instructor_name: "Thasleema MS",         subjects: ["8th Biology","9th Biology","10th Biology"] },
  ],
  "fortkochi": [
    { name: "INS-FKI-FASEEHA", instructor_name: "Faseeha M.U",          subjects: ["8th Social Science","9th Social Science","10th Social Science"] },
    { name: "INS-FKI-IJAS",    instructor_name: "Ijas Ahmed",           subjects: ["8th Mathematics","9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-FKI-MEHFIL",  instructor_name: "Mehfil",               subjects: ["8th Mathematics","9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-FKI-MUBASH",  instructor_name: "Mubashir",             subjects: ["8th Social Science","9th Social Science","10th Social Science"] },
    { name: "INS-FKI-NASRIYA", instructor_name: "Nasriya K N",          subjects: ["8th Malayalam","9th Malayalam","10th Malayalam", "8th Language1", "9th Language1", "10th Language1"] },
    { name: "INS-FKI-RIJAZ",   instructor_name: "Rijaz",                subjects: ["8th Chemistry","9th Chemistry","10th Chemistry","11th Chemistry","12th Chemistry"] },
  ],
  "kadavanthara": [
    { name: "INS-KDV-ANJU",    instructor_name: "Anju S venu",          subjects: ["8th Mathematics","9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-KDV-AYANA",   instructor_name: "Ayana Rani",           subjects: ["8th Physics","9th Physics","10th Physics","11th Physics","12th Physics"] },
    { name: "INS-KDV-FATHIMA", instructor_name: "Fathima Rahfa",        subjects: ["9th Chemistry"] },
    { name: "INS-KDV-MANJIMA", instructor_name: "Manjima",              subjects: ["8th Chemistry","9th Chemistry","10th Chemistry","11th Chemistry","12th Chemistry"] },
    { name: "INS-KDV-NOOR",    instructor_name: "Noorniza",             subjects: ["8th Biology","9th Biology","10th Biology","11th Biology","12th Biology"] },
  ],
  "moolamkuzhi": [
    { name: "INS-MLK-AFNA",    instructor_name: "Afna Navas",           subjects: ["8th Mathematics","8th English","9th English"] },
    { name: "INS-MLK-AKHIN",   instructor_name: "Akhinesh R Prakash",   subjects: ["8th Physics","9th Physics","10th Physics","8th Chemistry","9th Chemistry","10th Chemistry"] },
    { name: "INS-MLK-FARHA",   instructor_name: "FARHANA",              subjects: ["8th Mathematics","9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-MLK-MUHAM",   instructor_name: "Muhammad Hammad P H",  subjects: ["8th Social Science","9th Social Science","10th Social Science"] },
    { name: "INS-MLK-NEDHA",   instructor_name: "Nedha",                subjects: ["8th Malayalam","9th Malayalam", "8th Language1", "9th Language1"] },
    { name: "INS-MLK-SANJANA", instructor_name: "Sanjana Prasad",       subjects: ["8th Hindi","9th Hindi","10th Hindi", "8th Language2", "9th Language2", "10th Language2"] },
  ],
  "palluruthy": [
    { name: "INS-PLR-ALISHA",  instructor_name: "Alisha Azad",          subjects: ["8th Hindi","9th Hindi","10th Hindi", "8th Language2", "9th Language2", "10th Language2"] },
    { name: "INS-PLR-ANTONY",  instructor_name: "Antony K M",           subjects: ["8th Physics","9th Physics","10th Physics","11th Physics","12th Physics"] },
    { name: "INS-PLR-ANWAR",   instructor_name: "ANWAR K H",            subjects: ["8th Chemistry","9th Chemistry","10th Chemistry","11th Chemistry","12th Chemistry"] },
    { name: "INS-PLR-ASIF",    instructor_name: "Asif",                 subjects: ["8th Social Science","9th Social Science","10th Social Science"] },
    { name: "INS-PLR-FARHANA", instructor_name: "Farhana K U",          subjects: ["9th Malayalam","10th Malayalam", "9th Language1", "10th Language1"] },
    { name: "INS-PLR-FARZANA", instructor_name: "FARZANA P.G",          subjects: ["8th Mathematics","9th Mathematics"] },
    { name: "INS-PLR-MARIA",   instructor_name: "Maria",                subjects: ["8th English","9th English","10th English"] },
    { name: "INS-PLR-SHAHZIYA",instructor_name: "Shahziya",             subjects: ["8th Biology","9th Biology","10th Biology","11th Biology","12th Biology"] },
    { name: "INS-PLR-RAGHUL",  instructor_name: "T S RAGHUL",           subjects: ["9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
  ],
  "thopumpadi": [
    { name: "INS-TPD-ABHIRAM", instructor_name: "Abhiram M",            subjects: ["8th Physics","9th Physics","10th Physics","11th Physics","12th Physics"] },
    { name: "INS-TPD-AHAD",    instructor_name: "Ahad",                 subjects: ["8th Chemistry","9th Chemistry","10th Chemistry","11th Chemistry","12th Chemistry"] },
    { name: "INS-TPD-AMJITH",  instructor_name: "Amjith",               subjects: ["9th Physics","10th Physics","11th Physics","12th Physics"] },
    { name: "INS-TPD-ASNAMOL", instructor_name: "Asnamol vi",           subjects: ["8th Social Science","9th Social Science","10th Social Science"] },
    { name: "INS-TPD-JINSIYA", instructor_name: "Jinsiya",              subjects: ["8th Mathematics","9th Mathematics","10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-TPD-RAZAL",   instructor_name: "Razal",                subjects: ["9th Biology","10th Biology"] },
  ],
  "vennala": [
    { name: "INS-VNL-AKZAMOL", instructor_name: "AKZAMOL BABY",         subjects: ["8th Physics","9th Physics","10th Physics","11th Physics","12th Physics"] },
    { name: "INS-VNL-JISHNU",  instructor_name: "Jishnu",               subjects: ["8th Chemistry","9th Chemistry","10th Chemistry","11th Chemistry","12th Chemistry"] },
    { name: "INS-VNL-JYOTHY",  instructor_name: "Jyothy Rajesh",        subjects: ["8th Hindi","9th Hindi","10th Hindi", "8th Language2", "9th Language2", "10th Language2"] },
    { name: "INS-VNL-MISRIYA", instructor_name: "Misriya P S",          subjects: ["8th Mathematics","9th Mathematics"] },
    { name: "INS-VNL-NIKITHA", instructor_name: "Nikitha",              subjects: ["8th Biology","9th Biology","10th Biology"] },
    { name: "INS-VNL-RAGESH",  instructor_name: "RAGESH TR",            subjects: ["8th Malayalam","9th Malayalam","10th Malayalam", "8th Language1", "9th Language1", "10th Language1"] },
    { name: "INS-VNL-RANJITH", instructor_name: "Ranjith P S",          subjects: ["8th Social Science","9th Social Science","10th Social Science"] },
    { name: "INS-VNL-SALIH",   instructor_name: "Salih P R",            subjects: ["10th Mathematics","11th Mathematics","12th Mathematics"] },
    { name: "INS-VNL-SARA",    instructor_name: "Sara Stephen",         subjects: ["8th English","9th English","10th English"] },
  ],
};

// Helper to clean and extract base subject name
const getBaseSubject = (courseCode: string): string => {
  if (!courseCode) return "";
  // Remove leading grade prefixes like "10th ", "8th ", "12th ", "8th Grade "
  return courseCode
    .replace(/^\d+(st|nd|rd|th)?\s+Grade\s+/i, "")
    .replace(/^\d+(st|nd|rd|th)?\s+/i, "")
    .replace(/^Language\d+\s+/i, "")
    .trim();
};

// Helper to normalize branch names for robust comparisons
const cleanBranchName = (name: string): string => {
  if (!name) return "";
  return name.replace(/^Smart\s+Up\s+/i, "").trim().toLowerCase();
};

export default function SubjectPerformancePage() {
  const [mode, setMode] = useState<"menu" | "subjectwise" | "smartup">("menu");
  const [level, setLevel] = useState<"branches" | "subjects" | "ranking">("branches");

  // Selection states
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedBaseSubject, setSelectedBaseSubject] = useState("");
  const [rankingBase, setRankingBase] = useState<"full_marks" | "aplus" | "p90" | "p80" | "p70" | "pass_rate" | "failed_students">("pass_rate");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Helper to determine tailwind classes based on pass rate percentage
  const getRateColor = (rate: number) => {
    if (rate === 0) return { text: "text-text-tertiary", bg: "bg-text-tertiary" };
    if (rate >= 85) return { text: "text-success", bg: "bg-success" };
    if (rate >= 60) return { text: "text-primary", bg: "bg-primary" };
    return { text: "text-error", bg: "bg-error" };
  };

  // 1. Fetch branches from API
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches-list-for-rankings"],
    queryFn: getBranches,
    staleTime: 5 * 60_000,
  });

  // 2. Fetch all instructors and filter by instructor_log for cross-branch support
  const { data: branchInstructors = [], isLoading: instructorsLoading } = useQuery({
    queryKey: ["branch-instructors-v3", selectedBranch],
    queryFn: async () => {
      if (!selectedBranch) return [];
      const cleanBranch = selectedBranch.replace(/^Smart\s+Up\s+/i, "").trim().toLowerCase();
      
      try {
        // Step 1: Fetch ALL active instructors in the system (no branch filter)
        const instrRes = await fetch("/api/curriculum-dept/admin-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: "resource/Instructor",
            method: "GET",
            payload: {
              fields: JSON.stringify(["name", "instructor_name", "employee"]),
              limit_page_length: "1000"
            }
          })
        }).then(r => r.json());
        
        const allInstructors: any[] = instrRes.data ?? [];
        if (!allInstructors.length) {
          return STATIC_BRANCH_INSTRUCTORS[cleanBranch] ?? [];
        }

        // Step 2: Fetch full doc for all instructors to check instructor_log (Chunked to prevent rate limit)
        const fullDocs = [];
        const chunkSize = 5;
        for (let i = 0; i < allInstructors.length; i += chunkSize) {
          const chunk = allInstructors.slice(i, i + chunkSize);
          const chunkDocs = await Promise.all(
            chunk.map(async (ins) => {
              try {
                const docRes = await fetch("/api/curriculum-dept/admin-proxy", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    path: `resource/Instructor/${encodeURIComponent(ins.name)}`,
                    method: "GET",
                    payload: {}
                  })
                }).then(r => r.json());
                return { ...ins, ...docRes.data, instructor_log: docRes.data?.instructor_log ?? [] };
              } catch (e) {
                console.error("Failed to fetch instructor", ins.name, e);
                return { ...ins, instructor_log: [] };
              }
            })
          );
          fullDocs.push(...chunkDocs);
        }

        // Step 3: Filter by selectedBranch and extract subjects
        const activeInstructorsInBranch = fullDocs.map(ins => {
          const subjects = [...new Set(
            ins.instructor_log
              .filter((entry: any) => {
                const branchName = entry.branch || entry.custom_branch;
                if (!branchName || !entry.course) return false;
                const entryBranch = branchName.replace(/^Smart\s+Up\s+/i, "").trim().toLowerCase();
                return entryBranch === cleanBranch;
              })
              .map((entry: any) => entry.course as string)
          )];
          const isVisiting = Boolean(ins.custom_company && !ins.custom_company.toLowerCase().includes(cleanBranch));
          return { name: ins.name, instructor_name: ins.instructor_name, subjects, isVisiting, custom_company: ins.custom_company };
        }).filter(ins => ins.subjects.length > 0);

        if (activeInstructorsInBranch.length > 0) {
          return activeInstructorsInBranch;
        } else {
          return STATIC_BRANCH_INSTRUCTORS[cleanBranch] ?? [];
        }
      } catch (err) {
        console.warn("Instructor fetch failed, using static fallback:", err);
        return STATIC_BRANCH_INSTRUCTORS[cleanBranch] ?? [];
      }
    },
    enabled: !!selectedBranch,
    staleTime: 120_000,
  });

  // 3. Fetch all assessment plans to link courses and metadata
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["all-plans-for-subject-rankings"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Plan",
          method: "GET",
          payload: {
            fields: JSON.stringify([
              "name",
              "student_group",
              "assessment_name",
              "course",
              "maximum_assessment_score",
              "custom_branch",
              "examiner",
              "examiner_name",
              "owner"
            ]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "3000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 3. Fetch all assessment results to calculate scores
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["all-results-for-subject-rankings"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Result",
          method: "GET",
          payload: {
            fields: JSON.stringify(["assessment_plan", "total_score", "maximum_score", "course"]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "10000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // Map each plan to its metadata
  const planMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    allPlans.forEach((p: any) => {
      map.set(p.name, p);
    });
    return map;
  }, [allPlans]);

  // --- BRANCH PERFORMANCE SUMMARY ---
  const branchesSummary = useMemo(() => {
    if (branches.length === 0 || allResults.length === 0) return [];

    return branches.map((b: any) => {
      // Find plans belonging to this branch
      const branchPlans = allPlans.filter(
        (p: any) => cleanBranchName(p.custom_branch) === cleanBranchName(b.name)
      );
      const planNames = new Set(branchPlans.map((p: any) => p.name));

      // Filter results for plans in this branch
      const branchResults = allResults.filter((r: any) => planNames.has(r.assessment_plan));

      let passCount = 0;
      let totalObtained = 0;
      let totalMax = 0;

      branchResults.forEach((r: any) => {
        totalObtained += r.total_score;
        totalMax += r.maximum_score;
        if ((r.total_score / r.maximum_score) >= 0.4) {
          passCount++;
        }
      });

      const passRate = branchResults.length > 0 ? (passCount / branchResults.length) * 100 : 0;
      const avgScore = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

      // Extract unique base subjects in this branch
      const subjectSet = new Set<string>();
      branchPlans.forEach((p: any) => {
        if (p.course) {
          subjectSet.add(getBaseSubject(p.course));
        }
      });

      return {
        ...b,
        passRate: branchResults.length > 0 ? `${passRate.toFixed(1)}%` : "0%",
        numericRate: passRate,
        avgScore: avgScore.toFixed(1),
        examsCount: branchPlans.length,
        subjectsCount: subjectSet.size,
        totalAssessments: branchResults.length
      };
    });
  }, [branches, allPlans, allResults]);

  // --- SUBJECTS IN SELECTED BRANCH SUMMARY ---
  const subjectsSummary = useMemo(() => {
    if (!selectedBranch || allPlans.length === 0) return [];

    // Plans belonging to selected branch
    const branchPlans = allPlans.filter(
      (p: any) => cleanBranchName(p.custom_branch) === cleanBranchName(selectedBranch)
    );
    const planNames = new Set(branchPlans.map((p: any) => p.name));

    // Results in selected branch
    const branchResults = allResults.filter((r: any) => planNames.has(r.assessment_plan));

    // Group branch results by Base Subject name
    const subjectGroups = new Map<string, { baseName: string; results: any[]; plans: any[] }>();

    branchPlans.forEach((p: any) => {
      if (!p.course) return;
      const baseName = getBaseSubject(p.course);
      if (!subjectGroups.has(baseName)) {
        subjectGroups.set(baseName, { baseName, results: [], plans: [] });
      }
      subjectGroups.get(baseName)!.plans.push(p);
    });

    branchResults.forEach((r: any) => {
      if (!r.course) return;
      const baseName = getBaseSubject(r.course);
      if (subjectGroups.has(baseName)) {
        subjectGroups.get(baseName)!.results.push(r);
      }
    });

    return Array.from(subjectGroups.values()).map((sg) => {
      let passCount = 0;
      let totalObtained = 0;
      let totalMax = 0;

      sg.results.forEach((r: any) => {
        totalObtained += r.total_score;
        totalMax += r.maximum_score;
        if ((r.total_score / r.maximum_score) >= 0.4) {
          passCount++;
        }
      });

      const passRate = sg.results.length > 0 ? (passCount / sg.results.length) * 100 : 0;
      const avgScore = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

      // Count instructors from the static/dynamic map that teach this base subject
      const instructorsFromMap = branchInstructors.filter((ins: any) =>
        ins.subjects?.some((s: string) => getBaseSubject(s) === sg.baseName)
      );
      const instructorsCount = instructorsFromMap.length;

      return {
        baseName: sg.baseName,
        passRate: sg.results.length > 0 ? `${passRate.toFixed(1)}%` : "0%",
        numericRate: passRate,
        avgScore: avgScore.toFixed(1),
        examsCount: sg.plans.length,
        instructorsCount,
        totalAssessments: sg.results.length
      };
    }).sort((a, b) => b.numericRate - a.numericRate);
  }, [selectedBranch, allPlans, allResults, branchInstructors]);

  // --- TEACHER WISE RANKING FOR SELECTED SUBJECT & BRANCH ---
  // Logic: Use the static instructor map ONLY — never look at plan.examiner or plan.owner
  // Each instructor is matched to results via the EXACT courses they teach (e.g. "8th Biology", "9th Biology")
  const teacherRankings = useMemo(() => {
    if (!selectedBranch || !selectedBaseSubject || allResults.length === 0) return [];

    // Step 1: Get all instructors in this branch who teach this base subject
    const subjectInstructors = branchInstructors.filter((ins: any) =>
      ins.subjects?.some((s: string) => getBaseSubject(s) === selectedBaseSubject)
    );

    // If no instructor data from static map, return empty (don't show admin)
    if (subjectInstructors.length === 0) return [];

    // Step 2: Build course → instructor(s) reverse map
    // e.g. "8th Biology" → [Teacher A], "12th Biology" → [Teacher B]
    const courseToInstructors = new Map<string, any[]>();
    subjectInstructors.forEach((ins: any) => {
      (ins.subjects as string[])
        .filter((s) => getBaseSubject(s) === selectedBaseSubject)
        .forEach((course) => {
          if (!courseToInstructors.has(course)) courseToInstructors.set(course, []);
          courseToInstructors.get(course)!.push(ins);
        });
    });

    // Step 3: Filter plans in this branch for this subject, only where instructor is known
    const subjectPlans = allPlans.filter((p: any) =>
      cleanBranchName(p.custom_branch) === cleanBranchName(selectedBranch) &&
      getBaseSubject(p.course) === selectedBaseSubject &&
      courseToInstructors.has(p.course)
    );
    const planNames = new Set(subjectPlans.map((p: any) => p.name));
    const subjectResults = allResults.filter((r: any) => planNames.has(r.assessment_plan));

    // Step 4: Group results by instructor using direct course match
    const teacherGroups = new Map<string, { name: string; courses: Set<string>; results: any[]; isVisiting: boolean }>();
    // Pre-initialize all matching instructors so they appear even with 0 results
    subjectInstructors.forEach((ins: any) => {
      if (!teacherGroups.has(ins.name)) {
        const assignedCourses = (ins.subjects as string[]).filter((s) => getBaseSubject(s) === selectedBaseSubject);
        teacherGroups.set(ins.name, { name: ins.instructor_name, courses: new Set<string>(assignedCourses), results: [], isVisiting: !!ins.isVisiting });
      }
    });

    subjectResults.forEach((r: any) => {
      const plan = planMetaMap.get(r.assessment_plan);
      const course = plan?.course;
      if (!course) return;

      const instructorsForCourse = courseToInstructors.get(course) ?? [];
      if (instructorsForCourse.length === 0) return;

      // Assign this result to ALL instructors who teach this specific course
      // Since there is no examiner linking, teachers who share a course share its performance metrics
      instructorsForCourse.forEach((assigned: any) => {
        teacherGroups.get(assigned.name)!.results.push(r);
        teacherGroups.get(assigned.name)!.courses.add(course);
      });
    });

    // Step 5: Compute stats for each instructor
    const list = Array.from(teacherGroups.values())
      .map((t) => {
        let fullMarks = 0;
        let aplus = 0;
        let p90 = 0;
        let p80 = 0;
        let p70 = 0;
        let passCount = 0;
        let failCount = 0;

        t.results.forEach((r) => {
          const pct = (r.total_score / r.maximum_score) * 100;
          if (r.total_score === r.maximum_score) fullMarks++;
          if (pct >= 90) {
            aplus++;
            p90++;
          }
          if (pct >= 80) p80++;
          if (pct >= 70) p70++;
          if (pct >= 40) {
            passCount++;
          } else {
            failCount++;
          }
        });

        const passRate = t.results.length > 0 ? (passCount / t.results.length) * 100 : 0;

        return {
          name: t.name,
          courses: Array.from(t.courses).sort().join(", "),
          isVisiting: t.isVisiting,
          fullMarks,
          aplus,
          p90,
          p80,
          p70,
          passRate,
          failCount,
          totalStudents: t.results.length
        };
      });

    // Step 6: Sort by selected metric
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (rankingBase) {
        case "full_marks":
          valA = a.fullMarks;
          valB = b.fullMarks;
          break;
        case "aplus":
          valA = a.aplus;
          valB = b.aplus;
          break;
        case "p90":
          valA = a.p90;
          valB = b.p90;
          break;
        case "p80":
          valA = a.p80;
          valB = b.p80;
          break;
        case "p70":
          valA = a.p70;
          valB = b.p70;
          break;
        case "pass_rate":
          valA = a.passRate;
          valB = b.passRate;
          break;
        case "failed_students":
          valA = a.failCount;
          valB = b.failCount;
          break;
      }

      if (rankingBase === "failed_students") {
        return sortOrder === "desc" ? valA - valB : valB - valA;
      } else {
        return sortOrder === "desc" ? valB - valA : valA - valB;
      }
    });

    return list.map((item, index) => ({
      ...item,
      rank: index + 1
    }));
  }, [allResults, allPlans, selectedBranch, selectedBaseSubject, planMetaMap, rankingBase, sortOrder, branchInstructors]);

  const isLoading = branchesLoading || plansLoading || resultsLoading || instructorsLoading;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
          <Trophy className="h-7 w-7 text-primary animate-pulse" />
          Teacher Ranking
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary">
          Analyze and compare teacher performance across subjects and branches.
        </p>
      </div>

      {mode === "menu" ? (
        <AnimatePresence mode="wait">
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
          >
            <Card hover onClick={() => setMode("subjectwise")} className="cursor-pointer border-t-4 border-t-primary p-8">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <BookOpen className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-text-primary">Subject-Wise Ranking</h3>
                <p className="text-text-secondary text-sm">
                  Compare teacher performance handling the same subjects within a branch.
                </p>
              </div>
            </Card>

            <Card hover onClick={() => setMode("smartup")} className="cursor-pointer border-t-4 border-t-purple-500 p-8">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <Trophy className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-text-primary">SmartUp Ranking</h3>
                <p className="text-text-secondary text-sm">
                  Overall teacher ranking across the entire SmartUp organization.
                </p>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      ) : mode === "smartup" ? (
        <SmartUpRankingView 
          onBack={() => setMode("menu")} 
          allResults={allResults} 
          allPlans={allPlans} 
          planMetaMap={planMetaMap} 
        />
      ) : isLoading ? (
        <div className="py-32 flex justify-center items-center">
          <GifLoader size="lg" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {/* LEVEL 1: BRANCH SELECTION */}
          {level === "branches" && (
            <motion.div
              key="branches"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setMode("menu")}
                    className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-md shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4" /> Menu
                  </button>
                  <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" /> Select Branch
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branchesSummary.map((b: any) => {
                  const colors = getRateColor(b.numericRate);
                  return (
                    <Card 
                      key={b.name}
                      hover
                      onClick={() => {
                        setSelectedBranch(b.name.startsWith("Smart Up ") ? b.name : `Smart Up ${b.name}`);
                        setLevel("subjects");
                      }}
                      className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-primary/20 transition-all group overflow-hidden bg-surface"
                    >
                      <CardHeader className="p-6 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-xl">
                            <School className="h-6 w-6" />
                          </div>
                          <Badge className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/[0.04] font-bold">
                            {b.subjectsCount} Subjects
                          </Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                          {b.name.replace("Smart Up ", "")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 pt-2">
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-xs text-text-secondary font-medium">Average Pass Rate</span>
                          <span className={`text-2xl font-extrabold tracking-tight ${colors.text}`}>
                            {b.passRate}
                          </span>
                        </div>
                        {b.numericRate > 0 && (
                          <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3.5 overflow-hidden">
                            <div 
                              className={`h-full ${colors.bg} rounded-full`}
                              style={{ width: `${b.numericRate}%` }}
                            />
                          </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                          <span>{b.examsCount} Exams</span>
                          <span>{b.totalAssessments} Submissions</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* LEVEL 2: SUBJECTS LISTING FOR SELECTED BRANCH */}
          {level === "subjects" && (
            <motion.div
              key="subjects"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setLevel("branches")}
                    className="h-8 px-3 text-xs border border-border-input bg-surface rounded-[8px] flex items-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Branches
                  </button>
                  <h2 className="text-base font-bold text-text-primary">
                    Subjects in {selectedBranch.replace("Smart Up ", "")}
                  </h2>
                </div>
              </div>

              {subjectsSummary.length === 0 ? (
                <Card className="p-12 text-center border-dashed bg-surface">
                  <h3 className="text-base font-semibold text-text-primary">No subjects found</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    No academic records exist for the selected branch.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjectsSummary.map((sub) => {
                    const colors = getRateColor(sub.numericRate);
                    return (
                      <Card 
                        key={sub.baseName}
                        hover
                        onClick={() => {
                          setSelectedBaseSubject(sub.baseName);
                          setLevel("ranking");
                        }}
                        className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm hover:border-primary/20 transition-all group overflow-hidden bg-surface"
                      >
                        <CardHeader className="p-6 pb-2">
                          <div className="flex justify-between items-start">
                            <div className="p-2.5 bg-primary/5 text-primary rounded-xl">
                              <BookMarked className="h-6 w-6" />
                            </div>
                            <Badge className="bg-primary/10 text-primary border-none font-bold">
                              {sub.instructorsCount} Instructors
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-text-primary mt-4 group-hover:text-primary transition-colors">
                            {sub.baseName}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-2">
                          <div className="mt-2 flex items-baseline justify-between">
                            <span className="text-xs text-text-secondary font-medium">Branch Pass Rate</span>
                            <span className={`text-2xl font-extrabold tracking-tight ${colors.text}`}>
                              {sub.passRate}
                            </span>
                          </div>
                          {sub.numericRate > 0 && (
                            <div className="w-full bg-slate-50 dark:bg-white/[0.04] h-1.5 rounded-full mt-3.5 overflow-hidden">
                              <div 
                                className={`h-full ${colors.bg} rounded-full`}
                                style={{ width: `${sub.numericRate}%` }}
                              />
                            </div>
                          )}
                          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[10px] text-text-tertiary font-bold uppercase tracking-wider">
                            <span>{sub.examsCount} Exams</span>
                            <span>{sub.totalAssessments} Submissions</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* LEVEL 3: SUBJECT-WISE TEACHER RANKINGS */}
          {level === "ranking" && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Filter bar */}
              <div className="flex items-center justify-between flex-wrap gap-4 bg-slate-50/50 dark:bg-white/[0.02] p-4 rounded-xl border border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-3 flex-wrap">
                  <button 
                    onClick={() => setLevel("subjects")}
                    className="h-8 px-3 text-xs border border-border-input bg-surface rounded-[8px] flex items-center font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Subjects
                  </button>

                  <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />

                  {/* Dynamic Metric selection */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Rank By:</span>
                    <select
                      value={rankingBase}
                      onChange={(e) => setRankingBase(e.target.value as any)}
                      className="h-8 px-2 text-xs bg-surface border border-border-input rounded-[8px] font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <option value="pass_rate">Pass Percentage</option>
                      <option value="full_marks">Full Marks Produced</option>
                      <option value="aplus">A+ Produced</option>
                      <option value="p90">90% & Above</option>
                      <option value="p80">80% & Above</option>
                      <option value="p70">70% & Above</option>
                      <option value="failed_students">Least Failed Students</option>
                    </select>
                  </div>

                  {/* Sort Order Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider">Sort Order:</span>
                    <select
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                      className="h-8 px-2 text-xs bg-surface border border-border-input rounded-[8px] font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <option value="desc">Highest to Lowest</option>
                      <option value="asc">Lowest to Highest</option>
                    </select>
                  </div>
                </div>

                <div className="text-xs text-text-secondary font-semibold">
                  Branch: <span className="text-primary">{selectedBranch.replace("Smart Up ", "")}</span>
                </div>
              </div>

              {teacherRankings.length === 0 ? (
                <Card className="p-12 text-center border-dashed bg-surface">
                  <h3 className="text-base font-semibold text-text-primary">No teachers found</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    No results have been submitted to compile rankings for {selectedBaseSubject} in this branch.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {/* Rankings Table Card */}
                  <Card className="border border-slate-100 dark:border-white/[0.06] shadow-sm overflow-hidden bg-surface">
                    <CardHeader className="bg-primary/5 dark:bg-primary/10 px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                      <CardTitle className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        SUBJECT-WISE TEACHER RANKING ({selectedBaseSubject.toUpperCase()})
                      </CardTitle>
                    </CardHeader>
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase font-bold text-text-tertiary tracking-wider">
                            <th className="px-6 py-3.5 w-16 text-center">Rank</th>
                            <th className="px-6 py-3.5">Teacher Name</th>
                            <th className="px-6 py-3.5 text-center w-28">Examinees</th>
                            <th className="px-6 py-3.5 text-center w-28">Full Marks</th>
                            <th className="px-6 py-3.5 text-center w-24">A+ Count</th>
                            <th className="px-6 py-3.5 text-center w-24">90% +</th>
                            <th className="px-6 py-3.5 text-center w-24">80% +</th>
                            <th className="px-6 py-3.5 text-center w-24">70% +</th>
                            <th className="px-6 py-3.5 text-center w-28">Failed Count</th>
                            <th className="px-6 py-3.5 text-center w-36">Pass %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                          {teacherRankings.map((row) => (
                            <tr key={row.name} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/5 transition-colors">
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full font-black text-xs ${
                                  row.rank === 1 
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" 
                                    : row.rank === 2
                                    ? "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-400"
                                    : row.rank === 3
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                                    : "text-text-secondary"
                                }`}>
                                  {row.rank}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-text-primary">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{row.name}</span>
                                  {row.isVisiting && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                      Visiting
                                    </span>
                                  )}
                                </div>
                                {row.courses && (
                                  <span className="block text-[10px] font-normal text-text-tertiary mt-0.5">
                                    {row.courses}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center font-semibold text-text-secondary">
                                {row.totalStudents}
                              </td>
                              <td className="px-6 py-4 text-center font-bold text-primary">
                                {row.fullMarks}
                              </td>
                              <td className="px-6 py-4 text-center font-semibold text-text-secondary">
                                {row.aplus}
                              </td>
                              <td className="px-6 py-4 text-center font-semibold text-text-secondary">
                                {row.p90}
                              </td>
                              <td className="px-6 py-4 text-center font-semibold text-text-secondary">
                                {row.p80}
                              </td>
                              <td className="px-6 py-4 text-center font-semibold text-text-secondary">
                                {row.p70}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center font-bold text-[10px] px-2 py-0.5 rounded-full ${
                                  row.failCount > 0 ? "bg-error/10 text-error" : "bg-success/10 text-success"
                                }`}>
                                  {row.failCount}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex flex-col items-center">
                                  <span className="font-extrabold text-text-primary">
                                    {row.passRate.toFixed(1)}%
                                  </span>
                                  <div className="w-16 bg-slate-100 dark:bg-white/[0.04] h-1 rounded-full mt-1.5 overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${
                                        row.passRate >= 85 ? "bg-success" : row.passRate >= 60 ? "bg-primary" : "bg-error"
                                      }`}
                                      style={{ width: `${row.passRate}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
