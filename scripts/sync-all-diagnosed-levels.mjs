import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL;
const key = process.env.FRAPPE_API_KEY;
const secret = process.env.FRAPPE_API_SECRET;
const headers = {
  Authorization: `token ${key}:${secret}`,
  "Content-Type": "application/json",
};

function matchSubject(course, examTitle) {
  if (!course || !examTitle) return false;
  const c = course.toLowerCase();
  const e = examTitle.toLowerCase();

  const cGrade = c.match(/(?:class\s*)?(\d+)(?:th)?/);
  const eGrade = e.match(/(?:class\s*)?(\d+)(?:th)?/);
  if (cGrade && eGrade && cGrade[1] !== eGrade[1]) {
    return false;
  }

  const subjects = ["physics", "chemistry", "biology", "mathematics", "maths", "english", "hindi", "malayalam"];
  for (const s of subjects) {
    const sNorm = s === "maths" ? "mathematics" : s;
    const cHas = c.includes(sNorm) || (sNorm === "mathematics" && c.includes("maths"));
    const eHas = e.includes(sNorm) || (sNorm === "mathematics" && e.includes("maths"));
    if (cHas && eHas) return true;
  }
  return false;
}

async function fetchWithRetry(url, options, maxRetries = 4, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
}

async function extractDiagnosedLevelFromAttempt(attemptId) {
  try {
    const res = await fetchWithRetry(`https://smartuplearning.net/exam-site/result/${attemptId}`);
    if (!res || !res.ok) return null;
    const html = await res.text();
    const marker = '<span>Student Level</span></div><div class="mt-3 text-3xl font-black text-text-primary">';
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      const level = html.slice(idx + marker.length, idx + marker.length + 15).split('<')[0].trim();
      return level || null;
    }
  } catch (err) {
    console.error(`Error fetching attempt ${attemptId}:`, err.message);
  }
  return null;
}

async function syncAllDiagnosedLevels() {
  console.log("==================================================================");
  console.log("ENHANCED SYNC: POPULATING ALL REMAINING DIAGNOSED LEVELS");
  console.log("(Checking Student Mobile AND Guardian Mobile for complete coverage)");
  console.log("==================================================================\n");

  // Step 1: Fetch unpopulated Diagnosis Assessment Results
  console.log("Step 1: Fetching unpopulated Assessment Results from Frappe...");
  let start = 0;
  const unpopulated = [];

  while (true) {
    const filters = JSON.stringify([
      ["assessment_group", "=", "Diagnosis Exam"],
      ["docstatus", "=", 1],
    ]);
    const fields = JSON.stringify([
      "name",
      "student",
      "student_name",
      "course",
      "custom_branch",
      "custom_diagnosed_level"
    ]);

    const res = await fetch(
      `${url}/api/resource/Assessment%20Result?filters=${encodeURIComponent(
        filters
      )}&fields=${encodeURIComponent(fields)}&limit_start=${start}&limit_page_length=1000`,
      { headers }
    );

    if (!res.ok) break;
    const data = (await res.json()).data || [];
    const missing = data.filter((r) => !r.custom_diagnosed_level);
    unpopulated.push(...missing);
    if (data.length < 1000) break;
    start += 1000;
  }

  console.log(`Found ${unpopulated.length} Assessment Results needing diagnosed levels.\n`);
  if (unpopulated.length === 0) {
    console.log("All records are already populated!");
    return;
  }

  // Group by student
  const studentMap = new Map();
  for (const item of unpopulated) {
    if (!studentMap.has(item.student)) {
      studentMap.set(item.student, {
        studentId: item.student,
        studentName: item.student_name,
        branch: item.custom_branch,
        results: [],
      });
    }
    studentMap.get(item.student).results.push(item);
  }

  console.log(`Step 2: Resolving phones (student & guardian) for ${studentMap.size} unique students...`);
  const studentIds = Array.from(studentMap.keys());
  const phoneMap = new Map(); // studentId => Set of cleaned phone numbers

  // Fetch full student docs in concurrent batches of 15
  const concurrency = 15;
  for (let i = 0; i < studentIds.length; i += concurrency) {
    const chunk = studentIds.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (stuId) => {
        try {
          const sRes = await fetchWithRetry(`${url}/api/resource/Student/${encodeURIComponent(stuId)}`, { headers });
          if (!sRes || !sRes.ok) return;
          const sData = (await sRes.json()).data;
          const phones = new Set();

          if (sData.student_mobile_number) {
            const p = sData.student_mobile_number.replace(/\D/g, "");
            if (p.length >= 10) phones.add(p.slice(-10));
          }
          if (sData.custom_phone_number) {
            const p = sData.custom_phone_number.replace(/\D/g, "");
            if (p.length >= 10) phones.add(p.slice(-10));
          }

          // If guardians exist, resolve guardian phone numbers
          if (sData.guardians && sData.guardians.length > 0) {
            for (const g of sData.guardians) {
              if (g.guardian) {
                try {
                  const gRes = await fetchWithRetry(`${url}/api/resource/Guardian/${encodeURIComponent(g.guardian)}`, { headers });
                  if (gRes && gRes.ok) {
                    const gData = (await gRes.json()).data;
                    if (gData.mobile_number) {
                      const gp = gData.mobile_number.replace(/\D/g, "");
                      if (gp.length >= 10) phones.add(gp.slice(-10));
                    }
                  }
                } catch {}
              }
            }
          }

          if (phones.size > 0) {
            phoneMap.set(stuId, Array.from(phones));
          }
        } catch {}
      })
    );
  }

  console.log(`Resolved phone numbers for ${phoneMap.size} students.\n`);

  // Step 3: Match and Update
  console.log("Step 3: Matching online exam attempts & syncing Diagnosed Levels into Frappe...\n");
  let totalUpdated = 0;
  let studentsSynced = 0;

  for (const [studentId, studentInfo] of studentMap.entries()) {
    const phones = phoneMap.get(studentId);
    if (!phones || phones.length === 0) continue;

    // Fetch attempts for all phones linked to this student
    const allAttempts = [];
    for (const phone of phones) {
      try {
        const histRes = await fetchWithRetry(`https://smartuplearning.net/api/public-exam/history?phone=${phone}`);
        if (!histRes || !histRes.ok) continue;
        const attemptsData = await histRes.json();
        if (attemptsData?.attempts) {
          allAttempts.push(...attemptsData.attempts);
        }
      } catch {}
    }

    if (allAttempts.length === 0) continue;

    let studentHasUpdates = false;

    for (const ar of studentInfo.results) {
      // Find matching attempt for this course
      const matchedAttempt = allAttempts.find((att) => matchSubject(ar.course, att.examTitle));
      if (!matchedAttempt) continue;

      const level = await extractDiagnosedLevelFromAttempt(matchedAttempt.id);
      if (!level) continue;

      // Update Frappe Assessment Result in-place
      try {
        const putRes = await fetchWithRetry(`${url}/api/resource/Assessment%20Result/${encodeURIComponent(ar.name)}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({ custom_diagnosed_level: level }),
        });

        if (putRes && putRes.ok) {
          totalUpdated++;
          studentHasUpdates = true;
          console.log(`[UPDATED] ${studentInfo.studentName} (${studentInfo.branch}) - ${ar.course} => Level: ${level}`);
        }
      } catch (err) {
        console.error(`Failed to update ${ar.name}:`, err.message);
      }
    }

    if (studentHasUpdates) {
      studentsSynced++;
    }
  }

  console.log("\n==================================================================");
  console.log(`SYNC COMPLETE: Updated ${totalUpdated} subject records across ${studentsSynced} students!`);
  console.log("==================================================================");
}

syncAllDiagnosedLevels();
