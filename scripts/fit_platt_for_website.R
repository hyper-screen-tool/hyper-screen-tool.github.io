#!/usr/bin/env Rscript
# Fit Platt a,b using the exact HYPER-SCREEN website coefficients on derivation.
suppressPackageStartupMessages({
  library(data.table)
  library(dplyr)
  library(jsonlite)
})

WEB <- "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Website"
CLOVE <- "/Users/ctang/Desktop/Sapru Lab Materials/ML PAPER/Clove OG Model Final Boss"
setwd(CLOVE)
source("classifier_core.R")

coef_json <- fromJSON(file.path(WEB, "assets/model/coefficients.json"))
intercept <- coef_json$intercept
pred_ids <- coef_json$predictors$id
pred_coefs <- setNames(coef_json$predictors$coefficient, pred_ids)

df <- load_dataset_csv("datasheets/_all_with_fixed_vars.csv")
candidates <- get_predictor_names(df)
df_imp <- primary_impute_all(df, candidates, derivation_studies = c("cafpint", "pali", "redvent"))
deriv <- df_imp %>% filter(study %in% c("cafpint", "pali", "redvent"))

# linear predictor from website coefficients
eta <- intercept
for (id in pred_ids) {
  if (!id %in% names(deriv)) stop("Missing predictor: ", id)
  eta <- eta + pred_coefs[[id]] * as.numeric(deriv[[id]])
}
p_raw <- plogis(eta)
p_raw <- pmin(pmax(p_raw, 1e-6), 1 - 1e-6)

fit <- glm(deriv$lca ~ qlogis(p_raw), family = binomial())
a0 <- unname(coef(fit)[1])
b0 <- unname(coef(fit)[2])
cat(sprintf("website-matched Platt: intercept=%.10f slope=%.10f\n", a0, b0))
cat(sprintf("manuscript CSV:        intercept=%.10f slope=%.10f\n",
            -1.72970771099924, 1.22104384616965))

# also check validation mean after platt
val <- df_imp %>% filter(study %in% c("cpccrn", "chop"))
eta_v <- intercept
for (id in pred_ids) eta_v <- eta_v + pred_coefs[[id]] * as.numeric(val[[id]])
p_v <- pmin(pmax(plogis(eta_v), 1e-6), 1 - 1e-6)
p_cal <- plogis(a0 + b0 * qlogis(p_v))
cat(sprintf("valid raw mean=%.4f cal mean=%.4f prevalence=%.4f\n",
            mean(p_v), mean(p_cal), mean(val$lca)))
