# HYPER-SCREEN

Web calculator for the pediatric critical care **hyperinflammatory vs hypoinflammatory** subphenotype classifier from the multi-cohort ML paper.

**Live site:** [https://hyper-screen-tool.github.io/](https://hyper-screen-tool.github.io/)

## What it does

- Implements the **elastic-net penalized logistic regression** model trained on **CAF-PINT, PALI, and REDVENT** pediatric cohorts
- Uses the published **lambda.min coefficients** and **0.70 operating threshold** on the **risk score** (weighted training scale)
- Supports **missing inputs** via PRISM/PELOD healthy-range midpoint imputation (age-stratified where applicable) and derivation-cohort median for weight, matching the primary manuscript analysis
- Runs entirely in the browser — no patient data is sent to a server

## Model summary

| Setting | Value |
| --- | ---: |
| Derivation cohorts | CAF-PINT, PALI, REDVENT |
| Predictors (non-zero at λ<sub>min</sub>) | 18 (locked model) |
| Elastic-net α | 0.15 |
| Positive-class weight | 5.5 |
| Operating threshold (risk score) | 0.70 |
| Displayed output | Risk score (0–1) |
| Missing data | PRISM/PELOD midpoint imputation (+ derivation median for weight) |

Coefficients are the locked 18-predictor model used in the manuscript and the Tanzania external validation (`datasheets/published_18_predictors.txt` in `CPCCRN analyses ML model`), stored in [`assets/model/coefficients.json`](assets/model/coefficients.json). Regenerate coefficients and R-scored test cases with `Rscript scripts/export_locked18_web_params.R`, then check with `node scripts/validate-model.mjs` and `node scripts/validate-test-cases.mjs`.

| Group | Predictors |
| --- | --- |
| PRISM-III (6) | Low PaO₂, high BUN, pH, potassium, high temperature, bicarbonate |
| PELOD (5) | White blood cell count, platelets, prothrombin time, heart rate, lactate |
| Clinical characteristics (5) | Vasopressor use, inpatient admission, postoperative admission, previous admission, malignancy |
| Demographics (2) | Weight, male sex |

## Local preview

```bash
cd "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Website"
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). ES modules require a local server (not `file://`).

## Publish to GitHub Pages

```bash
./scripts/publish-to-hyper-screen-tool-github-io.sh
```

Site URL: https://hyper-screen-tool.github.io/

## Project structure

```text
.
├── index.html              # Calculator UI
├── css/style.css
├── js/
│   ├── model-config.js     # Coefficients, medians, labels
│   ├── calculator.js       # Scoring logic
│   ├── imputation.js       # PRISM/PELOD midpoint imputation
│   └── app.js              # Form + results UI
├── assets/model/
│   └── coefficients.json   # Machine-readable model spec
└── .github/workflows/
    └── pages.yml           # GitHub Pages deploy
```

## Clinical disclaimer

HYPER-SCREEN is a **research decision-support tool**, not a substitute for clinical judgment. For screening enrichment and research use only.

## Citation

If you use this tool, please cite the associated Sapru Lab manuscript when available.
