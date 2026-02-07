from pathlib import Path
import joblib
import coremltools as ct

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "models"

MODEL_FILE = MODELS / "purchase_predictor_sklearn.joblib"
OUT_FILE = MODELS / "PurchasePredictor.mlmodel"

print("Loading:", MODEL_FILE)
model = joblib.load(MODEL_FILE)

# Use coremltools sklearn converter
mlmodel = ct.converters.sklearn.convert(
    model,
    input_features=[
        ("distance_to_merchant", ct.models.datatypes.Double()),
        ("hour_of_day", ct.models.datatypes.Double()),
        ("is_weekend", ct.models.datatypes.Double()),
        ("budget_utilization", ct.models.datatypes.Double()),
        ("merchant_regret_rate", ct.models.datatypes.Double()),
        ("dwell_time", ct.models.datatypes.Double()),
    ],
)

mlmodel.save(str(OUT_FILE))
print("Saved CoreML model:", OUT_FILE)
