import { NextRequest, NextResponse } from "next/server";
import { getParentLinkedStudents } from "@/lib/server/parentAccess";
import { requireSmartupSession } from "@/lib/server/frappeLevelExam";
import { getCanonicalBranchName } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

function extractClassLevel(program?: string): string {
  if (!program) return "10";
  const match = program.match(/\b(8|9|10)\b/);
  if (match) return match[1];
  if (program.includes("8th")) return "8";
  if (program.includes("9th")) return "9";
  if (program.includes("10th")) return "10";
  return "10";
}

export async function GET(request: NextRequest) {
  try {
    requireSmartupSession(request);
    const linkedStudents = await getParentLinkedStudents(request);

    const children = linkedStudents.map((cs) => ({
      studentId: cs.studentId,
      studentName: cs.studentName,
      studentPhone: cs.studentMobile || cs.guardianMobiles?.[0] || "",
      branch: getCanonicalBranchName(cs.branch),
      classLevel: extractClassLevel(cs.program),
    }));

    return NextResponse.json({ children });
  } catch (error: unknown) {
    const err = error as { message?: string };
    const status = err.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ error: err.message || "Failed to fetch linked children" }, { status });
  }
}
