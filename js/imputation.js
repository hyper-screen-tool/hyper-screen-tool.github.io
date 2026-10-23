/**
 * Missing-value imputation for HYPER-SCREEN.
 *
 * - normal_midpoint: PRISM/PELOD healthy-range midpoints (primary US analysis).
 * - median: derivation-cohort medians (limited-resource settings; unmeasured
 *   physiology is not assumed normal).
 */

export const IMPUTATION_METHODS = {
  normal_midpoint: {
    id: "normal_midpoint",
    label: "Normal-reference midpoint",
    shortLabel: "healthy-range midpoint",
    setting: "Primary analysis",
    description:
      "Missing PRISM/PELOD physiology is filled with the midpoint of the published 0-point healthy range (age-banded where applicable). Binary indicators are imputed as absent. Use when unmeasured values can reasonably be assumed normal.",
  },
  median: {
    id: "median",
    label: "Median (limited-resource settings)",
    shortLabel: "derivation-cohort median",
    setting: "Limited-resource settings",
    description:
      "Missing values are filled with derivation-cohort medians. Use when unmeasured physiology cannot be assumed normal, as in resource-limited settings.",
  },
};

const LOOKUP = [
  { variable: "prismph", age_band: "all", normal_mid: 7.375 },
  { variable: "prismk", age_band: "all", normal_mid: 5.2 },
  { variable: "prismtemphi", age_band: "all", normal_mid: 36.5 },
  { variable: "prismbunhi", age_band: "neonate", normal_mid: 8.45 },
  { variable: "prismbunhi", age_band: "infant", normal_mid: 9.95 },
  { variable: "prismbunhi", age_band: "child", normal_mid: 9.95 },
  { variable: "prismbunhi", age_band: "adolescent", normal_mid: 9.95 },
  { variable: "prismpao2lo", age_band: "all", normal_mid: 85 },
  { variable: "pelodwbc", age_band: "all", normal_mid: 7.5 },
  { variable: "pelodplate", age_band: "all", normal_mid: 275.5 },
  { variable: "pelodpt", age_band: "all", normal_mid: 16.5 },
  { variable: "pelodlact", age_band: "all", normal_mid: 2.38 },
  { variable: "pelodhr", age_band: "neonate", normal_mid: 157 },
  { variable: "pelodhr", age_band: "infant", normal_mid: 157 },
  { variable: "pelodhr", age_band: "child", normal_mid: 137 },
  { variable: "pelodhr", age_band: "adolescent", normal_mid: 107 },
  { variable: "bicarb", age_band: "all", normal_mid: 25 },
  { variable: "male", age_band: "all", normal_mid: 0 },
  { variable: "vaso", age_band: "all", normal_mid: 0 },
  { variable: "prisminpt", age_band: "all", normal_mid: 0 },
  { variable: "prismpostop", age_band: "all", normal_mid: 0 },
  { variable: "prismprevadm", age_band: "all", normal_mid: 0 },
  { variable: "prismcancer", age_band: "all", normal_mid: 0 },
];

const LOOKUP_BY_VAR = LOOKUP.reduce((acc, row) => {
  if (!acc[row.variable]) acc[row.variable] = {};
  acc[row.variable][row.age_band] = row.normal_mid;
  return acc;
}, {});

const PRISM_PELOD_VARS = new Set(LOOKUP.map((row) => row.variable));

/** @param {number | null | undefined} ageYears */
export function prismAgeBand(ageYears) {
  if (ageYears == null || !Number.isFinite(ageYears)) return "child";
  if (ageYears < 1 / 12) return "neonate";
  if (ageYears < 1) return "infant";
  if (ageYears > 12) return "adolescent";
  return "child";
}

export function lookupNormalMid(variable, ageBand = "child") {
  const rows = LOOKUP_BY_VAR[variable];
  if (!rows) return null;
  if (rows[ageBand] != null) return rows[ageBand];
  if (rows.all != null) return rows.all;
  return Object.values(rows)[0] ?? null;
}

/**
 * @param {{ id: string, imputation?: string, derivationMedian?: number }} predictor
 * @param {number | null | undefined} ageYears
 * @param {"normal_midpoint" | "median"} [method]
 */
export function imputeValue(predictor, ageYears, method = "normal_midpoint") {
  if (method === "median" || predictor.imputation === "derivation_median") {
    return predictor.derivationMedian ?? 0;
  }
  if (PRISM_PELOD_VARS.has(predictor.id)) {
    const mid = lookupNormalMid(predictor.id, prismAgeBand(ageYears));
    if (mid != null) return mid;
  }
  return predictor.derivationMedian ?? 0;
}

export function imputationSourceLabel(predictor, method = "normal_midpoint") {
  if (method === "median" || predictor.imputation === "derivation_median") {
    return IMPUTATION_METHODS.median.shortLabel;
  }
  return IMPUTATION_METHODS.normal_midpoint.shortLabel;
}

export function isPrismPeleodVariable(variable) {
  return PRISM_PELOD_VARS.has(variable);
}
