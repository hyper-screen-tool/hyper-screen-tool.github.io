import { MODEL } from "../js/model-config.js";
import { predict } from "../js/calculator.js";
import { TEST_CASES } from "../js/test-cases.js";

const referenceCase = TEST_CASES[0];
const inputs = Object.fromEntries(
  MODEL.predictors.map((predictor) => {
    const entry = referenceCase.inputs[predictor.id];
    return [
      predictor.id,
      { value: entry.value, imputed: false },
    ];
  })
);

const result = predict(inputs, referenceCase.ageyrs);
const delta = Math.abs(result.probability - referenceCase.expected_probability);

console.log("JS predict:", result.probability.toFixed(8));
console.log("R reference:", referenceCase.expected_probability.toFixed(8));
console.log("Delta:", delta.toExponential(3));
console.log("Predictors:", MODEL.predictors.length);
console.log("Classification:", result.classification);

if (MODEL.predictors.length !== 19) {
  console.error("Expected 19 predictors");
  process.exit(1);
}

if (delta > 0.002) {
  console.error("Mismatch with R reference probability");
  process.exit(1);
}

console.log("Validation passed.");
