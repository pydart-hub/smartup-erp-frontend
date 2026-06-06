import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import zlib from "zlib";

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, "docs", "Level Test");
const OUT_DIR = path.join(DOCS_DIR, "JSON");
const TMP_DIR = path.join(ROOT, ".tmp-level-test-convert");
const EXCLUDED_SUBJECTS = new Set();

const TARGET_LEVELS = {
  "8": ["5", "6", "7"],
  "9": ["5", "6", "7", "8"],
  "10": ["5", "6", "7", "8", "9"],
};

function slugify(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function normalizeText(text) {
  return decodeXmlEntities(text)
    .replace(/\u00a0/g, " ")
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*-\s*-\s*/g, " --- ")
    .trim();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function extractDocText(docPath) {
  const base = path.basename(docPath, path.extname(docPath));
  const workDir = path.join(TMP_DIR, `${slugify(base)}-${crypto.randomUUID()}`);
  await ensureDir(workDir);
  const zipBuffer = await fs.readFile(docPath);
  const xml = extractZipEntry(zipBuffer, "word/document.xml").toString("utf8");
  await fs.rm(workDir, { recursive: true, force: true });

  const plain = xml
    .replace(/<w:tab[^>]*\/>/g, " ")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n+/g, "\n");

  return normalizeText(plain);
}

function extractZipEntry(buffer, entryName) {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === eocdSignature) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset < 0) {
    throw new Error(`Could not find EOCD in ${entryName}`);
  }

  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  let cursor = centralDirectoryOffset;

  for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
    const centralSignature = buffer.readUInt32LE(cursor);
    if (centralSignature !== 0x02014b50) {
      throw new Error("Invalid central directory record");
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = buffer.toString("utf8", cursor + 46, cursor + 46 + fileNameLength);

    if (fileName === entryName) {
      const localSignature = buffer.readUInt32LE(localHeaderOffset);
      if (localSignature !== 0x04034b50) {
        throw new Error("Invalid local file header");
      }

      const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        return compressed;
      }
      if (compressionMethod === 8) {
        return zlib.inflateRawSync(compressed);
      }
      throw new Error(`Unsupported compression method ${compressionMethod} for ${entryName}`);
    }

    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error(`Entry ${entryName} not found in archive`);
}

function splitLevelSections(text) {
  const regex = /(?:Class(?:es)?\s*(5|6|7|8|9)\s*(?:st|nd|rd|th)?|(?:^|\s)(5|6|7|8|9)\s*(?:st|nd|rd|th)\s*(?:LEVEL|std))/gi;
  const matches = Array.from(text.matchAll(regex));

  const deduped = matches.filter((match, index) => {
    const start = match.index ?? 0;
    return index === 0 || start !== (matches[index - 1].index ?? -1);
  });

  return deduped.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < deduped.length ? (deduped[index + 1].index ?? text.length) : text.length;
    return {
      level: match[1] || match[2],
      text: text.slice(start, end).trim(),
    };
  });
}

function parseAnswerMap(text) {
  const map = new Map();
  const matches = Array.from(text.matchAll(/(\d+)\s*[\.\):]?\s*([A-Da-d])/g));
  for (const match of matches) {
    map.set(Number(match[1]), match[2].toUpperCase());
  }
  return map;
}

function parseOptions(optionText) {
  const markerRegex = /\b([A-Da-d])[\.\)]\s*/g;
  const markers = Array.from(optionText.matchAll(markerRegex));
  if (markers.length < 2) return [];

  return markers.map((match, index) => {
    const key = match[1].toUpperCase();
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < markers.length ? (markers[index + 1].index ?? optionText.length) : optionText.length;
    const textValue = optionText
      .slice(start, end)
      .replace(/Answer(?: key)?s?[\s:.-]*[A-Da-d]?.*$/i, "")
      .trim();
    return { key, text: textValue };
  }).filter((option) => option.text);
}

function resolveAnswerFromText(options, answerText) {
  const normalizedAnswer = answerText
    .toLowerCase()
    .replace(/^[a-d][\.\)]\s*/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!normalizedAnswer) return null;

  const match = options.find((option) =>
    option.text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim() === normalizedAnswer,
  );
  return match?.key ?? null;
}

function parseNumberedBlocks(sectionText) {
  const matches = Array.from(sectionText.matchAll(/(?:^|\s)(\d{1,3})\s*[\.\)](?=\s*[A-Za-z])\s*/g));
  if (matches.length === 0) return [];
  return matches.map((match, index) => {
    const rawStart = match.index ?? 0;
    const start = sectionText[rawStart] === " " ? rawStart + 1 : rawStart;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? sectionText.length) : sectionText.length;
    return {
      questionNumber: Number(match[1]),
      block: sectionText.slice(start, end).trim(),
    };
  });
}

function buildQuestionRecord({ subject, level, questionNumber, stem, options, correctOptionKey, sourceType, reviewNote }) {
  return {
    id: `${slugify(subject)}-${level}-${String(questionNumber).padStart(3, "0")}`,
    source_level: level,
    question_number: questionNumber,
    question_text: stem.trim(),
    options: options.map((option) => ({
      id: `${slugify(subject)}-${level}-${String(questionNumber).padStart(3, "0")}-${option.key}`,
      option_key: option.key,
      option_text: option.text.trim(),
    })),
    correct_option_key: correctOptionKey || null,
    source_type: sourceType,
    usable_for_exam: options.length >= 2 && !!correctOptionKey,
    needs_review: !correctOptionKey || options.length < 2 || !!reviewNote,
    review_note: reviewNote || "",
  };
}

function parseNumberedMcqs(subject, level, sectionText) {
  const globalAnswerIndex = sectionText.search(/Answer\s*key|Answers/i);
  const answerText = globalAnswerIndex >= 0 ? sectionText.slice(globalAnswerIndex).trim() : "";
  const answerMap = parseAnswerMap(answerText);
  const hasGlobalAnswerKey = globalAnswerIndex >= 0 && answerMap.size >= 2;
  const bodyText = hasGlobalAnswerKey ? sectionText.slice(0, globalAnswerIndex).trim() : sectionText;
  const blocks = parseNumberedBlocks(bodyText);
  const questions = [];

  for (const { questionNumber, block } of blocks) {
    const body = block.replace(/^\d+\s*[\.\)]\s*/, "").trim();
    const inlineAnswer = body.match(/Answer\s*:?\s*([A-Da-d])/i)?.[1]?.toUpperCase() || null;
    const inlineAnswerText = body.match(/Answer\s*:?\s*([\s\S]+)$/i)?.[1]?.trim() || "";
    const bodyWithoutAnswer = body.replace(/\s*Answer\s*:?\s*[A-Da-d][\s\S]*$/i, "").trim();
    const optionStart = bodyWithoutAnswer.search(/\b([A-Da-d])[\.\)]\s*/);
    if (optionStart < 0) {
      questions.push(buildQuestionRecord({
        subject,
        level,
        questionNumber,
        stem: bodyWithoutAnswer || body,
        options: [],
        correctOptionKey: inlineAnswer || answerMap.get(questionNumber) || null,
        sourceType: "numbered",
        reviewNote: "Question has no parsed MCQ options",
      }));
      continue;
    }

    const stem = bodyWithoutAnswer.slice(0, optionStart).trim();
    const options = parseOptions(bodyWithoutAnswer.slice(optionStart));
    const resolvedAnswerKey =
      inlineAnswer ||
      answerMap.get(questionNumber) ||
      resolveAnswerFromText(options, inlineAnswerText);
    questions.push(buildQuestionRecord({
      subject,
      level,
      questionNumber,
      stem,
      options,
      correctOptionKey: resolvedAnswerKey,
      sourceType: "numbered",
    }));
  }

  return questions;
}

function parseQuestionSentenceMcqs(subject, level, sectionText) {
  const regex = /([^?]+\?)\s*a\)\s*(.*?)\s*b\)\s*(.*?)\s*c\)\s*(.*?)\s*d\)\s*(.*?)(?:\s+Answer\s*:?\s*([A-Da-d]))(?=\s+(?:[^?]+\?\s*a\)|Class\s*\d|\d+\.\s*|$))/gis;
  const matches = Array.from(sectionText.matchAll(regex));
  return matches.map((match, index) =>
    buildQuestionRecord({
      subject,
      level,
      questionNumber: index + 1,
      stem: match[1].trim(),
      options: [
        { key: "A", text: match[2].trim() },
        { key: "B", text: match[3].trim() },
        { key: "C", text: match[4].trim() },
        { key: "D", text: match[5].trim() },
      ],
      correctOptionKey: match[6]?.toUpperCase() || null,
      sourceType: "sentence-inline",
    }),
  );
}

function parsePlainQuestions(subject, level, sectionText) {
  const body = sectionText
    .replace(/Answer(?: key)?[\s\S]*$/i, "")
    .replace(/(?:Class(?:es)?\s*\d+\s*(?:st|nd|rd|th)?|\d+\s*(?:st|nd|rd|th)\s*(?:LEVEL|std))/gi, " ")
    .trim();
  const matches = Array.from(body.matchAll(/([^?]+\?)/g));
  return matches.map((match, index) =>
    buildQuestionRecord({
      subject,
      level,
      questionNumber: index + 1,
      stem: match[1].trim(),
      options: [],
      correctOptionKey: null,
      sourceType: "plain-question",
      reviewNote: "Question exists in source but MCQ options are missing or could not be parsed",
    }),
  );
}

function parseLevelSection(subject, level, sectionText) {
  const numbered = parseNumberedMcqs(subject, level, sectionText);
  const numberedUsable = numbered.filter((question) => question.options.length >= 2).length;
  if (numberedUsable > 0) {
    return numbered;
  }

  if (numbered.length > 0) {
    return numbered;
  }

  const sentence = parseQuestionSentenceMcqs(subject, level, sectionText);
  if (sentence.length > 0) {
    return sentence;
  }

  return parsePlainQuestions(subject, level, sectionText);
}

function buildTargets(levelMap) {
  const targets = {};
  for (const [targetLevel, sourceLevels] of Object.entries(TARGET_LEVELS)) {
    const questions = sourceLevels.flatMap((level) => levelMap[level] ?? [])
      .filter((question) => question.usable_for_exam)
      .map((question) => ({
        ...question,
        target_level: targetLevel,
      }));
    targets[targetLevel] = {
      source_levels: sourceLevels,
      total_questions: questions.length,
      questions,
    };
  }
  return targets;
}

function deriveSubjectName(fileName) {
  return fileName.replace(/\s*level test\.docx$/i, "").trim();
}

async function convertSubjectDoc(fileName) {
  const subject = deriveSubjectName(fileName);
  const docPath = path.join(DOCS_DIR, fileName);
  const text = await extractDocText(docPath);
  const sections = splitLevelSections(text);
  const levels = {};
  const warnings = [];

  for (const section of sections) {
    const questions = parseLevelSection(subject, section.level, section.text);
    levels[section.level] = questions;
    const missingAnswers = questions.filter((question) => !question.correct_option_key).length;
    const missingOptions = questions.filter((question) => question.options.length < 2).length;
    if (missingAnswers > 0) {
      warnings.push(`${section.level}th: ${missingAnswers} questions do not have a correct answer in the source doc`);
    }
    if (missingOptions > 0) {
      warnings.push(`${section.level}th: ${missingOptions} questions do not have valid MCQ options in the source doc`);
    }
  }

  if (Object.keys(levels).length === 0) {
    warnings.push("No class sections were parsed from the document");
  }

  if (Object.values(levels).every((questions) => questions.length === 0 || questions.every((question) => !question.usable_for_exam))) {
    warnings.push("No fully usable MCQ question bank could be generated from this source without manual review");
  }

  const status = warnings.length === 0
    ? "ready"
    : warnings.some((warning) => warning.includes("correct answer") || warning.includes("valid MCQ options") || warning.includes("No fully usable"))
      ? "needs_manual_review"
      : "partial";

  return {
    subject,
    source_file: fileName,
    parsed_at: new Date().toISOString(),
    conversion_status: status,
    levels,
    generated_targets: buildTargets(levels),
    warnings,
  };
}

async function main() {
  await ensureDir(OUT_DIR);
  await ensureDir(TMP_DIR);
  const files = (await fs.readdir(DOCS_DIR))
    .filter((name) => name.toLowerCase().endsWith(".docx"))
    .filter((name) => !EXCLUDED_SUBJECTS.has(deriveSubjectName(name).trim().toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  const manifest = [];

  for (const fileName of files) {
    const subjectJson = await convertSubjectDoc(fileName);
    const outPath = path.join(OUT_DIR, `${slugify(subjectJson.subject)}.json`);
    await fs.writeFile(outPath, JSON.stringify(subjectJson, null, 2), "utf8");

    manifest.push({
      subject: subjectJson.subject,
      source_file: subjectJson.source_file,
      output_file: path.relative(ROOT, outPath).replace(/\\/g, "/"),
      conversion_status: subjectJson.conversion_status,
      levels: Object.fromEntries(
        Object.entries(subjectJson.levels).map(([level, questions]) => [
          level,
          {
            total_questions: questions.length,
            usable_questions: questions.filter((question) => question.usable_for_exam).length,
          },
        ]),
      ),
      generated_targets: Object.fromEntries(
        Object.entries(subjectJson.generated_targets).map(([level, target]) => [
          level,
          {
            total_questions: target.total_questions,
            source_levels: target.source_levels,
          },
        ]),
      ),
      warnings: subjectJson.warnings,
    });
  }

  const manifestPath = path.join(OUT_DIR, "index.json");
  await fs.writeFile(manifestPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    source_directory: "docs/Level Test",
    output_directory: "docs/Level Test/JSON",
    excluded_subjects: Array.from(EXCLUDED_SUBJECTS),
    target_rules: TARGET_LEVELS,
    subjects: manifest,
  }, null, 2), "utf8");

  await fs.rm(TMP_DIR, { recursive: true, force: true });
  console.log(`Generated ${manifest.length} subject JSON files in ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
