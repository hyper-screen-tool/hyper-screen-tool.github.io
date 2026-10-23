import { MODEL } from "./model-config.js";
import { imputeValue, imputationSourceLabel } from "./imputation.js";

function sigmoid(logit) {
  if (logit >= 0) {
    const z = Math.exp(-logit);
    return 1 / (1 + z);
  }
  const z = Math.exp(logit);
  return z / (1 + z);
}

/**
 * @param {Record<string, { value: number, imputed: boolean }>} inputs
 * @param {number | null | undefined} ageYears
 * @param {"normal_midpoint" | "median"} [imputationMethod]
 */
export function predict(inputs, ageYears = null, imputationMethod = "normal_midpoint") {
  let linearPredictor = MODEL.intercept;
  const contributions = [];
  const imputedFields = [];

  for (const predictor of MODEL.predictors) {
    const entry = inputs[predictor.id];
    const imputed = entry?.imputed ?? true;
    const value = imputed
      ? imputeValue(predictor, ageYears, imputationMethod)
      : (entry?.value ?? imputeValue(predictor, ageYears, imputationMethod));

    if (imputed) {
      imputedFields.push({
        label: predictor.label,
        value,
        source: imputationSourceLabel(predictor, imputationMethod),
      });
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

  // Model output on the weighted (class weight 5.5) training scale.
  const riskScore = sigmoid(linearPredictor);
  const classification =
    riskScore >= MODEL.threshold ? "hyperinflammatory" : "hypoinflammatory";

  return {
    logit: linearPredictor,
    riskScore,
    /** @deprecated use riskScore; kept for test compatibility */
    probability: riskScore,
    classification,
    threshold: MODEL.threshold,
    contributions,
    imputedFields,
    imputationMethod,
  };
}

/** Display model output as a 0–1 risk score. */
export function formatRiskScore(score) {
  return Number(score).toFixed(2);
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
