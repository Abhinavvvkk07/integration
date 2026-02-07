import pandas as pd
import numpy as np
import random
from pathlib import Path

# ---- Config ----
N_SAMPLES = 10000
ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "data" / "synthetic_training_data.csv"

# ---- Generate features ----
data = {
    "distance_to_merchant": np.random.randint(0, 500, N_SAMPLES),   # meters
    "hour_of_day": np.random.randint(0, 24, N_SAMPLES),
    "is_weekend": np.random.choice([0, 1], N_SAMPLES),
    "budget_utilization": np.random.uniform(0, 1, N_SAMPLES),       # 0..1
    "merchant_regret_rate": np.random.uniform(0, 1, N_SAMPLES),     # 0..1
    "dwell_time": np.random.randint(0, 600, N_SAMPLES),             # seconds
}

df = pd.DataFrame(data)

# ---- Labeling logic (target) ----
def labeling_logic(row):
    score = 0.0
    if row["merchant_regret_rate"] > 0.7:
        score += 0.4
    if row["hour_of_day"] > 20:
        score += 0.2
    if row["budget_utilization"] > 0.8:
        score += 0.3
    if row["distance_to_merchant"] < 50:
        score += 0.2

    # add noise (humans aren't deterministic)
    probability = min(1.0, max(0.0, score + random.uniform(-0.1, 0.1)))
    return 1 if probability > 0.6 else 0

df["purchase_occurred"] = df.apply(labeling_logic, axis=1)

# ---- Save ----
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(OUT_PATH, index=False)

print("Data generated!")
print("Saved to:", OUT_PATH)
print("Label ratio:")
print(df["purchase_occurred"].value_counts(normalize=True))
