import os
import json
import pandas as pd
import xgboost as xgb
from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
)

# ----------------------------
# Config
# ----------------------------
ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "synthetic_training_data.csv"
MODEL_PATH = ROOT / "models" / "purchase_predictor.json"
META_PATH = ROOT / "models" / "purchase_predictor_meta.json"

DEFAULT_THRESHOLD = 0.70

# ----------------------------
# 1) Load data
# ----------------------------
df = pd.read_csv(DATA_PATH)

TARGET = "purchase_occurred"
FEATURES = [c for c in df.columns if c != TARGET]

X = df[FEATURES]
y = df[TARGET]

print(f"Loaded {len(df)} rows")
print("Label distribution:")
print(y.value_counts(normalize=True).rename("ratio"))

# ----------------------------
# 2) Train/test split (stratified)
# ----------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y,
)

# ----------------------------
# 3) Train XGBoost
# ----------------------------
model = xgb.XGBClassifier(
    max_depth=6,
    learning_rate=0.05,
    n_estimators=200,
    subsample=0.9,
    colsample_bytree=0.9,
    reg_lambda=1.0,
    eval_metric="logloss",
    random_state=42,
)

print("\nTraining model...")
model.fit(X_train, y_train)

# ----------------------------
# 4) Evaluate
# ----------------------------
probs = model.predict_proba(X_test)[:, 1]
threshold = DEFAULT_THRESHOLD
preds = (probs >= threshold).astype(int)

acc = accuracy_score(y_test, preds)
prec = precision_score(y_test, preds, zero_division=0)
rec = recall_score(y_test, preds, zero_division=0)
f1 = f1_score(y_test, preds, zero_division=0)
auc = roc_auc_score(y_test, probs)
cm = confusion_matrix(y_test, preds)

print(f"\n--- Metrics (threshold={threshold:.2f}) ---")
print(f"Accuracy : {acc:.3f}")
print(f"Precision: {prec:.3f}")
print(f"Recall   : {rec:.3f}")
print(f"F1       : {f1:.3f}")
print(f"AUC      : {auc:.3f}")
print(f"\nConfusion Matrix:\n{cm}")
print(f"\n{classification_report(y_test, preds, zero_division=0)}")

# ----------------------------
# 5) Save model + metadata
# ----------------------------
MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
model.save_model(str(MODEL_PATH))

meta = {
    "model_type": "xgboost",
    "feature_names": FEATURES,
    "threshold": threshold,
    "notes": "Probability threshold used for nudges. Keep feature order consistent at inference.",
}
with open(META_PATH, "w") as f:
    json.dump(meta, f, indent=2)

print(f"\nSaved model to: {MODEL_PATH}")
print(f"Saved metadata to: {META_PATH}")
