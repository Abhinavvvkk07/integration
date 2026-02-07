import json
import coremltools as ct
import xgboost as xgb
from pathlib import Path

# ---- Paths ----
ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "purchase_predictor.json"
META_PATH = ROOT / "models" / "purchase_predictor_meta.json"
OUTPUT_PATH = ROOT / "models" / "PurchasePredictor.mlmodel"

# ---- Load metadata ----
with open(META_PATH) as f:
    meta = json.load(f)

feature_names = meta["feature_names"]
print(f"Features: {feature_names}")

# ---- Load the trained XGBoost booster ----
booster = xgb.Booster()
booster.load_model(str(MODEL_PATH))
print("Loaded XGBoost model")

# ---- Convert to CoreML ----
coreml_model = ct.converters.xgboost.convert(
    booster,
    feature_names=feature_names,
    target="purchase_occurred",
    force_32bit_float=True,
    mode="classifier",
    class_labels=[0, 1],
)

# ---- Add model metadata (visible in Xcode) ----
coreml_model.author = "Purchase Predictor"
coreml_model.short_description = (
    "Predicts whether a user will make a purchase based on contextual signals."
)
coreml_model.input_description["distance_to_merchant"] = "Distance to merchant in meters"
coreml_model.input_description["hour_of_day"] = "Hour of the day (0-23)"
coreml_model.input_description["is_weekend"] = "Whether it is a weekend (0 or 1)"
coreml_model.input_description["budget_utilization"] = "Budget utilization ratio (0.0-1.0)"
coreml_model.input_description["merchant_regret_rate"] = "Merchant regret rate (0.0-1.0)"
coreml_model.input_description["dwell_time"] = "Dwell time in seconds"

# ---- Save ----
coreml_model.save(str(OUTPUT_PATH))
print(f"\nConverted to CoreML: {OUTPUT_PATH}")
