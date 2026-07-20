import { MODEL } from "../js/model-config.js";
import { predict } from "../js/calculator.js";
import { TEST_CASES } from "../js/test-cases.js";

let failed = 0;

for (const testCase of TEST_CASES) {
  const inputs = Object.fromEntries(
    MODEL.predictors.map((predictor) => {
      const entry = testCase.inputs[predictor.id] ?? { missing: true };
      return [
        predictor.id,
        {
          value: entry.missing ? null : entry.value,
          imputed: Boolean(entry.missing),
        },
      ];
    })
  );

  const ageYears =
    testCase.ageyrs == null || Number.isNaN(testCase.ageyrs)
      ? null
      : testCase.ageyrs;

  const result = predict(inputs, ageYears);
  const probDelta = Math.abs(result.probability - testCase.expected_probability);
  const classOk =
    (result.classification === "hyperinflammatory"
      ? "Hyperinflammatory"
      : "Hypoinflammatory") === testCase.expected_result;
  const probOk = probDelta <= 0.002;

  if (classOk && probOk) {
    console.log(`PASS  ${testCase.id}`);
    continue;
  }

  failed += 1;
  console.error(
    `FAIL  ${testCase.id}: prob=${result.probability.toFixed(4)} (exp ${testCase.expected_probability}), class mismatch=${!classOk}`
  );
}

if (failed > 0) {
  console.error(`${failed} test case(s) failed`);
  process.exit(1);
}

console.log(`All ${TEST_CASES.length} test cases passed.`);
