import { MODEL } from "./model-config.js";
import { TEST_CASES } from "./test-cases.js";
import {
  predict,
  formatRiskScore,
  classificationLabel,
} from "./calculator.js";

const form = document.getElementById("predictor-form");
const resultPanel = document.getElementById("result-panel");
const resultPlaceholder = document.getElementById("result-placeholder");
const resultContent = document.getElementById("result-content");
const probabilityValue = document.getElementById("probability-value");
const classificationBadge = document.getElementById("classification-badge");
const thresholdNote = document.getElementById("threshold-note");
const imputedList = document.getElementById("imputed-list");
const contributionList = document.getElementById("contribution-list");
const resetButton = document.getElementById("reset-button");
const calculateButton = document.getElementById("calculate-button");
const testCaseSelect = document.getElementById("test-case-select");
const loadTestCaseButton = document.getElementById("load-test-case-button");
const testCaseBanner = document.getElementById("test-case-banner");
const testCaseExpected = document.getElementById("test-case-expected");
const testCaseMatch = document.getElementById("test-case-match");

let hasCalculated = false;
let activeTestCase = null;
let isLoadingTestCase = false;

function groupPredictors() {
  const groups = new Map();
  for (const predictor of MODEL.predictors) {
    if (!groups.has(predictor.group)) {
      groups.set(predictor.group, []);
    }
    groups.get(predictor.group).push(predictor);
  }
  return groups;
}

function createContinuousField(predictor) {
  const field = document.createElement("div");
  field.className = "field";
  field.dataset.predictorId = predictor.id;

  const labelRow = document.createElement("div");
  labelRow.className = "field-label-row";

  const label = document.createElement("label");
  label.className = "field-label";
  label.htmlFor = `${predictor.id}-value`;
  label.textContent = predictor.label;

  const unit = document.createElement("span");
  unit.className = "field-unit";
  unit.textContent = predictor.unit || "value";

  labelRow.append(label, unit);

  const inputRow = document.createElement("div");
  inputRow.className = "input-row";

  const input = document.createElement("input");
  input.type = "number";
  input.id = `${predictor.id}-value`;
  input.name = predictor.id;
  input.className = "value-input";
  input.autocomplete = "off";
  input.inputMode = "decimal";

  const missingWrap = document.createElement("label");
  missingWrap.className = "missing-toggle";
  missingWrap.htmlFor = `${predictor.id}-missing`;

  const missing = document.createElement("input");
  missing.type = "checkbox";
  missing.id = `${predictor.id}-missing`;
  missing.className = "missing-checkbox";
  missing.dataset.role = "missing";

  const missingText = document.createElement("span");
  missingText.textContent = "Missing";

  missingWrap.append(missing, missingText);

  missing.addEventListener("change", () => {
    input.disabled = missing.checked;
    if (missing.checked) {
      input.value = "";
      input.classList.add("is-missing");
    } else {
      input.classList.remove("is-missing");
      input.focus();
    }
    clearTestCaseBanner();
    if (hasCalculated) runCalculation();
  });

  input.addEventListener("input", () => {
    if (input.value !== "") {
      missing.checked = false;
      input.disabled = false;
      input.classList.remove("is-missing");
    }
    clearTestCaseBanner();
    if (hasCalculated) runCalculation();
  });

  inputRow.append(input, missingWrap);
  field.append(labelRow, inputRow);
  return field;
}

function createBinaryField(predictor) {
  const field = document.createElement("div");
  field.className = "field field-binary";
  field.dataset.predictorId = predictor.id;

  const label = document.createElement("span");
  label.className = "field-label";
  label.textContent = predictor.label;

  const options = document.createElement("div");
  options.className = "binary-options";
  options.setAttribute("role", "radiogroup");
  options.setAttribute("aria-label", predictor.label);

  const choices = [
    { value: "1", label: predictor.yesLabel },
    { value: "0", label: predictor.noLabel },
    { value: "missing", label: "Missing" },
  ];

  for (const choice of choices) {
    const optionLabel = document.createElement("label");
    optionLabel.className = "binary-option";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = predictor.id;
    radio.value = choice.value;
    radio.className = "binary-radio";

    const text = document.createElement("span");
    text.textContent = choice.label;

    optionLabel.append(radio, text);
    options.append(optionLabel);
  }

  options.addEventListener("change", () => {
    clearTestCaseBanner();
    if (hasCalculated) runCalculation();
  });

  field.append(label, options);
  return field;
}

function renderForm() {
  const ageSection = document.createElement("section");
  ageSection.className = "form-section";
  const ageHeading = document.createElement("h3");
  ageHeading.className = "form-section-title";
  ageHeading.textContent = "Age (for imputation)";
  const ageField = document.createElement("div");
  ageField.className = "field";
  ageField.innerHTML = `
    <div class="field-label-row">
      <label class="field-label" for="ageyrs-value">Age in years</label>
      <span class="field-unit">years</span>
    </div>
    <div class="input-row">
      <input type="number" id="ageyrs-value" name="ageyrs" class="value-input"
        autocomplete="off" inputmode="decimal" min="0" step="0.01"
        placeholder="Optional — defaults to child band if blank" />
    </div>
    <p class="field-hint">Used only to select age-stratified PRISM/PELOD midpoint imputation values.</p>
  `;
  ageSection.append(ageHeading, ageField);
  form.append(ageSection);

  const ageInput = document.getElementById("ageyrs-value");
  ageInput.addEventListener("input", () => {
    clearTestCaseBanner();
    if (hasCalculated) runCalculation();
  });

  const groups = groupPredictors();
  for (const [groupName, predictors] of groups) {
    const section = document.createElement("section");
    section.className = "form-section";

    const heading = document.createElement("h3");
    heading.className = "form-section-title";
    heading.textContent = groupName;

    const grid = document.createElement("div");
    grid.className = "field-grid";

    for (const predictor of predictors) {
      grid.append(
        predictor.type === "binary"
          ? createBinaryField(predictor)
          : createContinuousField(predictor)
      );
    }

    section.append(heading, grid);
    form.append(section);
  }
}

function populateTestCaseSelect() {
  const groups = [
    { key: "complete", label: "Complete data" },
    { key: "missing", label: "Missing data" },
  ];

  for (const group of groups) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;
    for (const testCase of TEST_CASES.filter((tc) => tc.category === group.key)) {
      const option = document.createElement("option");
      option.value = testCase.id;
      option.textContent = testCase.label;
      optgroup.append(option);
    }
    testCaseSelect.append(optgroup);
  }
}

function setContinuousField(predictorId, entry) {
  const input = document.getElementById(`${predictorId}-value`);
  const missing = document.getElementById(`${predictorId}-missing`);

  if (entry.missing) {
    missing.checked = true;
    input.value = "";
    input.disabled = true;
    input.classList.add("is-missing");
    return;
  }

  missing.checked = false;
  input.disabled = false;
  input.classList.remove("is-missing");
  input.value = String(entry.value);
}

function setBinaryField(predictorId, entry) {
  const radios = form.querySelectorAll(`input[name="${predictorId}"]`);
  for (const radio of radios) {
    radio.checked = false;
  }

  if (entry.missing) {
    const missingRadio = form.querySelector(
      `input[name="${predictorId}"][value="missing"]`
    );
    if (missingRadio) missingRadio.checked = true;
    return;
  }

  const target = form.querySelector(
    `input[name="${predictorId}"][value="${entry.value}"]`
  );
  if (target) target.checked = true;
}

function loadTestCase(testCaseId) {
  const testCase = TEST_CASES.find((tc) => tc.id === testCaseId);
  if (!testCase) return;

  isLoadingTestCase = true;
  activeTestCase = testCase;

  for (const predictor of MODEL.predictors) {
    const entry = testCase.inputs[predictor.id] ?? { missing: true };
    if (predictor.type === "continuous") {
      setContinuousField(predictor.id, entry);
    } else {
      setBinaryField(predictor.id, entry);
    }
  }

  const ageInput = document.getElementById("ageyrs-value");
  if (ageInput) {
    ageInput.value =
      testCase.ageyrs != null && Number.isFinite(testCase.ageyrs)
        ? String(testCase.ageyrs)
        : "";
  }

  isLoadingTestCase = false;

  const testCaseDetails = document.getElementById("test-case-details");
  if (testCaseDetails) testCaseDetails.open = true;

  testCaseBanner.hidden = false;
  testCaseExpected.textContent = `${testCase.label} — expected score ${formatRiskScore(testCase.expected_probability)} → ${testCase.expected_result}`;
  testCaseMatch.textContent = "";
  testCaseMatch.className = "test-case-match";

  runCalculation();
}

function clearTestCaseBanner() {
  if (isLoadingTestCase) return;
  activeTestCase = null;
  testCaseBanner.hidden = true;
  testCaseExpected.textContent = "";
  testCaseMatch.textContent = "";
  testCaseMatch.className = "test-case-match";
}

function readAgeYears() {
  const input = document.getElementById("ageyrs-value");
  if (!input || input.value === "") return null;
  const age = Number.parseFloat(input.value);
  return Number.isFinite(age) ? age : null;
}

function readInputs() {
  const inputs = {};

  for (const predictor of MODEL.predictors) {
    if (predictor.type === "continuous") {
      const missing = document.getElementById(`${predictor.id}-missing`);
      const input = document.getElementById(`${predictor.id}-value`);
      const imputed = missing.checked || input.value === "";
      const value = imputed
        ? null
        : Number.parseFloat(input.value);

      inputs[predictor.id] = {
        value: Number.isFinite(value) ? value : null,
        imputed,
      };
      continue;
    }

    const selected = form.querySelector(`input[name="${predictor.id}"]:checked`);
    const imputed = !selected || selected.value === "missing";
    const value = imputed ? null : Number(selected.value);

    inputs[predictor.id] = { value, imputed };
  }

  return inputs;
}

function renderContributions(contributions) {
  contributionList.replaceChildren();

  const sorted = [...contributions].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  for (const item of sorted) {
    const row = document.createElement("li");
    row.className = "contribution-item";

    const name = document.createElement("span");
    name.className = "contribution-name";
    name.textContent = item.label;

    const value = document.createElement("span");
    value.className = "contribution-value";
    const sign = item.contribution >= 0 ? "+" : "";
    value.textContent = `${sign}${item.contribution.toFixed(3)}`;

    row.append(name, value);
    contributionList.append(row);
  }
}

function renderImputedFields(fields) {
  imputedList.replaceChildren();

  if (fields.length === 0) {
    const item = document.createElement("li");
    item.textContent = "None — all inputs provided.";
    imputedList.append(item);
    return;
  }

  for (const label of fields) {
    const item = document.createElement("li");
    item.textContent = label;
    imputedList.append(item);
  }
}

function evaluateTestCase(result) {
  if (!activeTestCase) return;

  const scoreDelta = Math.abs(result.riskScore - activeTestCase.expected_probability);
  const classMatch =
    classificationLabel(result.classification) === activeTestCase.expected_result;
  const scoreMatch = scoreDelta <= 0.002;

  if (classMatch && scoreMatch) {
    testCaseMatch.textContent = "✓ Matches expected risk score and classification";
    testCaseMatch.className = "test-case-match is-pass";
    return;
  }

  const parts = [];
  if (!classMatch) {
    parts.push(
      `classification mismatch (got ${classificationLabel(result.classification)})`
    );
  }
  if (!scoreMatch) {
    parts.push(
      `score off by ${scoreDelta.toFixed(4)} (got ${formatRiskScore(result.riskScore)})`
    );
  }
  testCaseMatch.textContent = `✗ ${parts.join("; ")}`;
  testCaseMatch.className = "test-case-match is-fail";
}

function runCalculation() {
  const result = predict(readInputs(), readAgeYears());
  hasCalculated = true;

  resultPlaceholder.hidden = true;
  resultContent.hidden = false;
  resultPanel.classList.add("has-result");

  probabilityValue.textContent = formatRiskScore(result.riskScore);
  thresholdNote.textContent = `Operating threshold: risk score ≥ ${MODEL.threshold.toFixed(2)} (raw weighted-model output; not a calibrated probability)`;

  classificationBadge.textContent = classificationLabel(result.classification);
  classificationBadge.className = `classification-badge is-${result.classification}`;

  renderImputedFields(result.imputedFields);
  renderContributions(result.contributions);
  evaluateTestCase(result);
}

function resetForm() {
  form.reset();
  hasCalculated = false;
  testCaseSelect.value = "";
  clearTestCaseBanner();

  const advancedDetails = document.getElementById("advanced-details");
  if (advancedDetails) advancedDetails.open = false;

  const testCaseDetails = document.getElementById("test-case-details");
  if (testCaseDetails) testCaseDetails.open = false;

  for (const predictor of MODEL.predictors) {
    if (predictor.type === "continuous") {
      const input = document.getElementById(`${predictor.id}-value`);
      input.disabled = false;
      input.classList.remove("is-missing");
    }
  }

  resultPlaceholder.hidden = false;
  resultContent.hidden = true;
  resultPanel.classList.remove("has-result");
}

renderForm();
populateTestCaseSelect();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runCalculation();
});

form.addEventListener("change", () => {
  clearTestCaseBanner();
});

resetButton.addEventListener("click", resetForm);
calculateButton.addEventListener("click", runCalculation);
loadTestCaseButton.addEventListener("click", () => {
  if (testCaseSelect.value) {
    loadTestCase(testCaseSelect.value);
  }
});

document.getElementById("year").textContent = String(new Date().getFullYear());
