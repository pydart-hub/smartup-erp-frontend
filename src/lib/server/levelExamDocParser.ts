import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { execFile } from "child_process";

interface ParsedQuestionOption {
  option_key: string;
  option_text: string;
}

export interface ParsedLevelExamQuestion {
  class_level: string;
  question_text: string;
  difficulty: "Easy" | "Medium" | "Hard";
  correct_option_key: string;
  explanation: string;
  options: ParsedQuestionOption[];
}

function execFileAsync(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(command, args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function normalizeDocText(text: string) {
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[‐‑–—]/g, "-")
    .replace(/â€”/g, "-")
    .replace(/â€¢/g, " ")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readDocxText(file: File) {
  const tempDir = path.join(os.tmpdir(), `level-exam-${randomUUID()}`);
  const archivePath = path.join(tempDir, "source.zip");
  const unzipPath = path.join(tempDir, "unzipped");

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(archivePath, Buffer.from(await file.arrayBuffer()));

  const script = `
$src = '${archivePath.replace(/'/g, "''")}'
$dest = '${unzipPath.replace(/'/g, "''")}'
Expand-Archive -LiteralPath $src -DestinationPath $dest -Force
[xml]$xml = Get-Content (Join-Path $dest 'word\\document.xml')
$text = ($xml.DocumentElement.InnerText -replace '\\s+', ' ').Trim()
Write-Output $text
`;

  try {
    const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", script]);
    return normalizeDocText(stdout);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function parseAnswerMap(text: string) {
  const answerMap = new Map<number, string>();
  const answerRegex = /(\d+)\s*[\.\):]?\s*([A-Da-d])/g;
  let match: RegExpExecArray | null = null;
  while ((match = answerRegex.exec(text)) !== null) {
    answerMap.set(Number(match[1]), match[2].toUpperCase());
  }
  return answerMap;
}

function splitClassSections(text: string) {
  const matches = Array.from(text.matchAll(/Class\s*(\d{1,2})(?:\s*(?:st|nd|rd|th))?/gi));
  if (matches.length === 0) {
    return [];
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? text.length) : text.length;
    const class_level = match[1];
    const sectionText = text.slice(start, end).trim();
    return { class_level, sectionText };
  });
}

function splitQuestionBlocks(text: string) {
  const matches = Array.from(text.matchAll(/(?:^|\s)(\d+)\.\s*/g));
  if (matches.length > 0) {
    return matches.map((match, index) => {
      const rawStart = match.index ?? 0;
      const start = text[rawStart] === " " ? rawStart + 1 : rawStart;
      const end = index + 1 < matches.length ? ((matches[index + 1].index ?? text.length) + (text[matches[index + 1].index ?? 0] === " " ? 1 : 0)) : text.length;
      return {
        questionNumber: Number(match[1]),
        block: text.slice(start, end).trim(),
      };
    });
  }

  const questionMatches = Array.from(text.matchAll(/[A-Z][^?]{5,}\?\s*a\)\s*/g));
  return questionMatches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < questionMatches.length ? (questionMatches[index + 1].index ?? text.length) : text.length;
    return {
      questionNumber: index + 1,
      block: text.slice(start, end).trim(),
    };
  });
}

function parseOptions(block: string) {
  const markerRegex = /([A-Da-d])[\.\)]\s*/g;
  const matches = Array.from(block.matchAll(markerRegex));
  if (matches.length < 2) {
    return [];
  }

  return matches.map((match, index) => {
    const option_key = match[1].toUpperCase();
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? block.length) : block.length;
    const option_text = block.slice(start, end).replace(/Answer\s*:.*$/i, "").trim();
    return { option_key, option_text };
  }).filter((option) => option.option_text.length > 0);
}

function parseQuestionBlock(block: string, answerMap: Map<number, string>) {
  const numberMatch = block.match(/^(\d+)\.([\s\S]*)$/);
  if (!numberMatch) return null;

  const questionNumber = Number(numberMatch[1]);
  const body = numberMatch[2].trim();
  const firstOptionMatch = body.match(/([A-Da-d])[\.\)]\s*/);
  if (!firstOptionMatch || firstOptionMatch.index == null) {
    return null;
  }

  const question_text = body.slice(0, firstOptionMatch.index).trim();
  const optionSegment = body.slice(firstOptionMatch.index).trim();
  const inlineAnswerMatch = optionSegment.match(/Answer\s*:?\s*([A-Da-d])/i);
  const options = parseOptions(optionSegment);
  if (options.length < 2) {
    return null;
  }

  const correct_option_key = (inlineAnswerMatch?.[1] || answerMap.get(questionNumber) || options[0].option_key).toUpperCase();
  return {
    question_text,
    correct_option_key,
    options,
  };
}

function parseQuestionBlockWithoutNumber(block: string) {
  const body = block
    .replace(/^Class\s*\d{1,2}[^A-Za-z0-9]*/i, "")
    .replace(/^[A-Za-z\s-]*MCQs?/i, "")
    .trim();
  const firstOptionMatch = body.match(/([A-Da-d])[\.\)]\s*/);
  if (!firstOptionMatch || firstOptionMatch.index == null) {
    return null;
  }

  const question_text = body.slice(0, firstOptionMatch.index).trim();
  const optionSegment = body.slice(firstOptionMatch.index).trim();
  const inlineAnswerMatch = optionSegment.match(/Answer\s*:?\s*([A-Da-d])/i);
  const options = parseOptions(optionSegment);
  if (!question_text || options.length < 2 || !inlineAnswerMatch) {
    return null;
  }

  return {
    question_text,
    correct_option_key: inlineAnswerMatch[1].toUpperCase(),
    options,
  };
}

export async function parseLevelExamDocx(file: File, fallbackClassLevel?: string): Promise<ParsedLevelExamQuestion[]> {
  const text = await readDocxText(file);
  const sections = splitClassSections(text);
  const results: ParsedLevelExamQuestion[] = [];

  const effectiveSections = sections.length > 0
    ? sections
    : [{ class_level: fallbackClassLevel || "", sectionText: text }];

  for (const section of effectiveSections) {
    if (!section.class_level) continue;
    const answerIndex = section.sectionText.search(/Answer key|Answers?/i);
    const bodyText = answerIndex >= 0 ? section.sectionText.slice(0, answerIndex).trim() : section.sectionText;
    const answerText = answerIndex >= 0 ? section.sectionText.slice(answerIndex).trim() : "";
    const answerMap = parseAnswerMap(answerText);
    const questionBlocks = splitQuestionBlocks(bodyText);

    for (const block of questionBlocks) {
      const parsed = parseQuestionBlock(block.block, answerMap) || parseQuestionBlockWithoutNumber(block.block);
      if (!parsed) continue;
      results.push({
        class_level: section.class_level,
        question_text: parsed.question_text,
        difficulty: "Medium",
        correct_option_key: parsed.correct_option_key,
        explanation: "",
        options: parsed.options,
      });
    }
  }

  return results;
}
