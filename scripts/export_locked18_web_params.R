#!/usr/bin/env Rscript
# Export HYPER-SCREEN web parameters for the locked 18-predictor elastic-net
# (CAF-PINT + PALI + REDvent; alpha 0.15; class weight 5.5; lambda.min) and
# R-scored test cases. Same fit as the Tanzania locked analysis.
#
# Usage: Rscript scripts/export_locked18_web_params.R

suppressPackageStartupMessages({
  library(data.table)
  library(dplyr)
  library(glmnet)
  library(jsonlite)
})

WEB <- path.expand("~/Desktop/Sapru Lab Materials/ML PAPER/Website")
ML_DIR <- path.expand("~/Desktop/Sapru Lab Materials/ML PAPER/CPCCRN analyses ML model")
setwd(ML_DIR)
source("classifier_core.R")
source("prism_peleod_normal_imputation.R")

DERIVATION <- c("cafpint", "pali", "redvent")
THR <- 0.70

predictors <- trimws(readLines("datasheets/published_18_predictors.txt", warn = FALSE))
predictors <- predictors[nzchar(predictors) & !startsWith(predictors, "#")]
stopifnot(length(predictors) == 18L)

df <- load_dataset_csv("datasheets/_all_with_fixed_vars.csv")
candidates <- setdiff(get_predictor_names(df), clove_excluded_predictors())
df_imp <- primary_impute_all(df, candidates, derivation_studies = DERIVATION)

fit <- fit_elastic_net(df_imp, predictors, DERIVATION, 0.15, 10L, 5.5, 0L)$model
cf <- as.matrix(coef(fit, s = "lambda.min"))[, 1]
stopifnot(all(cf[predictors] != 0))

train_df <- df_imp %>% filter(study %in% DERIVATION)
deriv_medians <- vapply(predictors, function(p) stats::median(train_df[[p]], na.rm = TRUE), numeric(1))
lut <- get_prism_peleod_normal_lookup()

payload <- list(
  model = "HYPER-SCREEN locked 18-predictor elastic-net (primary midpoint imputation)",
  version = "2.0.0",
  output_label = "risk_score",
  output_note = "Model output on the weighted training scale (class_weight 5.5). Classification uses risk score >= 0.70.",
  classification_threshold = THR,
  derivation_cohorts = DERIVATION,
  hyperparameters = list(alpha = 0.15, lambda = "lambda.min", class_weight = 5.5, nfolds = 10, seed = 0),
  imputation = list(
    primary = "PRISM/PELOD healthy-range midpoint (age-stratified where applicable)",
    non_prism = "derivation-cohort median (CAFPINT, PALI, REDVENT)"
  ),
  intercept = unname(cf["(Intercept)"]),
  predictors = lapply(predictors, function(id) list(
    id = id,
    coefficient = unname(cf[id]),
    derivationMedian = unname(deriv_medians[id]),
    imputation = if (id %in% lut$variable) "prism_peleod_mid" else "derivation_median"
  )),
  prism_peleod_lookup = lut
)
write_json(payload, file.path(WEB, "assets/model/coefficients.json"),
           pretty = TRUE, auto_unbox = TRUE, digits = 10)

score <- function(rows) as.numeric(predict_prob(fit, as.matrix(rows[, predictors, drop = FALSE])))
age_of <- function(r) if ("ageyrs" %in% names(r) && !is.na(r$ageyrs[1])) r$ageyrs[1] else NA_real_

make_case <- function(row, id, label, category, prob, missing_vars = character()) {
  inputs <- lapply(predictors, function(p) {
    if (p %in% missing_vars) list(missing = TRUE) else list(value = row[[p]][1], missing = FALSE)
  })
  names(inputs) <- predictors
  list(
    id = id, label = label, category = category,
    expected_probability = round(prob, 4),
    expected_result = if (prob >= THR) "Hyperinflammatory" else "Hypoinflammatory",
    ageyrs = age_of(row), study = row$study[1], patient_id = row$id[1],
    true_lca = row$lca[1], inputs = inputs
  )
}

val <- df_imp %>% filter(study %in% c("cpccrn", "chop"))
val$prob <- score(val)

pick_spaced <- function(pool, n) {
  pool <- pool[order(pool$prob), ]
  idx <- unique(round(seq(1, nrow(pool), length.out = n)))
  pool[idx, ]
}
hyper <- pick_spaced(val %>% filter(prob >= THR), 6)
hypo <- pick_spaced(val %>% filter(prob < THR), 6)

cases <- list()
for (i in seq_len(nrow(hyper))) {
  r <- hyper[i, ]
  cases[[length(cases) + 1]] <- make_case(r, sprintf("val_hyper_%d", i),
    sprintf("High-score example #%d (score %.2f)", i, r$prob), "complete", r$prob)
}
for (i in seq_len(nrow(hypo))) {
  r <- hypo[i, ]
  cases[[length(cases) + 1]] <- make_case(r, sprintf("val_hypo_%d", i),
    sprintf("Low-score example #%d (score %.2f)", i, r$prob), "complete", r$prob)
}

# Missing-data cases: blank selected inputs on the raw row, then re-impute in R.
missing_case <- function(src, vars, id, label) {
  raw_row <- df %>% filter(study == src$study[1], id == src$id[1])
  for (v in vars) raw_row[[v]] <- NA_real_
  tmp <- bind_rows(df, raw_row)
  tmp_imp <- primary_impute_all(tmp, candidates, derivation_studies = DERIVATION)
  sim <- tmp_imp[nrow(tmp_imp), , drop = FALSE]
  make_case(sim, id, label, "missing", score(sim), missing_vars = vars)
}
cases[[length(cases) + 1]] <- missing_case(hyper[nrow(hyper), ], c("pelodlact", "prismph"),
  "val_missing_lact_ph", "Lactate & pH imputed")
cases[[length(cases) + 1]] <- missing_case(hyper[ceiling(nrow(hyper) / 2), ], c("pelodpt", "prismpao2lo"),
  "val_missing_pt_pao2", "Prothrombin time & PaO2 imputed")
cases[[length(cases) + 1]] <- missing_case(hypo[ceiling(nrow(hypo) / 2), ],
  c("pelodpt", "prismpao2lo", "pelodlact", "prismbunhi", "bicarb"),
  "val_missing_labs", "Several labs imputed")

write_json(list(test_cases = cases), file.path(WEB, "assets/model/test-cases.json"),
           pretty = TRUE, auto_unbox = TRUE, digits = 10, na = "null")

cat(sprintf("Intercept %.6f; %d predictors; %d test cases\n", cf["(Intercept)"], length(predictors), length(cases)))
