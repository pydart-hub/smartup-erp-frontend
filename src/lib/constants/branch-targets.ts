/** Annual admission target per branch (keyed by full branch name from Frappe). */
export const BRANCH_ADMISSION_TARGETS: Record<string, number> = {
  "Smart Up Eraveli":      400,
  "Smart Up Fortkochi":    400,
  "Smart Up Chullickal":   400,
  "Smart Up Moolamkuzhi":  200,
  "Smart Up Thoppumpadi":  300,
  "Smart Up Palluruthi":   400,
  "Smart Up Vennala":      290,
  "Smart Up Kadavanthara":  240,
  "Smart Up Edappally":    240,
};

/** Annual collection target per branch (in ₹). */
export const BRANCH_COLLECTION_TARGETS: Record<string, number> = {
  "Smart Up Eraveli":      6580000,
  "Smart Up Fortkochi":    7180000,
  "Smart Up Chullickal":   7180000,
  "Smart Up Palluruthi":   7180000,
  "Smart Up Thoppumpadi":  5520000,
  "Smart Up Moolamkuzhi":  3440000,
  "Smart Up Vennala":      8330000,
  "Smart Up Kadavanthara": 9600000,
  "Smart Up Edappally":    8640000,
};

/** Default target when branch is not found in the map. */
export const DEFAULT_BRANCH_TARGET = 400;
export const DEFAULT_COLLECTION_TARGET = 7180000;

/** Get the admission target for a specific branch. */
export function getBranchTarget(branchName: string): number {
  return BRANCH_ADMISSION_TARGETS[branchName] ?? DEFAULT_BRANCH_TARGET;
}

/** Get the collection target for a specific branch. */
export function getCollectionTarget(branchName: string): number {
  return BRANCH_COLLECTION_TARGETS[branchName] ?? DEFAULT_COLLECTION_TARGET;
}

/** Sum of all admission targets for given branches. */
export function getTotalTarget(branchNames: string[]): number {
  return branchNames.reduce((sum, name) => sum + getBranchTarget(name), 0);
}

/** Sum of all collection targets for given branches. */
export function getTotalCollectionTarget(branchNames: string[]): number {
  return branchNames.reduce((sum, name) => sum + getCollectionTarget(name), 0);
}
