/**
 * PRISM/PELOD normal-reference (midpoint) imputation — mirrors prism_peleod_normal_imputation.R
 */

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
  { variable: "prismnonop", age_band: "all", normal_mid: 0 },
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
 */
export function imputeValue(predictor, ageYears) {
  if (predictor.imputation === "derivation_median") {
    return predictor.derivationMedian ?? 0;
  }
  if (PRISM_PELOD_VARS.has(predictor.id)) {
    const mid = lookupNormalMid(predictor.id, prismAgeBand(ageYears));
    if (mid != null) return mid;
  }
  return predictor.derivationMedian ?? 0;
}

export function isPrismPeleodVariable(variable) {
  return PRISM_PELOD_VARS.has(variable);
}
