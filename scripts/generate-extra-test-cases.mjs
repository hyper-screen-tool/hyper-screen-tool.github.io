#!/usr/bin/env node
/**
 * Build additional HYPER-SCREEN test cases from validation cohort rows.
 * Scores with the live JS calculator so expected values match the site.
 *
 * Usage: node scripts/generate-extra-test-cases.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MODEL } from "../js/model-config.js";
import { imputeValue } from "../js/imputation.js";
import { predict } from "../js/calculator.js";
import { TEST_CASES as EXISTING } from "../js/test-cases.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const CSV = path.join(
  ROOT,
  "..",
  "Clove OG Model Final Boss",
  "datasheets",
  "_all_with_fixed_vars.csv"
);

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      const raw = cols[i] ?? "";
      row[h] = raw === "" ? null : raw;
    });
    return row;
  });
}

function num(x) {
  if (x == null || x === "") return null;
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}

/** Build inputs; null CSV fields become imputed values (complete) or missing flags. */
function rowToInputs(row, ageyrs, mode, forceMissing = []) {
  const inputs = {};
  for (const predictor of MODEL.predictors) {
    const forced = forceMissing.includes(predictor.id);
    const v = num(row[predictor.id]);
    if (forced) {
      inputs[predictor.id] = { missing: true };
    } else if (v == null) {
      if (mode === "complete") {
        // Fill with the same value the calculator would impute, shown as entered
        inputs[predictor.id] = {
          value: imputeValue(predictor, ageyrs),
          missing: false,
        };
      } else {
        inputs[predictor.id] = { missing: true };
      }
    } else {
      inputs[predictor.id] = { value: v, missing: false };
    }
  }
  return inputs;
}

function scoreCase({ id, label, category, ageyrs, inputs, study, patient_id, true_lca }) {
  const predictInputs = Object.fromEntries(
    MODEL.predictors.map((predictor) => {
      const entry = inputs[predictor.id] ?? { missing: true };
      return [
        predictor.id,
        {
          value: entry.missing ? null : entry.value,
          imputed: Boolean(entry.missing),
        },
      ];
    })
  );
  const result = predict(predictInputs, ageyrs);
  return {
    id,
    label,
    category,
    expected_probability: Number(result.riskScore.toFixed(4)),
    expected_calibrated_probability: Number(
      result.calibratedProbability.toFixed(4)
    ),
    expected_result:
      result.classification === "hyperinflammatory"
        ? "Hyperinflammatory"
        : "Hypoinflammatory",
    ageyrs,
    study,
    patient_id,
    true_lca,
    inputs,
  };
}

function pickSpaced(pool, n) {
  if (!pool.length) return [];
  const sorted = [...pool].sort(
    (a, b) => a.expected_probability - b.expected_probability
  );
  const out = [];
  const seen = new Set();
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i / Math.max(n - 1, 1)) * (sorted.length - 1));
    const c = sorted[idx];
    const key = `${c.study}:${c.patient_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

const rows = parseCsv(fs.readFileSync(CSV, "utf8")).filter((r) =>
  ["chop", "cpccrn"].includes(String(r.study).toLowerCase())
);

const completePool = [];
for (const row of rows) {
  const ageyrs = num(row.ageyrs) ?? 5.7;
  const inputs = rowToInputs(row, ageyrs, "complete");
  const nativeMissing = MODEL.predictors.filter(
    (p) => num(row[p.id]) == null
  ).length;
  const c = scoreCase({
    id: `tmp_${row.study}_${row.id}`,
    label: "tmp",
    category: "complete",
    ageyrs,
    inputs,
    study: row.study,
    patient_id: row.id,
    true_lca: num(row.lca),
  });
  c._nativeMissing = nativeMissing;
  completePool.push(c);
}

console.log(`Validation rows scored: ${completePool.length}`);

const keepIds = new Set([
  "val_hyper_1",
  "val_hypo_1",
  "val_missing_lact_ph",
]);

const existingKept = EXISTING.filter((c) => keepIds.has(c.id)).map((c) => {
  const predictInputs = Object.fromEntries(
    MODEL.predictors.map((predictor) => {
      const entry = c.inputs[predictor.id] ?? { missing: true };
      return [
        predictor.id,
        {
          value: entry.missing ? null : entry.value,
          imputed: Boolean(entry.missing),
        },
      ];
    })
  );
  const result = predict(predictInputs, c.ageyrs);
  return {
    ...c,
    expected_probability: Number(result.riskScore.toFixed(4)),
    expected_calibrated_probability: Number(
      result.calibratedProbability.toFixed(4)
    ),
    expected_result:
      result.classification === "hyperinflammatory"
        ? "Hyperinflammatory"
        : "Hypoinflammatory",
  };
});

const predictedHyper = completePool.filter(
  (c) => c.expected_result === "Hyperinflammatory"
);
const predictedHypo = completePool.filter(
  (c) => c.expected_result === "Hypoinflammatory"
);

const hyperPicks = pickSpaced(predictedHyper, 5).map((c, i) => ({
  ...c,
  id: `val_hyper_${i + 2}`,
  label: `High-score example #${i + 1} (score ${c.expected_probability.toFixed(2)})`,
  category: "complete",
}));

const hypoPicks = pickSpaced(predictedHypo, 5).map((c, i) => ({
  ...c,
  id: `val_hypo_${i + 2}`,
  label: `Low-score example #${i + 1} (score ${c.expected_probability.toFixed(2)})`,
  category: "complete",
}));

const borderline = [];
const usedBorder = new Set();
for (const c of [...completePool].sort(
  (a, b) =>
    Math.abs(a.expected_probability - 0.7) -
    Math.abs(b.expected_probability - 0.7)
)) {
  const bucket = c.expected_probability.toFixed(3);
  if (usedBorder.has(bucket)) continue;
  usedBorder.add(bucket);
  borderline.push({
    ...c,
    id: `val_borderline_${borderline.length + 1}`,
    label: `Near threshold (score ${c.expected_probability.toFixed(2)})`,
    category: "complete",
  });
  if (borderline.length >= 3) break;
}

function ageCase(pred, id, label) {
  const hit = completePool.find(pred);
  if (!hit) return null;
  return { ...hit, id, label, category: "complete" };
}

const ageCases = [
  ageCase((c) => c.ageyrs < 1 / 12, "val_neonate", "Neonate example"),
  ageCase(
    (c) => c.ageyrs >= 1 / 12 && c.ageyrs < 1,
    "val_infant",
    "Infant example"
  ),
  ageCase((c) => c.ageyrs > 12, "val_adolescent", "Adolescent example"),
].filter(Boolean);

function missingFrom(source, id, label, forceMissing) {
  if (!source) return null;
  const row = rows.find(
    (r) => r.study === source.study && String(r.id) === String(source.patient_id)
  );
  if (!row) return null;
  const ageyrs = num(row.ageyrs) ?? source.ageyrs;
  const inputs = rowToInputs(row, ageyrs, "complete", forceMissing);
  // forceMissing stay missing; others filled
  return scoreCase({
    id,
    label,
    category: "missing",
    ageyrs,
    inputs,
    study: row.study,
    patient_id: row.id,
    true_lca: num(row.lca),
  });
}

const highHyper = [...predictedHyper].sort(
  (a, b) => b.expected_probability - a.expected_probability
);
const lowHypo = [...predictedHypo].sort(
  (a, b) => a.expected_probability - b.expected_probability
);

const missingCases = [
  missingFrom(highHyper[0], "val_missing_wt", "Hyper — weight imputed", ["wt"]),
  missingFrom(
    highHyper[1] ?? highHyper[0],
    "val_missing_labs_cluster",
    "Hyper — WBC, platelets, BUN imputed",
    ["pelodwbc", "pelodplate", "prismbunhi"]
  ),
  missingFrom(
    highHyper[2] ?? highHyper[0],
    "val_missing_vitals",
    "Hyper — HR & temp imputed",
    ["pelodhr", "prismtemphi"]
  ),
  missingFrom(
    highHyper[3] ?? highHyper[0],
    "val_missing_gas",
    "Hyper — PaO₂ & bicarb imputed",
    ["prismpao2lo", "bicarb"]
  ),
  missingFrom(
    lowHypo[0],
    "val_missing_hypo_lact",
    "Hypo — lactate imputed",
    ["pelodlact"]
  ),
  missingFrom(
    lowHypo[1] ?? lowHypo[0],
    "val_missing_hypo_many",
    "Hypo — lactate, PT, potassium imputed",
    ["pelodlact", "pelodpt", "prismk"]
  ),
].filter(Boolean);

function slim(c) {
  return {
    id: c.id,
    label: c.label,
    category: c.category,
    expected_probability: c.expected_probability,
    expected_calibrated_probability: c.expected_calibrated_probability,
    expected_result: c.expected_result,
    ageyrs: c.ageyrs,
    inputs: c.inputs,
  };
}

const all = [
  ...existingKept,
  ...hyperPicks,
  ...hypoPicks,
  ...borderline,
  ...ageCases,
  ...missingCases,
].map(slim);

const seen = new Set();
const unique = all.filter((c) => {
  if (seen.has(c.id)) return false;
  seen.add(c.id);
  return true;
});

function toJsModule(cases) {
  const body = cases
    .map((c) => {
      const inputs = MODEL.predictors
        .map((p) => {
          const e = c.inputs[p.id] ?? { missing: true };
          if (e.missing) return `      ${p.id}: { missing: true },`;
          return `      ${p.id}: { value: ${JSON.stringify(e.value)}, missing: false },`;
        })
        .join("\n");
      return `  {
    id: ${JSON.stringify(c.id)},
    label: ${JSON.stringify(c.label)},
    category: ${JSON.stringify(c.category)},
    expected_probability: ${c.expected_probability},
    expected_calibrated_probability: ${c.expected_calibrated_probability},
    expected_result: ${JSON.stringify(c.expected_result)},
    ageyrs: ${c.ageyrs},
    inputs: {
${inputs}
    },
  }`;
    })
    .join(",\n");

  return `/**
 * JS-validated test cases — regenerate via:
 *   node scripts/generate-extra-test-cases.mjs
 */
export const TEST_CASES = [
${body}
];
`;
}

fs.writeFileSync(path.join(ROOT, "js/test-cases.js"), toJsModule(unique));
fs.writeFileSync(
  path.join(ROOT, "assets/model/test-cases.json"),
  JSON.stringify({ test_cases: unique }, null, 2)
);

console.log(`Wrote ${unique.length} test cases`);
for (const c of unique) {
  console.log(
    `  ${c.category.padEnd(8)} ${c.id.padEnd(28)} score=${c.expected_probability.toFixed(3)} cal=${(c.expected_calibrated_probability * 100).toFixed(1)}% ${c.expected_result}`
  );
}
