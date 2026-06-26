import { MODEL } from "./model-config.js";
import {
  predict,
  formatProbability,
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

let hasCalculated = false;

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
  input.placeholder = predictor.placeholder;
  input.step = String(predictor.step ?? "any");
  if (predictor.min != null) input.min = String(predictor.min);
  if (predictor.max != null) input.max = String(predictor.max);
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
    if (hasCalculated) runCalculation();
  });

  input.addEventListener("input", () => {
    if (input.value !== "") {
      missing.checked = false;
      input.disabled = false;
      input.classList.remove("is-missing");
    }
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
    if (hasCalculated) runCalculation();
  });

  field.append(label, options);
  return field;
}

function renderForm() {
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

function readInputs() {
  const inputs = {};

  for (const predictor of MODEL.predictors) {
    if (predictor.type === "continuous") {
      const missing = document.getElementById(`${predictor.id}-missing`);
      const input = document.getElementById(`${predictor.id}-value`);
      const imputed = missing.checked || input.value === "";
      const value = imputed
        ? predictor.median
        : Number.parseFloat(input.value);

      inputs[predictor.id] = {
        value: Number.isFinite(value) ? value : predictor.median,
        imputed,
      };
      continue;
    }

    const selected = form.querySelector(`input[name="${predictor.id}"]:checked`);
    const imputed = !selected || selected.value === "missing";
    const value = imputed ? predictor.median : Number(selected.value);

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

function runCalculation() {
  const result = predict(readInputs());
  hasCalculated = true;

  resultPlaceholder.hidden = true;
  resultContent.hidden = false;
  resultPanel.classList.add("has-result");

  probabilityValue.textContent = formatProbability(result.probability);
  thresholdNote.textContent = `Classification threshold: probability ≥ ${(MODEL.threshold * 100).toFixed(0)}%`;

  classificationBadge.textContent = classificationLabel(result.classification);
  classificationBadge.className = `classification-badge is-${result.classification}`;

  renderImputedFields(result.imputedFields);
  renderContributions(result.contributions);
}

function resetForm() {
  form.reset();
  hasCalculated = false;

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

form.addEventListener("submit", (event) => {
  event.preventDefault();
  runCalculation();
});

resetButton.addEventListener("click", resetForm);
calculateButton.addEventListener("click", runCalculation);

document.getElementById("year").textContent = String(new Date().getFullYear());
