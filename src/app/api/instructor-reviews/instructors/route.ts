import { NextRequest, NextResponse } from "next/server";
import { frappeAdminGet } from "@/lib/server/frappeAdmin";

/**
 * Normalizes branch strings for reliable matching
 * E.g. "Smart Up Thopumpadi" -> "thopumpadi", "Thoppumpady" -> "thopumpadi"
 */
function normalizeBranch(b?: string | null): string {
  if (!b) return "";
  return b
    .toLowerCase()
    .replace(/^smart\s*up\s*/i, "")
    .replace(/thoppumpady/i, "thopumpadi")
    .replace(/palluruthi/i, "palluruthy")
    .replace(/[^a-z0-9]/g, "");
}

// Fallback catalog of known instructors per branch across SmartUp
const STATIC_BRANCH_INSTRUCTORS: Record<string, { id: string; name: string }[]> = {
  chullickal: [
    { id: "MOHAMMED BILAL K.S", name: "MOHAMMED BILAL K.S" },
    { id: "Inzamam Ul Haq K Y", name: "Inzamam Ul Haq K Y" },
    { id: "Farzana Naushad", name: "Farzana Naushad" },
    { id: "Ibrahim", name: "Ibrahim" },
    { id: "Fidha Hami", name: "Fidha Hami" },
    { id: "FAREEDA M A", name: "FAREEDA M A" },
    { id: "Alshamz", name: "Alshamz" },
    { id: "Riona P R", name: "Riona P R" },
  ],
  edappally: [
    { id: "Aflah KR", name: "Aflah KR" },
    { id: "Akhila", name: "Akhila" },
    { id: "SREYAS M S", name: "SREYAS M S" },
    { id: "Sajith", name: "Sajith" },
    { id: "Ronaldo Biju", name: "Ronaldo Biju" },
    { id: "Chaitanya Krishna", name: "Chaitanya Krishna" },
    { id: "Ramseena P S", name: "Ramseena P S" },
    { id: "Ciya Maria Sabu", name: "Ciya Maria Sabu" },
  ],
  eraveli: [
    { id: "AL ZAMEEL", name: "AL ZAMEEL" },
    { id: "Ansaf P B", name: "Ansaf P B" },
    { id: "Essath", name: "Essath" },
    { id: "Farhana TB", name: "Farhana TB" },
    { id: "Hanna", name: "Hanna" },
    { id: "Muhsina Binth hashim", name: "Muhsina Binth hashim" },
    { id: "Nazra", name: "Nazra" },
    { id: "Saleh Lukman", name: "Saleh Lukman" },
    { id: "Thasleema MS", name: "Thasleema MS" },
  ],
  fortkochi: [
    { id: "Faseeha M.U", name: "Faseeha M.U" },
    { id: "Ijas Ahmed", name: "Ijas Ahmed" },
    { id: "Mehfil", name: "Mehfil" },
    { id: "Mubashir", name: "Mubashir" },
    { id: "Nasriya K N", name: "Nasriya K N" },
    { id: "Rijaz", name: "Rijaz" },
    { id: "Aflah KR", name: "Aflah KR" },
    { id: "Essath", name: "Essath" },
  ],
  kadavanthara: [
    { id: "Anju S venu", name: "Anju S venu" },
    { id: "Ayana Rani", name: "Ayana Rani" },
    { id: "Fathima Rahfa", name: "Fathima Rahfa" },
    { id: "Manjima", name: "Manjima" },
    { id: "Noorniza", name: "Noorniza" },
    { id: "Ciya Maria Sabu", name: "Ciya Maria Sabu" },
  ],
  moolamkuzhi: [
    { id: "Afna Navas", name: "Afna Navas" },
    { id: "Akhinesh R Prakash", name: "Akhinesh R Prakash" },
    { id: "FARHANA", name: "FARHANA" },
    { id: "Muhammad Hammad P H", name: "Muhammad Hammad P H" },
    { id: "Nedha", name: "Nedha" },
    { id: "Sanjana Prasad", name: "Sanjana Prasad" },
    { id: "AJMAL UDAS AU", name: "AJMAL UDAS AU" },
  ],
  palluruthy: [
    { id: "Alisha Azad", name: "Alisha Azad" },
    { id: "Antony K M", name: "Antony K M" },
    { id: "ANWAR K H", name: "ANWAR K H" },
    { id: "Asif", name: "Asif" },
    { id: "Farhana K U", name: "Farhana K U" },
    { id: "FARZANA P.G", name: "FARZANA P.G" },
    { id: "Maria", name: "Maria" },
    { id: "Shahziya", name: "Shahziya" },
    { id: "T S RAGHUL", name: "T S RAGHUL" },
    { id: "Aleesha", name: "Aleesha" },
  ],
  thopumpadi: [
    { id: "Abhiram M", name: "Abhiram M" },
    { id: "Ahad", name: "Ahad" },
    { id: "Amjith", name: "Amjith" },
    { id: "Asnamol vi", name: "Asnamol vi" },
    { id: "Razal", name: "Razal" },
    { id: "Jinsiya", name: "Jinsiya" },
    { id: "Maria", name: "Maria" },
    { id: "Alisha Azad", name: "Alisha Azad" },
  ],
  vennala: [
    { id: "Jishnu", name: "Jishnu" },
    { id: "Jyothy Rajesh", name: "Jyothy Rajesh" },
    { id: "Misriya P S", name: "Misriya P S" },
    { id: "Nikitha", name: "Nikitha" },
    { id: "RAGESH TR", name: "RAGESH TR" },
    { id: "Ranjith P S", name: "Ranjith P S" },
    { id: "Rosinamol Roy", name: "Rosinamol Roy" },
    { id: "Salih P R", name: "Salih P R" },
    { id: "Sara Stephen", name: "Sara Stephen" },
  ],
};

/**
 * GET /api/instructor-reviews/instructors
 * Query params:
 *   branch?: string (e.g. "Smart Up Edappally")
 *   includeAll?: "true" | "false" (returns all SmartUp faculty across all branches)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const branch = searchParams.get("branch") || undefined;
    const includeAll =
      searchParams.get("includeAll") === "true" ||
      searchParams.get("all") === "true" ||
      !branch ||
      branch === "All";

    const targetNorm = normalizeBranch(branch);

    // Parallel fetch: All instructors + Recent Course Schedules
    const [instrRes, schedRes] = await Promise.all([
      frappeAdminGet("resource/Instructor", {
        fields: JSON.stringify(["name", "instructor_name", "custom_company", "department", "status"]),
        limit_page_length: "500",
        order_by: "instructor_name asc",
      }),
      !includeAll && branch
        ? frappeAdminGet("resource/Course Schedule", {
            fields: JSON.stringify(["distinct instructor", "instructor_name", "custom_branch"]),
            limit_page_length: "1000",
            order_by: "creation desc",
          })
        : Promise.resolve({ data: [] }),
    ]);

    const allInstructors: any[] = instrRes?.data ?? [];
    const schedItems: any[] = schedRes?.data ?? [];

    // Map for fast instructor lookup by ID or name
    const instructorLookup = new Map<string, any>();
    allInstructors.forEach((i) => {
      instructorLookup.set(i.name, i);
      if (i.instructor_name && !instructorLookup.has(i.instructor_name)) {
        instructorLookup.set(i.instructor_name, i);
      }
    });

    const resultMap = new Map<
      string,
      { id: string; name: string; branch: string; department?: string; isVisiting: boolean }
    >();

    if (includeAll) {
      // Return all instructors across the entire organization
      allInstructors.forEach((i) => {
        const id = i.name;
        resultMap.set(id, {
          id,
          name: (i.instructor_name || i.name).trim(),
          branch: i.custom_company || "General",
          department: i.department,
          isVisiting: false,
        });
      });
    } else {
      // 1. Primary branch faculty (custom_company matches branch)
      allInstructors.forEach((i) => {
        if (normalizeBranch(i.custom_company) === targetNorm) {
          const id = i.name;
          resultMap.set(id, {
            id,
            name: (i.instructor_name || i.name).trim(),
            branch: i.custom_company || branch!,
            department: i.department,
            isVisiting: false,
          });
        }
      });

      // 2. Visiting faculty scheduled for this branch (from Course Schedule)
      schedItems.forEach((s) => {
        if (s.instructor && normalizeBranch(s.custom_branch) === targetNorm) {
          const rawId = s.instructor;
          const matched = instructorLookup.get(rawId);
          const id = matched ? matched.name : rawId;
          const name = (matched?.instructor_name || s.instructor_name || id).trim();

          if (!resultMap.has(id)) {
            resultMap.set(id, {
              id,
              name,
              branch: matched?.custom_company || branch!,
              department: matched?.department,
              isVisiting: true,
            });
          }
        }
      });

      // 3. Static fallback roster assurance for this branch
      const staticRoster = STATIC_BRANCH_INSTRUCTORS[targetNorm] || [];
      staticRoster.forEach((sf) => {
        const matched = instructorLookup.get(sf.id) || instructorLookup.get(sf.name);
        const id = matched ? matched.name : sf.id;
        const name = (matched?.instructor_name || sf.name).trim();

        if (!resultMap.has(id)) {
          resultMap.set(id, {
            id,
            name,
            branch: matched?.custom_company || branch!,
            department: matched?.department || "Academics",
            isVisiting: false,
          });
        }
      });
    }

    // Sort: Primary branch teachers first (A-Z), then visiting teachers (A-Z)
    const sorted = Array.from(resultMap.values()).sort((a, b) => {
      if (a.isVisiting !== b.isVisiting) return a.isVisiting ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      branch: branch || "All",
      total: sorted.length,
      data: sorted,
    });
  } catch (error: any) {
    console.error("[api/instructor-reviews/instructors] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch instructors" },
      { status: 500 }
    );
  }
}
