import { MODEL } from "../js/model-config.js";
import { predict } from "../js/calculator.js";

const reference = {
  pelodwbc: 7.4,
  pelodplate: 228,
  pelodpt: 16.1,
  pelodhr: 148,
  pelodlact: 2,
  prismpao2lo: 63.2,
  prismbunhi: 13,
  prismph: 7.32,
  prismtemphi: 37.2,
  prismgluc: 155,
  intub: 0,
  wt: 19.5,
  male: 1,
  vaso: 1,
  prisminpt: 0,
  prismpostop: 0,
  prismprevadm: 0,
  prismcancer: 0,
  prismnonop: 0,
};

const expectedProbability = 0.3237339;
const inputs = Object.fromEntries(
  MODEL.predictors.map((predictor) => [
    predictor.id,
    { value: reference[predictor.id], imputed: false },
  ])
);

const result = predict(inputs);
const delta = Math.abs(result.probability - expectedProbability);

console.log("JS predict:", result.probability.toFixed(8));
console.log("R reference:", expectedProbability.toFixed(8));
console.log("Delta:", delta.toExponential(3));
console.log("Predictors:", MODEL.predictors.length);
console.log("Classification:", result.classification);

if (MODEL.predictors.length !== 19) {
  console.error("Expected 19 predictors");
  process.exit(1);
}

if (delta > 1e-5) {
  console.error("Mismatch with R reference probability");
  process.exit(1);
}

console.log("Validation passed.");
