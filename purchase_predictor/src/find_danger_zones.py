import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "user_transaction_history.csv"
OUT_PATH = ROOT / "data" / "danger_zones.json"

# 1. Load the History
df = pd.read_csv(DATA_PATH)

# 2. FILTER: Isolate "High Regret" Transactions
regret_tx = df[df['regret'] == True]

# 3. CLUSTER: Group by Location (Lat/Lng)
danger_zones = regret_tx.groupby(['merchant', 'lat', 'lng']).size().reset_index(name='regret_count')

# 4. THRESHOLD: Only flag places with >= 1 regret
confirmed_danger_zones = danger_zones[danger_zones['regret_count'] >= 1]

print("\nIDENTIFIED DANGER ZONES")
print("These coordinates should be sent to the iPhone to create Geofences:")
print("-" * 60)
print(confirmed_danger_zones[['merchant', 'lat', 'lng', 'regret_count']])

# 5. Export for the App
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
confirmed_danger_zones.to_json(OUT_PATH, orient="records")
print(f"\nSaved to: {OUT_PATH}")
