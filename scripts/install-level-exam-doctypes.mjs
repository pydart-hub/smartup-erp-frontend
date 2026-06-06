import { readFile } from "fs/promises";
import path from "path";

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const API_KEY = process.env.FRAPPE_API_KEY || "03330270e330d49";
const API_SECRET = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";

const HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

const DOCTYPE_FILES = [
  "backend/level_exam/doctype/level_exam_source/level_exam_source.json",
  "backend/level_exam/doctype/level_exam_question_option/level_exam_question_option.json",
  "backend/level_exam/doctype/level_exam_question/level_exam_question.json",
  "backend/level_exam/doctype/level_exam_paper_question/level_exam_paper_question.json",
  "backend/level_exam/doctype/level_exam_paper/level_exam_paper.json",
  "backend/level_exam/doctype/level_exam_assignment_student/level_exam_assignment_student.json",
  "backend/level_exam/doctype/level_exam_assignment/level_exam_assignment.json",
  "backend/level_exam/doctype/level_exam_attempt_answer/level_exam_attempt_answer.json",
  "backend/level_exam/doctype/level_exam_attempt/level_exam_attempt.json",
];

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...HEADERS,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { res, json, text };
}

async function ensureDoctype(doc) {
  const encodedName = encodeURIComponent(doc.name);
  const existing = await request(`${BASE}/api/resource/DocType/${encodedName}`, { method: "GET" });

  if (existing.res.ok) {
    const payload = { ...doc };
    delete payload.name;
    const updated = await request(`${BASE}/api/resource/DocType/${encodedName}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (!updated.res.ok) {
      throw new Error(`Failed to update ${doc.name}: ${updated.text.slice(0, 500)}`);
    }
    console.log(`Updated DocType: ${doc.name}`);
    return;
  }

  const created = await request(`${BASE}/api/resource/DocType`, {
    method: "POST",
    body: JSON.stringify(doc),
  });
  if (!created.res.ok) {
    throw new Error(`Failed to create ${doc.name}: ${created.text.slice(0, 500)}`);
  }
  console.log(`Created DocType: ${doc.name}`);
}

async function main() {
  console.log(`Installing Level Exam doctypes into ${BASE}`);
  for (const relativePath of DOCTYPE_FILES) {
    const fullPath = path.resolve(relativePath);
    const raw = await readFile(fullPath, "utf8");
    const doc = JSON.parse(raw);
    await ensureDoctype(doc);
  }
  console.log("Level Exam doctypes installation complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
