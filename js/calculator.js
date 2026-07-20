import { MODEL } from "./model-config.js";
import { imputeValue } from "./imputation.js";

function sigmoid(logit) {
  if (logit >= 0) {
    const z = Math.exp(-logit);
    return 1 / (1 + z);
  }
  const z = Math.exp(logit);
  return z / (1 + z);
}

function logit(p) {
  const eps = 1e-6;
  const clipped = Math.min(Math.max(p, eps), 1 - eps);
  return Math.log(clipped / (1 - clipped));
}

/**
 * Platt recalibration of a raw risk score to an absolute probability.
 * Uses derivation-fit intercept/slope stored on MODEL.platt.
 */
export function plattRecalibrate(rawScore) {
  const a = MODEL.platt?.intercept;
  const b = MODEL.platt?.slope;
  if (a == null || b == null) return null;
  return sigmoid(a + b * logit(rawScore));
}

/**
 * @param {Record<string, { value: number, imputed: boolean }>} inputs
 * @param {number | null | undefined} ageYears
 */
export function predict(inputs, ageYears = null) {
  let linearPredictor = MODEL.intercept;
  const contributions = [];
  const imputedFields = [];

  for (const predictor of MODEL.predictors) {
    const entry = inputs[predictor.id];
    const imputed = entry?.imputed ?? true;
    const value = imputed
      ? imputeValue(predictor, ageYears)
      : (entry?.value ?? imputeValue(predictor, ageYears));

    if (imputed) {
      imputedFields.push(predictor.label);
    }

    const contribution = predictor.coefficient * value;
    linearPredictor += contribution;

    contributions.push({
      id: predictor.id,
      label: predictor.label,
      value,
      imputed,
      coefficient: predictor.coefficient,
      contribution,
      oddsRatio: Math.exp(predictor.coefficient),
    });
  }

  // Raw model output on the weighted (class weight 5.5) training scale.
  const riskScore = sigmoid(linearPredictor);
  const calibratedProbability = plattRecalibrate(riskScore);
  const classification =
    riskScore >= MODEL.threshold ? "hyperinflammatory" : "hypoinflammatory";

  return {
    logit: linearPredictor,
    riskScore,
    calibratedProbability,
    /** @deprecated use riskScore; kept for test compatibility */
    probability: riskScore,
    classification,
    threshold: MODEL.threshold,
    contributions,
    imputedFields,
  };
}

/** Display raw model output as a 0–1 risk score (not a percent probability). */
export function formatRiskScore(score) {
  return Number(score).toFixed(2);
}

/** Display Platt-recalibrated absolute probability as a percent. */
export function formatCalibratedProbability(probability) {
  if (probability == null || Number.isNaN(probability)) return "—";
  return `${(Number(probability) * 100).toFixed(1)}%`;
}

/** @deprecated use formatRiskScore */
export function formatProbability(probability) {
  return formatRiskScore(probability);
}

export function classificationLabel(classification) {
  return classification === "hyperinflammatory"
    ? "Hyperinflammatory"
    : "Hypoinflammatory";
}
