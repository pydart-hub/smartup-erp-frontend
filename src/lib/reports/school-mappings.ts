/**
 * Master school name mapping dictionary and normalization utility.
 * Resolves variations, typos, informal abbreviations, and inconsistent casings
 * entered across branch admission forms to unified canonical school names.
 */

interface SchoolCluster {
  canonical: string;
  test: (normalizedStr: string, rawStr: string) => boolean;
}

const SCHOOL_CLUSTERS: SchoolCluster[] = [
  // 1. OLCGHSS, Thoppumpady (Our Lady's Convent Girls HSS)
  {
    canonical: "OLCGHSS, Thoppumpady",
    test: (norm) => {
      if (/\b(olcghs|olcghss|olcgs|olcg)\b/.test(norm)) return true;
      if (norm.includes("our lady") && (norm.includes("cghs") || norm.includes("cghss") || norm.includes("convent"))) {
        return true;
      }
      return false;
    },
  },

  // 2. Our Lady's High School (distinct from OLCGHSS and Our Lady of Mercy)
  {
    canonical: "Our Lady's",
    test: (norm) => {
      if (norm.includes("mercy")) return false;
      const stripped = norm.replace(/['\s]/g, "");
      return stripped === "ourladys" || stripped === "ourladies" || stripped === "ourlady";
    },
  },

  // 3. SDPY Boys HSS, Palluruthy
  {
    canonical: "SDPY HSS, Palluruthy",
    test: (norm) => /\bsdpy\b/.test(norm),
  },

  // 4. Fatima Girls High School, Fort Kochi
  {
    canonical: "Fatima Girls High School, Fort Kochi",
    test: (norm) => /\bfatima\b/.test(norm),
  },

  // 5. Santa Cruz HSS, Fort Kochi
  {
    canonical: "Santa Cruz HSS, Fort Kochi",
    test: (norm) => /santa\s*cruz/.test(norm),
  },

  // 6. St. Sebastian's HSS, Thoppumpady
  {
    canonical: "St. Sebastian's HSS, Thoppumpady",
    test: (norm) => {
      // Avoid matching other locations if specified, but in practice in this region almost all are Thoppumpady
      return /\bst\.?\s*sebast[ia]*n?s?\b/.test(norm);
    },
  },

  // 7. St. Mary's HSS
  {
    canonical: "St. Mary's HSS",
    test: (norm) => /\bst\.?\s*marys?\b/.test(norm),
  },

  // 8. St. John De Britto (Britto), Fort Kochi
  {
    canonical: "St. John De Britto, Fort Kochi",
    test: (norm) => /\bbritto\b/.test(norm),
  },

  // 9. TD HSS, Mattancherry
  {
    canonical: "TD HSS, Mattancherry",
    test: (norm) => /\btd\s*(hs|hss)?\b/.test(norm) || norm === "td",
  },

  // 10. Gujarati High School, Mattancherry
  {
    canonical: "Gujarati High School, Mattancherry",
    test: (norm) => /gujarat[hi]y?/.test(norm),
  },

  // 11. Calvathy GHSS
  {
    canonical: "Central Calvathy GHSS",
    test: (norm) => /calvath[yi]/.test(norm),
  },

  // 12. MMOVHSS, Panayappilly
  {
    canonical: "MMOVHSS, Panayappilly",
    test: (norm) => /mmovhs/.test(norm) || /\bmm\s*hss?\b/.test(norm),
  },

  // 13. CCPLM AI HSS, Perumanoor
  {
    canonical: "CCPLM AI HSS, Perumanoor",
    test: (norm) => /ccplm/.test(norm) || /c\.c\.p\.l\.m/.test(norm),
  },

  // 14. EMGHSS, Fort Kochi
  {
    canonical: "EMGHSS, Fort Kochi",
    test: (norm) => /\bemgh?ss?\b/.test(norm),
  },

  // 15. Sacred Heart (SH), Thevara
  {
    canonical: "Sacred Heart (SH), Thevara",
    test: (norm) => /\bsh\b/.test(norm) || /sacred\s*heart/.test(norm),
  },

  // 16. Puthenthode HSS
  {
    canonical: "Puthenthode HSS",
    test: (norm) => /puth[ea]nthode/.test(norm),
  },

  // 17. SRV Govt HSS, Ernakulam
  {
    canonical: "SRV Govt HSS, Ernakulam",
    test: (norm) => /\bsrv\b/.test(norm),
  },

  // 18. Edward Memorial HSS
  {
    canonical: "Edward Memorial HSS",
    test: (norm) => /edward/.test(norm),
  },

  // 19. CKC Girls High School, Ponnurunni
  {
    canonical: "CKC Girls High School, Ponnurunni",
    test: (norm) => /\bckc\b/.test(norm),
  },

  // 20. Loretto Convent School
  {
    canonical: "Loretto Convent AIHS",
    test: (norm) => /loretto/.test(norm),
  },

  // 21. Darul Uloom HSS, Pullepady
  {
    canonical: "Darul Uloom HSS, Pullepady",
    test: (norm) => /darul\s*uloom/.test(norm),
  },

  // 22. Kendriya Vidyalaya (KV)
  {
    canonical: "Kendriya Vidyalaya (KV)",
    test: (norm) => /kendriya\s*vidyalaya|\bkv\b/.test(norm),
  },

  // 23. GHSS Vennala
  {
    canonical: "GHSS Vennala",
    test: (norm) => /\bvenn?ala\b/.test(norm),
  },

  // 24. Aasia Bai High School
  {
    canonical: "Aasia Bai High School",
    test: (norm) => /aasia\s*bai/.test(norm),
  },

  // 25. St. Louis High School, Mundamveli
  {
    canonical: "St. Louis High School, Mundamveli",
    test: (norm) => /\bst\.?\s*louis\b/.test(norm),
  },

  // 26. St. Jude's, Thammanam
  {
    canonical: "St. Jude's EMHS, Thammanam",
    test: (norm) => /judes?/.test(norm),
  },

  // 27. St. Albert's HSS, Ernakulam
  {
    canonical: "St. Albert's HSS, Ernakulam",
    test: (norm) => /alberts?/.test(norm),
  },
];

export const CANONICAL_SCHOOL_NAMES = SCHOOL_CLUSTERS.map((c) => c.canonical).sort();

/**
 * Normalizes a raw school name string into its clean canonical school name.
 */
export function normalizeSchoolName(raw?: unknown): string {
  const str = String(raw ?? "").trim();
  if (!str) return "Not Specified";

  // Collapse multiple spaces and normalize curly quotes/accents
  const cleaned = str.replace(/[’‘`]/g, "'").replace(/\s+/g, " ");
  const lower = cleaned.toLowerCase();

  // Test against canonical school clusters
  for (const cluster of SCHOOL_CLUSTERS) {
    if (cluster.test(lower, cleaned)) {
      return cluster.canonical;
    }
  }

  return cleaned;
}
