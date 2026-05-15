// Script: replace all page/section-level Loader2 spinners with <GifLoader />
// Run from project root: node scripts/replace-loaders.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function walkTsx(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkTsx(full, results);
    else if (full.endsWith(".tsx")) results.push(full);
  }
  return results;
}

const files = walkTsx("src");

let totalFiles = 0;
let totalReplacements = 0;

for (const file of files) {
  let content = readFileSync(file, "utf8");
  const original = content;

  // Pattern 1 (single-line): <div className="flex items-center justify-center h-XX"><Loader2 className="animate-spin h-6 w-6 text-primary" /></div>
  // Pattern 2 (multi-line): <div ...>\n   <Loader2 .../>\n</div>
  // We only want to replace the h-6 w-6 page-loader ones (not h-4 button spinners)

  // Multi-line: any wrapper div containing only the h-6 spinner
  content = content.replace(
    /(<div[^>]*class[^>]*justify-center[^>]*>)\s*\n\s*<Loader2 className="animate-spin h-6 w-6 text-primary" \/>\s*\n\s*<\/div>/g,
    () => `<GifLoader />`
  );

  // Single-line: <div ...><Loader2 .../></div>
  content = content.replace(
    /<div[^>]*class[^>]*justify-center[^>]*><Loader2 className="animate-spin h-6 w-6 text-primary" \/><\/div>/g,
    () => `<GifLoader />`
  );

  // Bare (not inside a wrapper div — e.g. layout.tsx / direct returns):
  // These are standalone <Loader2 className="animate-spin h-6 w-6 text-primary" /> 
  // only if they are on their own line (after indentation)
  // We handle by checking surrounding lines — do a line-by-line pass for remaining ones
  const lines = content.split("\n");
  const newLines = lines.map((line) => {
    if (line.includes('<Loader2 className="animate-spin h-6 w-6 text-primary" />')) {
      return line.replace(
        '<Loader2 className="animate-spin h-6 w-6 text-primary" />',
        "<GifLoader />"
      );
    }
    return line;
  });
  content = newLines.join("\n");

  if (content === original) continue;

  // Add GifLoader import if not already present
  if (!content.includes("GifLoader")) {
    // Find the first import line and insert after it
    content = content.replace(
      /^("use client";\s*\n)/m,
      `$1import { GifLoader } from "@/components/ui/GifLoader";\n`
    );
  } else if (!content.includes('@/components/ui/GifLoader')) {
    // GifLoader is used but import missing
    content = content.replace(
      /^("use client";\s*\n)/m,
      `$1import { GifLoader } from "@/components/ui/GifLoader";\n`
    );
  }

  // Remove Loader2 from lucide imports if it's no longer used
  if (!content.includes("Loader2") || content.match(/<Loader2/g) === null) {
    // Loader2 fully removed — clean import
    content = content.replace(/,?\s*\bLoader2\b\s*,?/g, (match) => {
      // Keep commas balanced
      if (match.startsWith(",") && match.endsWith(",")) return ",";
      return "";
    });
    // Clean up any empty braces or trailing/leading commas in lucide import
    content = content.replace(/from "lucide-react"[\s\S]*?(?=\n\n|\nimport)/g, (block) => {
      return block
        .replace(/\{\s*,/, "{")
        .replace(/,\s*\}/, "}")
        .replace(/,\s*,/g, ",");
    });
  }

  writeFileSync(file, content, "utf8");
  const count = (original.match(/animate-spin h-6 w-6 text-primary/g) ?? []).length;
  totalReplacements += count;
  totalFiles++;
  console.log(`✓ ${file} (${count} replacement${count !== 1 ? "s" : ""})`);
}

console.log(`\nDone: ${totalReplacements} replacements across ${totalFiles} files.`);
