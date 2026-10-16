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
  // 1. Fatima Girls High School, Fort Kochi (handles 'fatima', 'fathima', etc.)
  {
    canonical: "Fatima Girls High School, Fort Kochi",
    test: (norm) => /fat[h]*[i]*ma|fathima|fatima/.test(norm),
  },

  // 2. SDPY HSS, Palluruthy (handles 'sdpy', 'adpy', 'sdpy bhs', 'sdpy ghs')
  {
    canonical: "SDPY HSS, Palluruthy",
    test: (norm) => /\b(sdpy|adpy)\b/.test(norm),
  },

  // 3. St. Sebastian's HSS, Thoppumpady
  {
    canonical: "St. Sebastian's HSS, Thoppumpady",
    test: (norm) => /\bst\.?\s*seba?st[iae]*n?s?\b|\bsevastein\b/.test(norm),
  },

  // 4. St. Mary's HSS
  {
    canonical: "St. Mary's HSS",
    test: (norm) => /\bst\.?\s*mar[y\']*(s)?\b/.test(norm),
  },

  // 5. Santa Cruz HSS, Fort Kochi
  {
    canonical: "Santa Cruz HSS, Fort Kochi",
    test: (norm) => /san?t+a?\s*cruz/.test(norm),
  },

  // 6. OLCGHSS, Thoppumpady (Our Lady's Convent Girls HSS)
  {
    canonical: "OLCGHSS, Thoppumpady",
    test: (norm) => {
      if (/\b(olcghs|olcghss|olcgs|olcg|o\.l\.c\.g\.h\.s)\b/.test(norm)) return true;
      if (norm.includes("our lady") && (norm.includes("cghs") || norm.includes("cghss") || norm.includes("convent") || norm.includes("thoppumpady"))) {
        return true;
      }
      return false;
    },
  },

  // 7. Our Lady's High School (distinct from OLCGHSS and Our Lady of Mercy)
  {
    canonical: "Our Lady's",
    test: (norm) => {
      if (norm.includes("mercy")) return false;
      const stripped = norm.replace(/['\s]/g, "");
      return stripped === "ourladys" || stripped === "ourladies" || stripped === "ourlady";
    },
  },

  // 8. TD HSS, Mattancherry
  {
    canonical: "TD HSS, Mattancherry",
    test: (norm) => /\bt\s*\.?\s*d\s*(hs|hss)?\b/.test(norm) || norm === "td" || norm === "t d",
  },

  // 9. St. John De Britto, Fort Kochi
  {
    canonical: "St. John De Britto, Fort Kochi",
    test: (norm) => /\bbritto\b/.test(norm),
  },

  // 10. Gujarati High School, Mattancherry
  {
    canonical: "Gujarati High School, Mattancherry",
    test: (norm) => /gujarat[hi]y?/.test(norm),
  },

  // 11. Central Calvathy GHSS
  {
    canonical: "Central Calvathy GHSS",
    test: (norm) => /calvath[yi]|kalvath[yi]/.test(norm),
  },

  // 12. MMOVHSS, Panayappilly
  {
    canonical: "MMOVHSS, Panayappilly",
    test: (norm) => /mmovhs|m\.m\.o\.v\.h\.s\.s/.test(norm) || (norm.includes("panayappil") && /ghss|govt/.test(norm)),
  },

  // 13. CCPLM AI HSS, Perumanoor
  {
    canonical: "CCPLM AI HSS, Perumanoor",
    test: (norm) => /\bccpl\b|ccplm|c\.c\.p\.l\.m/.test(norm),
  },

  // 14. EMGHSS, Fort Kochi
  {
    canonical: "EMGHSS, Fort Kochi",
    test: (norm) => /\bemgh?ss?\b|e\.m\.g\.h\.s/.test(norm) || /e\s*m\s*g\s*h\s*s/.test(norm),
  },

  // 15. Sacred Heart (SH), Thevara
  {
    canonical: "Sacred Heart (SH), Thevara",
    test: (norm) => /\bs\s*\.?\s*h\b/.test(norm) || /sacred\s*heart/.test(norm),
  },

  // 16. Puthenthode HSS
  {
    canonical: "Puthenthode HSS",
    test: (norm) => /puth[ea]nthod[eu]?/.test(norm),
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
    test: (norm) => /\bckc/.test(norm),
  },

  // 20. Loretto Convent AIHS
  {
    canonical: "Loretto Convent AIHS",
    test: (norm) => /loretto/.test(norm),
  },

  // 21. Darul Uloom HSS, Pullepady
  {
    canonical: "Darul Uloom HSS, Pullepady",
    test: (norm) => /dar[uo]+l\s*ul+[uo]+m/.test(norm),
  },

  // 22. Kendriya Vidyalaya (KV)
  {
    canonical: "Kendriya Vidyalaya (KV)",
    test: (norm) => /kendriya|k\s*\.?\s*v\b/.test(norm),
  },

  // 23. GHSS Vennala
  {
    canonical: "GHSS Vennala",
    test: (norm) => /\bvenn?ala\b/.test(norm),
  },

  // 24. Aasia Bai High School
  {
    canonical: "Aasia Bai High School",
    test: (norm) => /a?asia\s*b[ha]*i/.test(norm),
  },

  // 25. St. Louis High School, Mundamveli
  {
    canonical: "St. Louis High School, Mundamveli",
    test: (norm) => /\bst\.?\s*louis\b/.test(norm),
  },

  // 26. St. Jude's EMHS, Thammanam
  {
    canonical: "St. Jude's EMHS, Thammanam",
    test: (norm) => /judes?/.test(norm),
  },

  // 27. St. Albert's HSS, Ernakulam
  {
    canonical: "St. Albert's HSS, Ernakulam",
    test: (norm) => /alberts?/.test(norm),
  },

  // 28. St. Teresa's CGHSS, Ernakulam
  {
    canonical: "St. Teresa's CGHSS, Ernakulam",
    test: (norm) => /teres|theres|teras|treas/.test(norm),
  },

  // 29. St. Peter's HSS, Kumbalangi
  {
    canonical: "St. Peter's HSS, Kumbalangi",
    test: (norm) => /peter/.test(norm),
  },

  // 30. St. Dominic's HSS, Palluruthy
  {
    canonical: "St. Dominic's HSS, Palluruthy",
    test: (norm) => /dom[ie]n[ie]?c/.test(norm),
  },

  // 31. St. Augustine's HSS, Aroor
  {
    canonical: "St. Augustine's HSS, Aroor",
    test: (norm) => /august[ie]n/.test(norm),
  },

  // 32. GHSS / GGHSS Mattancherry
  {
    canonical: "GHSS Mattancherry",
    test: (norm) => /mattanch/i.test(norm) && /g.*hs/.test(norm),
  },

  // 33. Govt Girls HSS, Ernakulam South
  {
    canonical: "Govt Girls HSS, Ernakulam South",
    test: (norm) => (/ernakulam|ekm|ernkulam/.test(norm) && /g.*hs/.test(norm)) || /erna gghss|gov.*girls.*ernakulam/.test(norm),
  },

  // 34. Al-Ameen Public School, Edappally
  {
    canonical: "Al-Ameen Public School, Edappally",
    test: (norm) => /al\s*-?\s*ameen/.test(norm),
  },

  // 35. Bhavans Vidya Mandir (Girinagar / Adarsha)
  {
    canonical: "Bhavans Vidya Mandir",
    test: (norm) => /bhavan/.test(norm),
  },

  // 36. Model Technical Higher Secondary School, Kaloor
  {
    canonical: "Model Technical Higher Secondary School, Kaloor",
    test: (norm) => /model\s*te[ch|q]/.test(norm) || /mths.*kaloor/.test(norm),
  },

  // 37. As-Shams EMHS, Mattancherry
  {
    canonical: "As-Shams EMHS, Mattancherry",
    test: (norm) => /shams|asham/.test(norm),
  },

  // 38. HEHMM HSS / Haji Essa, Mattancherry
  {
    canonical: "HEHMM HSS / Haji Essa, Mattancherry",
    test: (norm) => /haji.*es|hehm/.test(norm),
  },

  // 39. Our Lady of Mercy HSS (Aroor / Chandiroor)
  {
    canonical: "Our Lady of Mercy HSS, Aroor",
    test: (norm) => /mercy/.test(norm) || /chandiroor/.test(norm),
  },

  // 40. OLF HSS, Kumbalangi
  {
    canonical: "OLF HSS, Kumbalangi",
    test: (norm) => /\bolf/.test(norm),
  },

  // 41. St. Joseph HSS (Thrikkakara / Kalamassery / Tripunithura)
  {
    canonical: "St. Joseph HSS",
    test: (norm) => /st\.?\s*joseph/.test(norm),
  },

  // 42. St. Paul's International School, Kalamassery
  {
    canonical: "St. Paul's International School, Kalamassery",
    test: (norm) => /pauls?(\s*int)?/.test(norm),
  },

  // 43. St. Vincent De Paul
  {
    canonical: "St. Vincent De Paul",
    test: (norm) => /vincent/.test(norm),
  },

  // 44. Ihsan Educare, Palluruthy
  {
    canonical: "Ihsan Educare, Palluruthy",
    test: (norm) => /ihsan|ishaan/.test(norm),
  },

  // 45. Fisheries School (Edakochi / Thevara)
  {
    canonical: "Fisheries School, Edakochi",
    test: (norm) => /fisheries/.test(norm) || /ghs,\s*edakochi/.test(norm),
  },

  // 46. Cochin Public School
  {
    canonical: "Cochin Public School",
    test: (norm) => /cochin\s*public/.test(norm),
  },

  // 47. Mary Matha HSS
  {
    canonical: "Mary Matha HSS",
    test: (norm) => /mary\s*matha/.test(norm),
  },

  // 48. Amrita Vidyalayam
  {
    canonical: "Amrita Vidyalayam",
    test: (norm) => /amri?t[ha]\s*vid/.test(norm),
  },

  // 49. Govt HSS Kalamassery
  {
    canonical: "Govt HSS Kalamassery",
    test: (norm) => /kalamass/.test(norm),
  },

  // 50. Govt HSS Elamakkara
  {
    canonical: "Govt HSS Elamakkara",
    test: (norm) => /elamakkara/.test(norm),
  },

  // 51. Govt HSS Edappally
  {
    canonical: "Govt HSS Edappally",
    test: (norm) => /edap+al+y/.test(norm),
  },

  // 52. Chinmaya Vidyalaya, Vaduthala
  {
    canonical: "Chinmaya Vidyalaya",
    test: (norm) => /chinmaya/.test(norm),
  },

  // 53. Jamath HSS, Padamugal
  {
    canonical: "Jamath HSS, Padamugal",
    test: (norm) => /jamath/.test(norm),
  },

  // 54. Najath Public School, Kalamassery
  {
    canonical: "Najath Public School, Kalamassery",
    test: (norm) => /najath/.test(norm),
  },

  // 55. Greets Public School, Kaloor
  {
    canonical: "Greets Public School, Kaloor",
    test: (norm) => /greets/.test(norm),
  },

  // 56. Assisi Vidyanikethan Public School
  {
    canonical: "Assisi Vidyanikethan Public School",
    test: (norm) => /assisi|assi\s*vid/.test(norm),
  },

  // 57. Saraswathi Vidyanikethan
  {
    canonical: "Saraswathi Vidyanikethan",
    test: (norm) => /sa[er]aswat?h[yi]\s*vid/.test(norm),
  },

  // 58. St. Rita's School
  {
    canonical: "St. Rita's School",
    test: (norm) => /ritas/.test(norm),
  },

  // 59. Cardinal HSS, Thrikkakara
  {
    canonical: "Cardinal HSS, Thrikkakara",
    test: (norm) => /cardin[ae]l/.test(norm),
  },

  // 60. St. Antony's
  {
    canonical: "St. Antony's",
    test: (norm) => /anton/.test(norm),
  },

  // 61. Marthoma Public School
  {
    canonical: "Marthoma Public School",
    test: (norm) => /marthoma/.test(norm),
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
