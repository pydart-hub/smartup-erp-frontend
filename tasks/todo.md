# School Normalization & Deduplication

## Summary of Changes
- Created master school mapping registry at `src/lib/reports/school-mappings.ts`.
- Clustered all common variants across 27 canonical schools, unifying:
  - `OLCGHS`, `OLCGHSS`, `OLCGS`, `Our Lady's CGHS, Thoppumpady` -> **`OLCGHSS, Thoppumpady`** (67 total students, 25 in 10th State).
  - `Our Lady’s`, `Our ladies`, `OUR LADYS`, `Ourladies` -> **`Our Lady's`**.
  - `SDPY`, `SDPY HSS`, `SDPY BHS` -> **`SDPY HSS, Palluruthy`**.
  - `FATIMA`, `Fatima ghs`, `FATIMA GHS` -> **`Fatima Girls High School, Fort Kochi`**.
  - `ST SEBASTIAN`, `St sebastian`, `St. Sebastians HSS` -> **`St. Sebastian's HSS, Thoppumpady`**.
  - `SANTA CRUZ`, `Santa Cruz HSS` -> **`Santa Cruz HSS, Fort Kochi`**.
  - `BRITTO`, `ST JOHN DE BRITTO` -> **`St. John De Britto, Fort Kochi`**.
  - `GUJARATI`, `GUJARATHY`, `Gujarathi` -> **`Gujarati High School, Mattancherry`**.
  - `CALVATHY`, `CENTRAL CALVATHY`, `GHSS CENTRAL CALVATHY` -> **`Central Calvathy GHSS`**.
  - And all other top schools across branches.
- Exported `CANONICAL_SCHOOL_NAMES` list for admission dropdowns.
- Verified TypeScript compilation (`npx tsc --noEmit`) passes with 0 errors.
