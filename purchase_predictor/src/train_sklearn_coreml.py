from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
import joblib

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "synthetic_training_data.csv"
MODELS = ROOT / "models"
MODELS.mkdir(exist_ok=True)

df = pd.read_csv(DATA)
X = df.drop("purchase_occurred", axis=1)
y = df["purchase_occurred"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = Pipeline([
    ("scaler", StandardScaler()),
    ("lr", LogisticRegression(max_iter=2000, class_weight="balanced"))
])

print("Training LogisticRegression (CoreML-friendly)...")
model.fit(X_train, y_train)

probs = model.predict_proba(X_test)[:, 1]
threshold = 0.70
preds = (probs >= threshold).astype(int)

print(f"Accuracy : {accuracy_score(y_test, preds):.3f}")
print(f"Precision: {precision_score(y_test, preds, zero_division=0):.3f}")
print(f"Recall   : {recall_score(y_test, preds, zero_division=0):.3f}")
print(f"F1       : {f1_score(y_test, preds, zero_division=0):.3f}")
print(f"AUC      : {roc_auc_score(y_test, probs):.3f}")

out = MODELS / "purchase_predictor_sklearn.joblib"
joblib.dump(model, out)
print("Saved:", out)
