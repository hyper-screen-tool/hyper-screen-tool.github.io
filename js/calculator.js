import { MODEL } from "./model-config.js";

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
 */
export function predict(inputs) {
  let logit = MODEL.intercept;
  const contributions = [];
  const imputedFields = [];

  for (const predictor of MODEL.predictors) {
    const entry = inputs[predictor.id];
    const value = entry?.value ?? predictor.median;
    const imputed = entry?.imputed ?? true;

    if (imputed) {
      imputedFields.push(predictor.label);
    }

    const contribution = predictor.coefficient * value;
    logit += contribution;

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

  const probability = sigmoid(logit);
  const classification =
    probability >= MODEL.threshold ? "hyperinflammatory" : "hypoinflammatory";

  return {
    logit,
    probability,
    classification,
    threshold: MODEL.threshold,
    contributions,
    imputedFields,
  };
}

export function formatProbability(probability) {
  return `${(probability * 100).toFixed(1)}%`;
}

export function classificationLabel(classification) {
  return classification === "hyperinflammatory"
    ? "Hyperinflammatory"
    : "Hypoinflammatory";
}
