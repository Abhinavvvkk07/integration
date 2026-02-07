import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "data" / "user_transaction_history.csv"

# --- 1. DEFINE LOCATIONS (The "Clusters") ---
LOCATIONS = {
    "The Dive Bar": {"lat": 40.444, "lng": -79.943, "category": "Nightlife", "risk_factor": "High"},
    "Whole Foods":  {"lat": 40.456, "lng": -79.920, "category": "Grocery",   "risk_factor": "Low"},
    "Tech Store":   {"lat": 40.430, "lng": -79.950, "category": "Shopping",  "risk_factor": "Medium"}
}

# --- 2. GENERATE 3 MONTHS OF TRANSACTIONS ---
data = []
start_date = datetime.now() - timedelta(days=90)

for _ in range(50):
    merchant_name = random.choice(list(LOCATIONS.keys()))
    loc_data = LOCATIONS[merchant_name]

    days_offset = random.randint(0, 90)
    tx_time = start_date + timedelta(days=days_offset)

    if merchant_name == "The Dive Bar":
        amount = random.uniform(50, 150)
        is_regret = True
        hour = 23
    elif merchant_name == "Whole Foods":
        amount = random.uniform(20, 80)
        is_regret = False
        hour = 14
    else:
        amount = random.uniform(100, 500)
        is_regret = random.choice([True, False])
        hour = 16

    data.append({
        "merchant": merchant_name,
        "amount": round(amount, 2),
        "date": tx_time.strftime("%Y-%m-%d"),
        "hour": hour,
        "lat": loc_data["lat"],
        "lng": loc_data["lng"],
        "regret": is_regret
    })

# --- 3. SAVE TO CSV ---
df = pd.DataFrame(data)
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(OUT_PATH, index=False)

print("History Generated:", OUT_PATH)
print("\n--- SAMPLE DATA ---")
print(df.head())
