# HYPER-SCREEN

Web calculator for the pediatric critical care **hyperinflammatory vs hypoinflammatory** subphenotype classifier from the multi-cohort ML paper.

**Live site:** [https://hyper-screen-tool.github.io/](https://hyper-screen-tool.github.io/)

## What it does

- Implements the **elastic-net penalized logistic regression** model trained on **CAFPINT, PALI, and REDVENT**
- Uses the published **lambda.min coefficients** and **0.70 classification threshold**
- Supports **missing inputs** via median imputation (same strategy as model development)
- Runs entirely in the browser — no patient data is sent to a server

## Model summary

| Setting | Value |
| --- | ---: |
| Derivation cohorts | CAFPINT, PALI, REDVENT |
| Predictors (non-zero at λ<sub>min</sub>) | 18 |
| Elastic-net α | 0.15 |
| Positive-class weight | 5.5 |
| Classification threshold | 0.70 |
| Missing data | Median imputation |

Coefficients match `classifier_coefficients_clove model.csv` from the stepwise → elastic-net validation pipeline and are stored in [`assets/model/coefficients.json`](assets/model/coefficients.json).


## Project structure

```text
.
├── index.html              # Calculator UI
├── css/style.css
├── js/
│   ├── model-config.js     # Coefficients, medians, labels
│   ├── calculator.js       # Scoring logic
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
