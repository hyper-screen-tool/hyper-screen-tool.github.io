# HYPER-SCREEN

Web calculator for the pediatric critical care **hyperinflammatory vs hypoinflammatory** subphenotype classifier from the multi-cohort ML paper.

**Live site:** [https://hyper-screen-tool.github.io/](https://hyper-screen-tool.github.io/)

## What it does

- Implements the **elastic-net penalized logistic regression** model trained on **CAF-PINT, PALI, and REDVENT** pediatric cohorts
- Uses the published **lambda.min coefficients** and **0.70 operating threshold** on the **raw risk score** (weighted training scale; not a calibrated probability)
- Supports **missing inputs** via PRISM/PELOD healthy-range midpoint imputation (age-stratified where applicable) and derivation-cohort median for weight, matching the primary manuscript analysis
- Runs entirely in the browser — no patient data is sent to a server

## Model summary

| Setting | Value |
| --- | ---: |
| Derivation cohorts | CAF-PINT, PALI, REDVENT |
| Predictors (non-zero at λ<sub>min</sub>) | 19 |
| Elastic-net α | 0.15 |
| Positive-class weight | 5.5 |
| Operating threshold (raw risk score) | 0.70 |
| Displayed output | Risk score (0–1) + Platt-calibrated probability |
| Platt intercept / slope | −1.7419 / 1.2515 (derivation in-sample) |
| Missing data | PRISM/PELOD midpoint imputation (+ derivation median for weight) |

Coefficients match `classifier_coefficients_clove model.csv` from the stepwise → elastic-net validation pipeline and are stored in [`assets/model/coefficients.json`](assets/model/coefficients.json).

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
