# Purchase Predictor Feature — Complete Implementation Documentation

> **Pigeon App** — Tartan Hacks 2026  
> **Feature:** Predictive Regret & Spending Danger Zones  
> **Source:** Integrated from [github.com/Abhinavvvkk07/pp_roots](https://github.com/Abhinavvvkk07/pp_roots)  
> **Target:** [github.com/Abhinavvvkk07/integration](https://github.com/Abhinavvvkk07/integration)  
> **PR:** [#1 — feat: Integrate Purchase Predictor ML Pipeline](https://github.com/Abhinavvvkk07/integration/pull/1)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [App Overview — Pigeon](#2-app-overview--pigeon)
3. [Feature Overview — Purchase Predictor](#3-feature-overview--purchase-predictor)
4. [System Architecture](#4-system-architecture)
5. [ML Pipeline](#5-ml-pipeline)
   - 5.1 [Feature Schema](#51-feature-schema)
   - 5.2 [Data Generation](#52-data-generation)
   - 5.3 [Model Training](#53-model-training)
   - 5.4 [Danger Zone Detection](#54-danger-zone-detection)
   - 5.5 [CoreML Conversion](#55-coreml-conversion)
6. [Backend Implementation](#6-backend-implementation)
   - 6.1 [Predictor Service](#61-predictor-service)
   - 6.2 [API Endpoints](#62-api-endpoints)
   - 6.3 [Graceful Degradation](#63-graceful-degradation)
7. [Frontend Implementation](#7-frontend-implementation)
   - 7.1 [API Client](#71-api-client)
   - 7.2 [State Management](#72-state-management)
   - 7.3 [PurchaseNudge Component](#73-purchasenudge-component)
   - 7.4 [DangerZoneAlert Component](#74-dangerzonealert-component)
   - 7.5 [Dashboard Integration](#75-dashboard-integration)
   - 7.6 [AI Advisor Context Enrichment](#76-ai-advisor-context-enrichment)
8. [Native iOS Implementation — Predictive Regret Service](#8-native-ios-implementation--predictive-regret-service)
   - 8.1 [Architecture Pattern](#81-architecture-pattern)
   - 8.2 [Background Infrastructure](#82-background-infrastructure)
   - 8.3 [Location Manager](#83-location-manager)
   - 8.4 [Remote Inference Service](#84-remote-inference-service)
   - 8.5 [Why This is Production-Grade](#85-why-this-is-production-grade)
9. [End-to-End Data Flow](#9-end-to-end-data-flow)
10. [API Reference](#10-api-reference)
11. [Files Added & Modified](#11-files-added--modified)
12. [Dependencies](#12-dependencies)
13. [Setup & Running](#13-setup--running)
14. [Testing & Verification](#14-testing--verification)
15. [Design Decisions & Trade-offs](#15-design-decisions--trade-offs)
16. [Technical Debt & Future Work](#16-technical-debt--future-work)

---

## 1. Executive Summary

The **Purchase Predictor** feature adds AI-powered spending nudges and geographic danger zone awareness to the Pigeon financial advisor app. It uses a trained **XGBoost classifier** (97.3% accuracy, 0.996 AUC) to predict the probability that a user will make an impulse purchase based on 6 contextual features. When the probability exceeds a configurable threshold (default 70%), the app activates a "nudge" to help the user reconsider.

Additionally, the system identifies **danger zones** — physical locations where a user has historically regretted spending — and can trigger proximity-based alerts via iOS geofencing.

The feature was integrated across all three layers of the application:
- **ML Pipeline** — Training, data generation, and model export
- **Python Backend** — Real-time XGBoost inference via FastAPI REST endpoints
- **React Native Frontend** — Dashboard components with probability gauge and danger zone cards
- **Native iOS (Swift)** — Production-grade background geofencing with remote inference (architecture spec)

---

## 2. App Overview — Pigeon

**Pigeon** is a personal finance management mobile app built with:

| Layer | Technology |
|-------|-----------|
| **Frontend** | Expo SDK 54 / React Native 0.81 / TypeScript |
| **Backend** | Python 3.12 / FastAPI / Uvicorn |
| **Database** | SQLite (Python backend) |
| **AI** | Dedalus Labs API (GPT-4o, GPT-4o-mini, Gemini 2.0 Flash) |
| **Banking** | Plaid API (sandbox) + Capital One Nessie API |
| **ML** | XGBoost 3.1 / scikit-learn 1.8 |

### Core Features
- Bank account connectivity (Plaid + Capital One Nessie)
- Financial dashboard (net worth, spending charts, budget tracking)
- AI financial advisor (streaming chat with multi-model routing)
- Onboarding personality survey with behavioral analysis
- **Purchase Predictor with danger zone detection** (this feature)

### App Navigation
```
Dashboard (index.tsx)     — Net worth, spending, budgets, predictor cards
Activity (transactions.tsx) — Transaction list grouped by date
Budget (budget.tsx)        — Budget category management
Advisor (advisor-modal.tsx) — AI chat with financial context
```

---

## 3. Feature Overview — Purchase Predictor

### What It Does

1. **Predicts purchase probability** — Given 6 contextual signals (proximity, time, budget state, merchant history, dwell time), the XGBoost model outputs a 0–100% probability that the user will make a purchase.

2. **Activates smart nudges** — When probability exceeds the threshold (70%), a nudge alert is displayed with a contextual message encouraging the user to reconsider.

3. **Identifies danger zones** — Analyzes transaction history to find geographic locations where the user frequently regrets spending. These zones are displayed on the dashboard and can trigger iOS geofence alerts.

4. **Enriches AI advisor** — Danger zone data and prediction results are injected into the AI advisor's context, enabling conversational references to spending risks.

### User-Facing Components

| Component | Location | What the User Sees |
|-----------|----------|--------------------|
| **Smart Spending Nudge** | Dashboard (below Analytics) | Probability gauge, risk level badge, nudge status, contextual message |
| **Spending Danger Zones** | Dashboard (below Nudge) | List of flagged locations with merchant names, coordinates, regret counts |
| **AI Advisor Context** | Advisor chat | The AI can reference danger zones and prediction data in responses |

---

## 4. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo / React Native)                   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Dashboard Screen (app/(tabs)/index.tsx)                        │ │
│  │    ├── PurchaseNudge         — Probability gauge + risk badges  │ │
│  │    └── DangerZoneAlert       — Flagged locations + regret data  │ │
│  └──────────────────┬──────────────────────────────────────────────┘ │
│                     │ useFinance()                                    │
│  ┌──────────────────▼──────────────────────────────────────────────┐ │
│  │  FinanceContext (lib/finance-context.tsx)                        │ │
│  │    ├── dangerZones: DangerZone[]                                │ │
│  │    ├── latestPrediction: PurchasePrediction                     │ │
│  │    ├── refreshDangerZones()                                     │ │
│  │    └── runPrediction(budgetUtil, regretRate, lat?, lng?)        │ │
│  └──────────────────┬──────────────────────────────────────────────┘ │
│                     │                                                │
│  ┌──────────────────▼──────────────────────────────────────────────┐ │
│  │  API Client (lib/predictor-service.ts)                          │ │
│  │    ├── fetchDangerZones()      → GET  /api/predictor/danger-zones│
│  │    ├── predictPurchase(input)  → POST /api/predictor/predict     │
│  │    ├── checkLocation(lat,lng)  → POST /api/predictor/check-loc   │
│  │    └── batchPredict(txns)      → POST /api/predictor/batch       │
│  └──────────────────┬──────────────────────────────────────────────┘ │
└─────────────────────┼────────────────────────────────────────────────┘
                      │ HTTP (fetch)
                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Python / FastAPI)                         │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  server_py/main.py — 4 API Endpoints                            │ │
│  │    ├── GET  /api/predictor/danger-zones                         │ │
│  │    ├── POST /api/predictor/predict                              │ │
│  │    ├── POST /api/predictor/check-location                       │ │
│  │    └── POST /api/predictor/batch-predict                        │ │
│  └──────────────────┬──────────────────────────────────────────────┘ │
│                     │                                                │
│  ┌──────────────────▼──────────────────────────────────────────────┐ │
│  │  server_py/predictor_service.py — PurchasePredictorService      │ │
│  │    ├── load()              — One-time model + data loading      │ │
│  │    ├── predict(features)   — XGBoost inference                  │ │
│  │    ├── _heuristic_predict()— Fallback when model unavailable    │ │
│  │    ├── check_danger_zone() — Haversine proximity check          │ │
│  │    └── predict_for_transaction() — Combined prediction + zone   │ │
│  └──────────────────┬──────────────┬───────────────────────────────┘ │
│                     │              │                                  │
│              ┌──────▼──────┐ ┌────▼─────────────┐                    │
│              │ XGBoost     │ │ danger_zones.json │                    │
│              │ Model (.json)│ │ (geofence data)  │                    │
│              └─────────────┘ └──────────────────┘                    │
└──────────────────────────────────────────────────────────────────────┘
                      ▲
                      │ Generated by
                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    ML PIPELINE (purchase_predictor/)                  │
│                                                                       │
│  generate_data.py ──► synthetic_training_data.csv (10K rows)         │
│  generate_history.py ──► user_transaction_history.csv (50 rows)      │
│  train.py ──► purchase_predictor.json + purchase_predictor_meta.json │
│  find_danger_zones.py ──► danger_zones.json                          │
│  convert.py ──► PurchasePredictor.mlmodel (for native iOS)           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. ML Pipeline

### 5.1 Feature Schema

All models use 6 input features. **Feature order is a critical contract** — it must be identical in training, metadata, conversion, and inference.

| # | Feature Name | Type | Range | Used in Labeling? | Description |
|---|-------------|------|-------|-------------------|-------------|
| 1 | `distance_to_merchant` | int | 0–500 | Yes (< 50 → +0.2) | Distance to merchant in meters |
| 2 | `hour_of_day` | int | 0–23 | Yes (> 20 → +0.2) | Hour in 24h format |
| 3 | `is_weekend` | binary | 0/1 | No (noise) | Whether current day is weekend |
| 4 | `budget_utilization` | float | 0.0–1.0 | Yes (> 0.8 → +0.3) | Fraction of monthly budget spent |
| 5 | `merchant_regret_rate` | float | 0.0–1.0 | Yes (> 0.7 → +0.4) | Historical regret rate for merchant |
| 6 | `dwell_time` | int | 0–600 | No (noise) | Time spent near merchant in seconds |

**Target variable:** `purchase_occurred` (binary: 0 = no, 1 = yes)

### 5.2 Data Generation

**`purchase_predictor/src/generate_data.py`**

Generates 10,000 synthetic training samples with deterministic-with-noise labeling:

```python
score = 0.0
if merchant_regret_rate > 0.7:  score += 0.4   # Strongest signal
if budget_utilization > 0.8:    score += 0.3   
if hour_of_day > 20:            score += 0.2   # Late night spending
if distance_to_merchant < 50:   score += 0.2   # Very close proximity

probability = clamp(score + uniform(-0.1, 0.1), 0, 1)
label = 1 if probability > 0.6 else 0
```

The max score is 1.1 (clamped to 1.0). The ±0.1 noise creates realistic decision boundary uncertainty. `is_weekend` and `dwell_time` are intentionally NOT used in labeling — they exist as realistic noise features that the model must learn to (mostly) ignore.

**`purchase_predictor/src/generate_history.py`**

Generates 50 synthetic transactions across 3 Pittsburgh locations:

| Merchant | Category | Risk | Regret Logic |
|----------|----------|------|-------------|
| The Dive Bar | Nightlife | High | Always regretted, hour=23 |
| Whole Foods | Grocery | Low | Never regretted, hour=14 |
| Tech Store | Shopping | Medium | 50/50 regret, hour=16 |

Output: `data/user_transaction_history.csv` with columns: `merchant, amount, date, hour, lat, lng, regret`

### 5.3 Model Training

**`purchase_predictor/src/train.py`**

| Parameter | Value |
|-----------|-------|
| Algorithm | XGBoost (`XGBClassifier`) |
| max_depth | 6 |
| n_estimators | 200 |
| learning_rate | 0.05 |
| subsample | 0.9 |
| colsample_bytree | 0.9 |
| reg_lambda | 1.0 |
| eval_metric | logloss |
| Train/Test split | 80/20, stratified |
| Nudge threshold | 0.70 |

**Training Results:**

| Metric | Value |
|--------|-------|
| Accuracy | 97.3% |
| Precision | 93.5% |
| Recall | 73.9% |
| F1 | 0.825 |
| AUC | 0.996 |

**Threshold sweep results:**

| Threshold | Precision | Recall | F1 |
|-----------|-----------|--------|-----|
| 0.50 | 0.826 | 0.864 | 0.845 |
| 0.60 | 0.897 | 0.801 | 0.847 |
| **0.70** | **0.935** | **0.739** | **0.825** |
| 0.80 | 0.955 | 0.597 | 0.734 |
| 0.90 | 0.981 | 0.301 | 0.461 |

**Output artifacts:**
- `models/purchase_predictor.json` — XGBoost model (JSON format)
- `models/purchase_predictor_meta.json` — Feature names + threshold

### 5.4 Danger Zone Detection

**`purchase_predictor/src/find_danger_zones.py`**

Algorithm:
1. Filter transactions where `regret == True`
2. Group by `(merchant, lat, lng)` and count occurrences
3. Apply threshold: `regret_count >= 1`
4. Export as JSON

**Current danger zones identified:**

```json
[
  {"merchant": "Tech Store", "lat": 40.43, "lng": -79.95, "regret_count": 10},
  {"merchant": "The Dive Bar", "lat": 40.444, "lng": -79.943, "regret_count": 21}
]
```

These coordinates are in Pittsburgh, PA and are intended for CLCircularRegion geofences on iOS.

### 5.5 CoreML Conversion

**`purchase_predictor/src/convert.py`**

Converts the XGBoost model to Apple's CoreML format (`.mlmodel`) for on-device iOS inference. The CoreML model:
- Accepts 6 `Double` inputs (same feature order)
- Outputs `purchase_occurred` (Int64) and `classProbability` (Dictionary)
- Use `classProbability[1]` for the nudge probability

> **Note:** In the current integration, CoreML is NOT used. Predictions run server-side via the Python XGBoost library. The CoreML pipeline is preserved for future native iOS on-device inference.

---

## 6. Backend Implementation

### 6.1 Predictor Service

**File:** `server_py/predictor_service.py`

A singleton service (`predictor_service`) that loads once and serves all predictions.

#### Class: `PurchasePredictorService`

**`load()`** — One-time initialization:
- Reads `purchase_predictor_meta.json` for feature names and threshold
- Loads XGBoost model from `purchase_predictor.json` via `xgb.XGBClassifier().load_model()`
- Loads `danger_zones.json` as a list of zone dictionaries
- Sets `_loaded = True` to prevent re-loading

**`predict(features: Dict) → Dict`** — Core inference:
- Orders input features to match training order (critical for tree models)
- Creates a single-row pandas DataFrame
- Calls `model.predict_proba()` to get class-1 probability
- Applies threshold (0.70) to determine `should_nudge`
- Classifies risk: `>=0.80` = high, `>=0.50` = medium, else low
- Returns: `{probability, should_nudge, risk_level, threshold, model_type}`

**`_heuristic_predict(features: Dict) → float`** — Fallback:
- Mirrors the exact labeling logic from training data generation
- Used when XGBoost isn't installed or model file is missing

**`check_danger_zone(lat, lng, radius_km=0.5) → Optional[Dict]`** — Proximity check:
- Uses the **Haversine formula** for great-circle distance calculation:
  ```
  a = sin²(Δlat/2) + cos(lat₁) × cos(lat₂) × sin²(Δlng/2)
  distance = 6371 × 2 × atan2(√a, √(1-a))
  ```
- Returns matching zone if within 0.5km radius, or None

**`predict_for_transaction(...)` → Dict** — High-level convenience:
- Auto-fills `hour_of_day` and `is_weekend` from `datetime.now()`
- Combines model prediction with danger zone proximity check
- **Danger zone risk boost:** If in a danger zone:
  - Medium risk → upgraded to High
  - Nudge activates at ≥50% (instead of ≥70%)
  - Adds `nudge_reason: "danger_zone_override"` to response

### 6.2 API Endpoints

Added to `server_py/main.py` (lines 667–779):

#### `GET /api/predictor/danger-zones`
Returns all identified danger zones.
```json
{
  "danger_zones": [
    {"merchant": "Tech Store", "lat": 40.43, "lng": -79.95, "regret_count": 10},
    {"merchant": "The Dive Bar", "lat": 40.444, "lng": -79.943, "regret_count": 21}
  ],
  "count": 2
}
```

#### `POST /api/predictor/predict`
Runs a single purchase prediction.

**Request body:**
```json
{
  "distance_to_merchant": 30,
  "budget_utilization": 0.9,
  "merchant_regret_rate": 0.8,
  "dwell_time": 300,
  "lat": 40.444,
  "lng": -79.943
}
```

**Response (high risk example):**
```json
{
  "probability": 0.9981,
  "should_nudge": true,
  "risk_level": "high",
  "threshold": 0.7,
  "model_type": "xgboost",
  "in_danger_zone": true,
  "danger_zone": {
    "merchant": "The Dive Bar",
    "lat": 40.444,
    "lng": -79.943,
    "regret_count": 21,
    "distance_km": 0.0
  }
}
```

**Response (low risk example):**
```json
{
  "probability": 0.0,
  "should_nudge": false,
  "risk_level": "low",
  "threshold": 0.7,
  "model_type": "xgboost",
  "in_danger_zone": false,
  "danger_zone": null
}
```

#### `POST /api/predictor/check-location`
Checks if coordinates are within a danger zone.

**Request:** `{"lat": 40.444, "lng": -79.943}`  
**Response:** `{"in_danger_zone": true, "danger_zone": {...}}`

#### `POST /api/predictor/batch-predict`
Runs predictions on up to 50 transactions.

**Request:** `{"transactions": [{...features...}, ...]}`  
**Response:** `{"predictions": [{...result...}, ...], "count": N}`

### 6.3 Graceful Degradation

The service is designed to never crash, even if dependencies are missing:

| Scenario | Behavior |
|----------|----------|
| XGBoost not installed | Falls back to `_heuristic_predict()` |
| Model file missing | Falls back to `_heuristic_predict()` |
| Metadata file missing | Uses hardcoded default feature names + threshold |
| Danger zones file missing | Returns empty array `[]` |
| Model prediction throws | Catches exception, falls back to heuristic |

---

## 7. Frontend Implementation

### 7.1 API Client

**File:** `lib/predictor-service.ts`

TypeScript interfaces and 4 async functions wrapping `apiRequest()`:

```typescript
interface DangerZone {
  merchant: string;
  lat: number;
  lng: number;
  regret_count: number;
  distance_km?: number;
}

interface PurchasePrediction {
  probability: number;         // 0.0–1.0
  should_nudge: boolean;       // true if >= threshold
  risk_level: "low" | "medium" | "high";
  threshold: number;           // 0.70
  model_type: "xgboost" | "heuristic";
  in_danger_zone?: boolean;
  danger_zone?: DangerZone | null;
  nudge_reason?: string;       // present if danger_zone_override
}
```

All functions have try/catch with `console.warn` and graceful null/empty returns.

### 7.2 State Management

**File:** `lib/finance-context.tsx`

New state added to `FinanceContext`:

```typescript
// State
const [dangerZones, setDangerZones] = useState<DangerZone[]>([]);
const [latestPrediction, setLatestPrediction] = useState<PurchasePrediction | null>(null);

// Functions
const refreshDangerZones = useCallback(async () => { ... }, []);
const runPrediction = useCallback(async (
  budgetUtilization: number,
  merchantRegretRate: number,
  lat?: number,
  lng?: number,
) => { ... }, []);
```

- `refreshDangerZones()` is called once on app mount
- `runPrediction()` sends a `POST /api/predictor/predict` with defaults for distance (50m) and dwell time (120s), and stores the result in `latestPrediction`

### 7.3 PurchaseNudge Component

**File:** `components/PurchaseNudge.tsx`

**Auto-prediction logic (useEffect):**
1. Waits for `transactions` and `budgets` to be available
2. Calculates `budgetUtilization = totalSpent / totalLimit`
3. Calculates `merchantRegretRate = highRegretTxns.length / allTxns.length` (where high regret = score > 50)
4. Calls `runPrediction()` automatically

**Visual elements:**
- **Header:** Risk-colored icon (flame/alert/checkmark), "ML Model" or "Heuristic" badge, refresh button
- **Probability gauge:** Horizontal bar filled to probability %, with a threshold marker line at 70%
- **Legend:** "Low" / "Nudge threshold: 70%" / "High"
- **Risk message:** 4 contextual variants:
  - Danger zone + nudge: "You're near a danger zone and likely to spend. Take a moment to reconsider."
  - Nudge only: "High purchase probability detected. Is this a planned expense?"
  - Medium risk: "Moderate spending risk. Stay mindful of your budget."
  - Low risk: "Spending risk is low. You're on track with your budget."
- **Footer badges:** Risk level pill, "Nudge Active" (yellow), "Danger Zone" (red)

**Color coding:**
- High: `#FF3D71` (red)
- Medium: `#FFE500` (yellow)
- Low: `#00E676` (green)

### 7.4 DangerZoneAlert Component

**File:** `components/DangerZoneAlert.tsx`

- Conditionally renders only when `dangerZones.length > 0`
- Yellow-tinted border to distinguish from standard cards
- Lists each zone with: location pin icon, merchant name, GPS coordinates, regret count badge
- Info bar: "AI-powered geofence alerts will nudge you near these spots"

### 7.5 Dashboard Integration

**File:** `app/(tabs)/index.tsx`

Two components added at lines 423–424, positioned in the dashboard layout:

```
Net Worth Card
Stats Row (Accounts, 7-Day Spend, Growth)
Analytics Block
├── PurchaseNudge        ← NEW
├── DangerZoneAlert      ← NEW
Spending Activity
Monthly Budget
Accounts List
```

### 7.6 AI Advisor Context Enrichment

The `getFinancialContext()` function in `finance-context.tsx` now appends:

```
Danger Zones (locations with high regret spending):
- The Dive Bar: 21 regretted purchases (40.444, -79.943)
- Tech Store: 10 regretted purchases (40.430, -79.950)

Purchase Prediction: 0% probability (low risk)
```

This enables the AI advisor chat to reference danger zones and spending risks in conversations.

---

## 8. Native iOS Implementation — Predictive Regret Service

This section documents the **production-grade architecture** for running the Purchase Predictor as a background service on iOS, using hardware-accelerated geofencing with remote inference.

### 8.1 Architecture Pattern

```
┌─────────────────────────────────────────────────────┐
│                     iPhone (Background)               │
│                                                       │
│  CLLocationManager                                    │
│    ├── CLCircularRegion("The Dive Bar", 40.444, ...)│
│    └── CLCircularRegion("Tech Store", 40.43, ...)   │
│            │                                          │
│            │ didEnterRegion (hardware interrupt)       │
│            ▼                                          │
│  LocationManager.swift                                │
│    ├── Captures 6 features                            │
│    └── Calls InferenceService                         │
│            │                                          │
│            ▼                                          │
│  InferenceService.swift                               │
│    ├── POST /api/predictor/predict                    │
│    └── if should_nudge → UNUserNotificationCenter     │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  0% CPU until geofence entry                     │ │
│  │  iOS handles monitoring at hardware level        │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────┬────────────────────────────────┘
                       │ HTTP POST (background URLSession)
                       ▼
┌──────────────────────────────────────────────────────┐
│  FastAPI Backend                                      │
│  POST /api/predictor/predict                          │
│  └── XGBoost inference + danger zone risk boost       │
└──────────────────────────────────────────────────────┘
```

**Key design:** The iPhone remains at **0% CPU** until a `didEnterRegion` hardware interrupt occurs. This avoids the "Polling Trap" of constantly checking GPS, maintaining excellent battery life.

### 8.2 Background Infrastructure

**Xcode Configuration:**
1. Enable **Background Modes** capability
2. Check **Location updates**
3. Add `NSLocationAlwaysAndWhenInUseUsageDescription` to Info.plist

**Permission Setup:**
```swift
locationManager.requestAlwaysAuthorization()
locationManager.pausesLocationUpdatesAutomatically = false
locationManager.allowsBackgroundLocationUpdates = true
```

**Geofence Registration (from danger_zones.json):**
```swift
for zone in dangerZones {
    let region = CLCircularRegion(
        center: CLLocationCoordinate2D(latitude: zone.lat, longitude: zone.lng),
        radius: 200,  // 200 meter radius
        identifier: zone.merchant
    )
    region.notifyOnEntry = true
    region.notifyOnExit = false
    locationManager.startMonitoring(for: region)
}
```

### 8.3 Location Manager

**File:** `LocationManager.swift`

```swift
func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
    guard let circularRegion = region as? CLCircularRegion else { return }
    
    // Capture 6-feature snapshot at the moment of entry
    let context: [String: Any] = [
        "distance_to_merchant": 10.0,
        "hour_of_day": Double(Calendar.current.component(.hour, from: Date())),
        "is_weekend": Calendar.current.isDateInWeekend(Date()) ? 1.0 : 0.0,
        "budget_utilization": currentBudgetUtilization,   // From local state
        "merchant_regret_rate": getMerchantRegretRate(circularRegion.identifier),
        "dwell_time": 0.0,
        "lat": circularRegion.center.latitude,
        "lng": circularRegion.center.longitude
    ]
    
    performRemoteInference(with: context, for: circularRegion.identifier)
}
```

**Integration points:**
- `budget_utilization`: Synced from the React Native layer via shared UserDefaults or local API
- `merchant_regret_rate`: Computed locally from user feedback data, adapts immediately to "Not Helpful" taps
- `dwell_time`: Starts at 0 on entry, can be updated if the user stays in the zone

### 8.4 Remote Inference Service

**File:** `InferenceService.swift`

```swift
struct PredictionResponse: Decodable {
    let probability: Double
    let should_nudge: Bool
    let risk_level: String
    let in_danger_zone: Bool?
}

func performRemoteInference(with features: [String: Any], for merchant: String) {
    let url = URL(string: "\(backendURL)/api/predictor/predict")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try? JSONSerialization.data(withJSONObject: features)

    // Use background URLSession for reliability
    URLSession.shared.dataTask(with: request) { data, _, _ in
        guard let data = data,
              let result = try? JSONDecoder().decode(PredictionResponse.self, from: data)
        else { return }
        
        if result.should_nudge {
            sendNudgeNotification(merchant: merchant, score: result.probability)
        }
    }.resume()
}

func sendNudgeNotification(merchant: String, score: Double) {
    let content = UNMutableNotificationContent()
    content.title = "Spending Alert"
    content.body = "You're near \(merchant). \(Int(score * 100))% chance of impulse purchase. Take a moment to reconsider."
    content.sound = .default
    content.categoryIdentifier = "NUDGE_CATEGORY"  // For "Not Helpful" action
    
    let request = UNNotificationRequest(
        identifier: UUID().uuidString,
        content: content,
        trigger: nil  // Deliver immediately
    )
    UNUserNotificationCenter.current().add(request)
}
```

### 8.5 Why This is Production-Grade

| Aspect | Implementation | Benefit |
|--------|---------------|---------|
| **Battery** | Hardware `CLCircularRegion` geofencing | 0% CPU until entry event |
| **Accuracy** | Full XGBoost model on server | Better than simplified CoreML |
| **Risk Boost** | Backend applies danger zone override | Lowers threshold from 70% to 50% in danger zones |
| **Personalization** | `merchant_regret_rate` is local | Adapts instantly to user feedback |
| **Reliability** | Background URLSession | Survives app backgrounding |

---

## 9. End-to-End Data Flow

```
1. ML Pipeline (offline, run once)
   ├── generate_data.py → 10K training rows
   ├── train.py → XGBoost model + metadata
   ├── generate_history.py → 50 transaction rows
   └── find_danger_zones.py → danger_zones.json

2. Server Startup
   └── predictor_service.load()
       ├── Loads XGBoost model into memory
       ├── Reads feature names + threshold from metadata
       └── Loads danger zones from JSON

3. App Opens
   └── FinanceContext mounts
       ├── refreshDangerZones() → GET /api/predictor/danger-zones
       │   └── Sets dangerZones state → DangerZoneAlert renders
       └── loadDemoData() → Sets transactions + budgets

4. Dashboard Renders
   └── PurchaseNudge useEffect fires
       ├── Calculates budgetUtilization from budget state
       ├── Calculates merchantRegretRate from transaction regretScores
       └── runPrediction() → POST /api/predictor/predict
           └── Backend: predict_for_transaction()
               ├── Auto-fills hour_of_day, is_weekend
               ├── XGBoost predict_proba() → probability
               ├── Checks danger zone proximity (if lat/lng provided)
               └── Returns full prediction object
           └── Sets latestPrediction → PurchaseNudge renders gauge

5. iOS Background (native, future)
   └── CLLocationManager monitors geofences
       └── didEnterRegion fires
           ├── Captures 6 features
           └── POST /api/predictor/predict
               └── if should_nudge → Push notification
```

---

## 10. API Reference

### Base URL
```
http://<YOUR_IP>:5001
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check — returns `{"ok": true}` |
| GET | `/api/predictor/danger-zones` | List all danger zones |
| POST | `/api/predictor/predict` | Single purchase prediction |
| POST | `/api/predictor/check-location` | Danger zone proximity check |
| POST | `/api/predictor/batch-predict` | Batch predictions (max 50) |

### Prediction Input Schema

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `distance_to_merchant` | float | No | 100 | Meters to merchant |
| `budget_utilization` | float | No | 0.5 | Budget spent ratio (0–1) |
| `merchant_regret_rate` | float | No | 0.0 | Historical regret rate (0–1) |
| `dwell_time` | float | No | 0 | Seconds near merchant |
| `lat` | float | No | null | Latitude (for zone check) |
| `lng` | float | No | null | Longitude (for zone check) |

### Prediction Output Schema

| Field | Type | Description |
|-------|------|-------------|
| `probability` | float | Purchase probability (0.0–1.0) |
| `should_nudge` | bool | Whether to activate nudge |
| `risk_level` | string | "low", "medium", or "high" |
| `threshold` | float | Current nudge threshold (0.70) |
| `model_type` | string | "xgboost" or "heuristic" |
| `in_danger_zone` | bool | Whether location is in a danger zone |
| `danger_zone` | object/null | Matching zone details if applicable |
| `nudge_reason` | string | Present if "danger_zone_override" |

---

## 11. Files Added & Modified

### New Files (14)

| File | Lines | Purpose |
|------|-------|---------|
| `server_py/predictor_service.py` | 261 | Core prediction service |
| `lib/predictor-service.ts` | 113 | Frontend API client |
| `components/PurchaseNudge.tsx` | 353 | Smart nudge dashboard card |
| `components/DangerZoneAlert.tsx` | 173 | Danger zone dashboard card |
| `purchase_predictor/src/generate_data.py` | 42 | Training data generator |
| `purchase_predictor/src/generate_history.py` | 57 | Transaction history generator |
| `purchase_predictor/src/train.py` | 97 | XGBoost model training |
| `purchase_predictor/src/find_danger_zones.py` | 26 | Danger zone identification |
| `purchase_predictor/src/convert.py` | 50 | XGBoost → CoreML conversion |
| `purchase_predictor/src/train_sklearn_coreml.py` | 39 | Alternative sklearn pipeline |
| `purchase_predictor/src/convert_sklearn_coreml.py` | 29 | Sklearn → CoreML conversion |
| `purchase_predictor/requirements.txt` | 5 | ML pipeline dependencies |
| `purchase_predictor/data/danger_zones.json` | 1 | Danger zone coordinates |
| `purchase_predictor/models/purchase_predictor_meta.json` | 13 | Model metadata |

### Modified Files (4)

| File | Changes | Purpose |
|------|---------|---------|
| `server_py/main.py` | +115 lines (667–779) | 4 API endpoints + startup hook |
| `lib/finance-context.tsx` | +73 lines | State, functions, context enrichment |
| `app/(tabs)/index.tsx` | +5 lines | Component imports + placement |
| `pyproject.toml` | +5 lines | ML dependencies |

### Generated Artifacts (from pipeline execution)

| File | Size | Description |
|------|------|-------------|
| `purchase_predictor/models/purchase_predictor.json` | ~525 KB | Trained XGBoost model |
| `purchase_predictor/data/synthetic_training_data.csv` | ~500 KB | 10,000 training rows |
| `purchase_predictor/data/user_transaction_history.csv` | ~3 KB | 50 transaction rows |

---

## 12. Dependencies

### Python (added to `pyproject.toml`)

| Package | Version | Purpose |
|---------|---------|---------|
| `pandas` | >=2.0.0 | DataFrame for model input |
| `numpy` | >=1.24.0 | Numerical operations |
| `scikit-learn` | >=1.3.0 | Train/test split, metrics |
| `xgboost` | >=2.0.0 | ML model training + inference |

### Frontend

No new npm dependencies — uses existing `@tanstack/react-query`, Expo components, and React Native primitives.

### iOS Native (for future implementation)

| Framework | Purpose |
|-----------|---------|
| `CoreLocation` | CLCircularRegion geofencing |
| `UserNotifications` | Push notification delivery |
| `Foundation` | URLSession for background HTTP |

---

## 13. Setup & Running

### Prerequisites
- Node.js v23+ and npm v10+
- Python 3.12+
- Expo Go app on iPhone (for mobile testing)

### Initial Setup
```bash
cd /Users/abhinavkumar/Desktop/integration

# Install Node.js dependencies
npm install

# Create Python venv and install dependencies
python3 -m venv .venv
./.venv/bin/pip install fastapi httpx plaid-python sse-starlette uvicorn \
  google-genai google-api-python-client python-dotenv openai \
  pandas numpy scikit-learn xgboost
```

### Run ML Pipeline (one-time)
```bash
./.venv/bin/python purchase_predictor/src/generate_data.py
./.venv/bin/python purchase_predictor/src/generate_history.py
./.venv/bin/python purchase_predictor/src/train.py
./.venv/bin/python purchase_predictor/src/find_danger_zones.py
```

### Start Backend Server
```bash
PORT=5001 ./.venv/bin/python server_py/main.py
```

### Start Expo (for mobile)
```bash
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_IP>:5001 \
REACT_NATIVE_PACKAGER_HOSTNAME=<YOUR_IP> \
npx expo start --lan -c
```

### Environment Variables (`.env`)
```
EXPO_PUBLIC_API_BASE_URL=http://<YOUR_IP>:5001
EXPO_PUBLIC_DEMO_MODE=1
EXPO_PUBLIC_DEDALUS_API_KEY=placeholder_for_testing
PORT=5001
```

---

## 14. Testing & Verification

### Backend API Tests

```bash
# Health check
curl http://localhost:5001/health
# → {"ok":true}

# Danger zones
curl http://localhost:5001/api/predictor/danger-zones
# → {"danger_zones": [...], "count": 2}

# High-risk prediction (near danger zone, late night, high budget usage)
curl -X POST http://localhost:5001/api/predictor/predict \
  -H "Content-Type: application/json" \
  -d '{"distance_to_merchant":30,"budget_utilization":0.9,"merchant_regret_rate":0.8,"dwell_time":300,"lat":40.444,"lng":-79.943}'
# → {"probability":0.9981,"should_nudge":true,"risk_level":"high","in_danger_zone":true,...}

# Low-risk prediction (far away, low budget usage)
curl -X POST http://localhost:5001/api/predictor/predict \
  -H "Content-Type: application/json" \
  -d '{"distance_to_merchant":400,"budget_utilization":0.2,"merchant_regret_rate":0.1,"dwell_time":10}'
# → {"probability":0.0,"should_nudge":false,"risk_level":"low","in_danger_zone":false,...}

# Location check
curl -X POST http://localhost:5001/api/predictor/check-location \
  -H "Content-Type: application/json" \
  -d '{"lat":40.444,"lng":-79.943}'
# → {"in_danger_zone":true,"danger_zone":{...}}
```

### Frontend Verification (Expo Go)

1. Open app → Complete onboarding survey (or use demo data)
2. Dashboard loads → Scroll down past Analytics Block
3. **Smart Spending Nudge** card should appear with probability gauge
4. **Spending Danger Zones** card should show 2 locations
5. Tap refresh button on nudge card → prediction re-runs
6. Pull down to refresh entire dashboard

---

## 15. Design Decisions & Trade-offs

| Decision | Rationale |
|----------|-----------|
| **Server-side XGBoost** over CoreML on-device | Works on iOS + Android + Web; no Xcode required; full model fidelity |
| **Heuristic fallback** when model unavailable | Zero-downtime degradation; mirrors training logic exactly |
| **Singleton predictor service** | One-time model load; O(1) memory; thread-safe reads |
| **6 features with 2 noise features** | `is_weekend` and `dwell_time` test model robustness to irrelevant signals |
| **0.70 threshold** | Optimizes for precision (93.5%) to minimize false nudge alarms |
| **Danger zone risk boost** | Lowers threshold to 0.50 in high-regret locations; defense-in-depth |
| **Feature order as contract** | XGBoost tree ensembles are column-order dependent; enforced via metadata JSON |
| **Auto-prediction on dashboard** | Runs once when transactions/budgets load; no user action needed |

---

## 16. Technical Debt & Future Work

### Current Limitations

| Issue | Priority | Description |
|-------|----------|-------------|
| Synthetic data only | Medium | All training data is generated; replace with real user data |
| No model versioning | Medium | Models overwritten in place; add MLflow or timestamps |
| No automated tests | Medium | Add pytest for prediction, API endpoints, data validation |
| Path in `generate_history.py` | Low | Fixed in integration, but was originally inconsistent |
| Two competing CoreML pipelines | Low | Both `convert.py` and `convert_sklearn_coreml.py` write to same output |
| Threshold not in CoreML | Low | Must be applied separately on iOS; not embedded in model |

### Future Enhancements

| Feature | Description |
|---------|-------------|
| **User feedback loop** | "Not Helpful" on notifications updates local `merchant_regret_rate` and sends retraining signal |
| **Real GPS integration** | Use `expo-location` to get actual coordinates for live danger zone checks |
| **Dwell time tracking** | Measure how long user stays near a merchant; update prediction in real-time |
| **Native iOS geofencing** | Implement the Swift `LocationManager` + `InferenceService` architecture from Section 8 |
| **Model retraining** | Backend endpoint to accept feedback data and retrain XGBoost incrementally |
| **A/B threshold testing** | Expose threshold as a remote config; test different values per user cohort |

---

*Generated: February 7, 2026*  
*Repository: github.com/Abhinavvvkk07/integration*  
*Branch: feature/purchase-predictor-integration*  
*PR: #1*
