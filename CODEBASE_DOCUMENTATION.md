# Pigeon (Tartan-Hacks-2026) — Comprehensive Codebase Documentation

> **Purpose of this document:** Enable another AI agent (or developer) to fully understand the codebase structure, functionality, dependencies, and design decisions so it can effectively merge this repository with another.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Design Principles](#2-architecture--design-principles)
3. [Technology Stack](#3-technology-stack)
4. [Directory Structure](#4-directory-structure)
5. [Frontend — Expo / React Native](#5-frontend--expo--react-native)
   - 5.1 [Root Layout & Providers](#51-root-layout--providers)
   - 5.2 [Tab Navigation](#52-tab-navigation)
   - 5.3 [Screens](#53-screens)
   - 5.4 [Components](#54-components)
   - 5.5 [Hooks](#55-hooks)
   - 5.6 [Lib (Core Services)](#56-lib-core-services)
   - 5.7 [Constants](#57-constants)
6. [Backend — Python / FastAPI](#6-backend--python--fastapi)
   - 6.1 [Entry Point & Server Startup](#61-entry-point--server-startup)
   - 6.2 [Main Application (`server_py/main.py`)](#62-main-application-server_pymainpy)
   - 6.3 [Chat Service (`server_py/chat.py`)](#63-chat-service-server_pychatpy)
   - 6.4 [Database (`server_py/database.py`)](#64-database-server_pydatabasepy)
   - 6.5 [Nessie Client (`server_py/nessie_client.py`)](#65-nessie-client-server_pynessie_clientpy)
7. [Legacy Node.js Server (`server/`)](#7-legacy-nodejs-server-server)
8. [Shared Schema & Models](#8-shared-schema--models)
9. [API Documentation](#9-api-documentation)
   - 9.1 [Plaid Endpoints](#91-plaid-endpoints)
   - 9.2 [Capital One Nessie Endpoints](#92-capital-one-nessie-endpoints)
   - 9.3 [AI Advisor Endpoints](#93-ai-advisor-endpoints)
   - 9.4 [Utility Endpoints](#94-utility-endpoints)
10. [Key Algorithms & Data Structures](#10-key-algorithms--data-structures)
11. [External Service Dependencies](#11-external-service-dependencies)
12. [Environment Variables](#12-environment-variables)
13. [Build, Test & Deploy](#13-build-test--deploy)
14. [Design Decisions & Trade-offs](#14-design-decisions--trade-offs)
15. [Technical Debt & Areas for Improvement](#15-technical-debt--areas-for-improvement)
16. [Merge Guide for AI Agents](#16-merge-guide-for-ai-agents)

---

## 1. Project Overview

**Pigeon** is a personal finance management mobile application built for Tartan Hacks 2026. It provides:

- **Bank account connectivity** via Plaid (sandbox) and Capital One Nessie API
- **Financial dashboard** showing net worth, account balances, spending activity, and budget tracking
- **AI financial advisor** with streaming chat powered by multiple LLM models via Dedalus Labs API (OpenAI-compatible)
- **Behavioral finance analysis** including onboarding survey, "regret scoring" of transactions, and personalized spending insights
- **Budget management** with category-based tracking, visual progress bars, and CRUD operations

The app name in `app.json` is **"Pigeon"** with bundle ID `com.pigeon.app`.

---

## 2. Architecture & Design Principles

### High-Level Architecture

```
┌────────────────────────────────────────┐
│        Mobile App (Expo/React Native)   │
│  ┌──────────┐ ┌───────────┐ ┌────────┐ │
│  │Dashboard │ │Transactions│ │Budget  │ │
│  │  Screen  │ │   Screen   │ │ Screen │ │
│  └────┬─────┘ └─────┬─────┘ └───┬────┘ │
│       │              │            │      │
│  ┌────▼──────────────▼────────────▼────┐ │
│  │   FinanceContext (State Manager)     │ │
│  └────────────────┬────────────────────┘ │
│                   │                      │
│  ┌────────────────▼────────────────────┐ │
│  │   apiRequest() / query-client       │ │
│  └────────────────┬────────────────────┘ │
└───────────────────┼──────────────────────┘
                    │ HTTP/SSE
┌───────────────────▼──────────────────────┐
│     Python Backend (FastAPI + Uvicorn)    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Plaid   │ │  Nessie  │ │   Chat   │  │
│  │  Routes  │ │  Routes  │ │  Service │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │             │            │         │
│  ┌────▼─────┐ ┌────▼─────┐ ┌───▼──────┐  │
│  │Plaid SDK │ │ httpx    │ │Dedalus   │  │
│  │(Sandbox) │ │(Nessie)  │ │Labs API  │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                    │                      │
│              ┌─────▼──────┐               │
│              │  SQLite DB │               │
│              │(finance.db)│               │
│              └────────────┘               │
└───────────────────────────────────────────┘
```

### Design Principles

1. **Single-user, hackathon-oriented:** No authentication system; state is stored per-device via `AsyncStorage` (frontend) and a single-row user profile in SQLite (backend).
2. **Dual data source:** The app can load financial data from either Plaid (real sandbox data) or Capital One's Nessie API (simulated banking data), with a static demo fallback.
3. **Multi-model AI routing:** The chat service routes queries to different LLM models (GPT-4o, GPT-4o-mini, Gemini) based on query content heuristics, all through a unified Dedalus Labs gateway.
4. **Streaming responses:** AI chat uses Server-Sent Events (SSE) for real-time streaming of AI responses to the mobile client.
5. **Context-aware:** The AI advisor receives full financial context (accounts, transactions, budgets) and behavioral survey data with each request.

---

## 3. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| Expo SDK | ~54.0 | React Native framework & tooling |
| React Native | 0.81.5 | Cross-platform mobile UI |
| React | 19.1.0 | UI library |
| expo-router | ~6.0.23 | File-based routing |
| @tanstack/react-query | ^5.83.0 | Server state management |
| react-native-reanimated | ~4.1.1 | Animations |
| react-native-gifted-charts | ^1.4.73 | Pie charts for analytics |
| react-native-markdown-display | ^7.0.2 | Markdown rendering in chat |
| react-native-svg | ^15.12.1 | SVG charts |
| @react-native-async-storage | 2.2.0 | Local persistence |
| expo-haptics | ~15.0.8 | Haptic feedback |
| expo-location | ~19.0.8 | Geolocation |
| zod | ^3.25.76 | Schema validation |

### Backend (Primary — Python)
| Technology | Version | Purpose |
|---|---|---|
| FastAPI | >=0.128.3 | Web framework |
| Uvicorn | >=0.40.0 | ASGI server |
| plaid-python | >=38.1.0 | Plaid API SDK |
| httpx | >=0.28.1 | Async HTTP client (for Nessie) |
| openai | >=1.0.0 | OpenAI-compatible client (Dedalus) |
| google-genai | >=0.8.0 | Google AI SDK (legacy, may be unused) |
| sse-starlette | >=3.2.0 | Server-Sent Events support |
| python-dotenv | >=1.0.0 | Environment variable loading |
| SQLite3 | (stdlib) | Local database |

### Backend (Legacy — Node.js, not active)
| Technology | Version | Purpose |
|---|---|---|
| Express | ^5.0.1 | Web framework |
| plaid | ^41.1.0 | Plaid API SDK |
| drizzle-orm | ^0.39.3 | PostgreSQL ORM |
| OpenAI | (via env) | AI chat (original implementation) |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker Compose | PostgreSQL 15-alpine for drizzle/legacy server |
| Python venv + uv | Python dependency management |
| patch-package | Post-install patches for expo-asset |

---

## 4. Directory Structure

```
Tartan-Hacks-2026/
├── app/                          # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout with providers
│   ├── (tabs)/                   # Tab-based navigation group
│   │   ├── _layout.tsx           # Tab bar configuration
│   │   ├── index.tsx             # Dashboard (home) screen
│   │   ├── transactions.tsx      # Transaction list screen
│   │   ├── budget.tsx            # Budget management screen
│   │   └── advisor.tsx           # Advisor tab (opens modal)
│   ├── advisor-modal.tsx         # AI chat modal screen
│   ├── onboarding-survey.tsx     # Financial personality survey
│   ├── plaid-link.tsx            # Plaid bank connection flow
│   ├── +native-intent.tsx        # Native deep link handler
│   └── +not-found.tsx            # 404 screen
│
├── components/                   # Reusable UI components
│   ├── AnalyticsBlock.tsx        # Spending pie chart + regret insights
│   ├── ErrorBoundary.tsx         # React error boundary (class component)
│   ├── ErrorFallback.tsx         # Error display with dev details
│   ├── FinanceTip.tsx            # Random financial literacy tips
│   └── KeyboardAwareScrollViewCompat.tsx  # Cross-platform keyboard scroll
│
├── constants/
│   └── colors.ts                 # Dark theme color palette
│
├── hooks/
│   └── useCustomerSnapshot.ts    # Capital One Nessie snapshot hook
│
├── lib/                          # Core business logic & services
│   ├── finance-context.tsx       # Global finance state (React Context)
│   ├── plaid-service.ts          # Plaid link token / exchange helpers
│   └── query-client.ts           # API request utilities & React Query config
│
├── shared/                       # Shared types between frontend & legacy server
│   ├── schema.ts                 # Drizzle ORM user schema (PostgreSQL)
│   └── models/
│       └── chat.ts               # Drizzle ORM conversation/message schema
│
├── server/                       # Node.js server (acts as Python launcher)
│   ├── index.ts                  # Entry: spawns Python server as child process
│   ├── routes.ts                 # Legacy Express routes (Plaid + OpenAI chat)
│   ├── storage.ts                # In-memory user storage
│   └── templates/
│       └── landing-page.html     # Web landing page with QR code
│
├── server_py/                    # Primary Python backend
│   ├── main.py                   # FastAPI application with all routes
│   ├── chat.py                   # Multi-model AI chat service
│   ├── database.py               # SQLite database for user profiles & regret scores
│   ├── nessie_client.py          # Capital One Nessie API client
│   ├── finance.db                # SQLite database file
│   ├── test_*.py                 # Various test files
│   └── verify_chat.py            # Chat verification script
│
├── scripts/
│   ├── build.js                  # Static Expo Go build script
│   └── seed.ts                   # PostgreSQL seed script (for legacy server)
│
├── assets/images/                # App icons and splash images
├── patches/                      # patch-package patches
│   └── expo-asset+12.0.12.patch
│
├── package.json                  # Node.js dependencies & scripts
├── pyproject.toml                # Python project config & dependencies
├── app.json                      # Expo configuration
├── tsconfig.json                 # TypeScript configuration
├── babel.config.js               # Babel configuration
├── metro.config.js               # Metro bundler configuration
├── drizzle.config.ts             # Drizzle ORM configuration
├── docker-compose.yml            # PostgreSQL container
├── eslint.config.js              # ESLint configuration
├── setup.sh                      # Full project setup script
├── run_server.sh                 # Quick server start script
├── .gitignore                    # Git ignore rules
├── .replit                       # Replit configuration
└── uv.lock                       # Python dependency lock file
```

---

## 5. Frontend — Expo / React Native

### 5.1 Root Layout & Providers

**File:** `app/_layout.tsx`

The root layout wraps the entire app with these providers (outer to inner):
1. **`ErrorBoundary`** — Catches React rendering errors globally
2. **`QueryClientProvider`** — TanStack React Query for server state
3. **`GestureHandlerRootView`** — Required for gesture-based navigation
4. **`KeyboardProvider`** — From `react-native-keyboard-controller`
5. **`FinanceProvider`** — Custom global finance state context

**Fonts:** Uses DM Sans (400 Regular, 500 Medium, 600 SemiBold, 700 Bold) loaded via `@expo-google-fonts/dm-sans`. Splash screen is held until fonts load.

**Navigation Stack:**
- `(tabs)` — Main tab navigator (headerless)
- `plaid-link` — Modal for Plaid bank connection
- `advisor-modal` — Modal for AI chat
- `onboarding-survey` — Full-screen survey (gesture disabled, no back)

### 5.2 Tab Navigation

**File:** `app/(tabs)/_layout.tsx`

Four tabs with two layout implementations (only `ClassicTabLayout` is active):
1. **Dashboard** (`index`) — Stats chart icon
2. **Activity** (`transactions`) — List icon
3. **Budget** (`budget`) — Pie chart icon
4. **Advisor** (`advisor`) — Sparkles icon, **intercepts tab press** to open `advisor-modal` instead

Tab bar styling: Absolute positioned, transparent on iOS with `BlurView`, dark surface on Android/web. Uses DM Sans 500 Medium for labels.

### 5.3 Screens

#### Dashboard (`app/(tabs)/index.tsx`)

**Purpose:** Main financial overview screen.

**Key features:**
- Net worth display with mini SVG line chart (actual + predicted trend)
- 7-day spending calendar strip with bar indicators
- Recent transactions list (last 5)
- Monthly budget progress bar
- Account cards showing type, name, balance
- Stats row: account count, 7-day spend, growth percentage
- `AnalyticsBlock` component for pie chart + regret insights
- Pull-to-refresh via `RefreshControl`
- "Connect Bank" card when not connected, with Plaid link or demo data option
- Auto-redirect to onboarding survey if connected but survey not completed

**Key data flow:**
- Reads all state from `useFinance()` context
- Calls `refreshData()` on mount
- Prediction data: 3 future months at 1.5% growth rate

**Environment variable:** `EXPO_PUBLIC_DEMO_MODE=1` enables demo-only connection button.

#### Transactions (`app/(tabs)/transactions.tsx`)

**Purpose:** Display last 7 days of transactions grouped by date.

**Key features:**
- Summary row showing total spent vs received
- FlatList with date group headers
- Each transaction shows: categorized icon, merchant name, category, amount, date
- Category icon heuristics based on transaction `category` array and `name` string matching
- Pull-to-refresh

**Category mapping logic** (function `getCategoryIcon`): Pattern-matches category strings and merchant names to return appropriate Material Icons and neon accent colors.

#### Budget (`app/(tabs)/budget.tsx`)

**Purpose:** Monthly budget category management.

**Key features:**
- Total spending summary with animated progress bar
- Per-category budget cards with progress bars (color changes at 75% and over-budget)
- Add new budget modal: name, limit, icon picker (10 Material Icons), color picker (7 neon colors)
- Edit limit modal: tap to edit existing budget limit
- Delete: long-press to delete with confirmation Alert
- Haptic feedback on add/edit/delete
- Empty state with finance tip

**Data persistence:** Budgets stored in `AsyncStorage` via `FinanceContext`.

#### Advisor Tab (`app/(tabs)/advisor.tsx`)

**Purpose:** Placeholder screen that redirects to the advisor modal. Shows a "Start Chat" button that navigates to `/advisor-modal`.

#### AI Advisor Modal (`app/advisor-modal.tsx`)

**Purpose:** Full-screen streaming AI chat interface.

**Key features:**
- Welcome screen with quick prompts: "How can I save more?", "Review my spending", "Create a savings plan", "Debt payoff strategy"
- Inverted FlatList for chat messages
- User messages: cyan blue bubbles; Assistant messages: dark surface with avatar, rendered as **Markdown**
- Typing indicator with activity spinner + finance tip
- SSE streaming: Parses `data:` prefixed JSON chunks in OpenAI-compatible format (`choices[0].delta.content`)
- Sends full message history + financial context + survey context with each request
- `KeyboardAvoidingView` for input area

**API endpoint:** `POST {API_URL}/api/advisor/chat`

**Request body:**
```json
{
  "messages": [{"role": "user"|"assistant", "content": "..."}],
  "financialContext": "string (formatted account/transaction/budget summary)",
  "surveyContext": "string (YAML-like behavioral profile)"
}
```

**Response:** SSE stream with `data: {"choices":[{"delta":{"content":"..."}}]}` chunks, terminated by `data: [DONE]`.

#### Onboarding Survey (`app/onboarding-survey.tsx`)

**Purpose:** 11-question financial personality assessment.

**Question categories:**
- **Finances** (2 questions): Monthly spending capacity, financial flexibility
- **Behavioral** (3 questions): Overspending categories, timing triggers, purchase thoughtfulness
- **Emotional** (2 questions): Stress level, regret situations
- **Goals** (4 questions): Financial priorities, protected expenses, goal blockers, strictness preference

**Question types:**
- `choice` — Single select from options
- `multi-choice` — Multi-select from options
- `slider` — 0-100 continuous slider

**Submission flow:**
1. Collects all answers into `Record<number, string | string[] | number>`
2. POSTs to `/api/advisor/survey-analysis` with answers + financial context
3. Receives JSON analysis: `{ spending_regret, user_goals, top_categories }`
4. Saves analysis to `AsyncStorage` via `completeSurvey()`
5. Redirects to `/(tabs)`

#### Plaid Link (`app/plaid-link.tsx`)

**Purpose:** WebView-based Plaid Link flow for connecting bank accounts.

**Flow:**
1. Creates link token via `POST /api/plaid/create-link-token`
2. Renders Plaid Link SDK in a WebView with inline HTML
3. On success: exchanges public token via `connectBank()`, navigates back
4. On error: shows error popup with "Use Demo Data" option
5. If `EXPO_PUBLIC_DEMO_MODE=1`: skips Plaid entirely, loads demo data

### 5.4 Components

#### `AnalyticsBlock` (`components/AnalyticsBlock.tsx`)
- **Purpose:** Dashboard analytics widget
- **Inputs:** `categorySpending`, `topRegretTransactions`, `behavioralSummary` from `useFinance()`
- **Outputs:** Donut pie chart (top 5 categories), regret transaction list with scores, AI behavioral summary
- **Dependencies:** `react-native-gifted-charts` (PieChart), `expo-blur` (BlurView), `expo-linear-gradient`

#### `ErrorBoundary` (`components/ErrorBoundary.tsx`)
- **Purpose:** Class-based React error boundary (required — hooks can't catch render errors)
- **Props:** `FallbackComponent` (default: `ErrorFallback`), `onError` callback
- **Behavior:** Catches JS errors during rendering, shows fallback with reset capability

#### `ErrorFallback` (`components/ErrorFallback.tsx`)
- **Purpose:** User-friendly error screen
- **Features:** "Try Again" button calls `reloadAppAsync()`, DEV mode shows detailed error modal with stack trace
- **Supports:** Dark/light mode via `useColorScheme()`

#### `FinanceTip` (`components/FinanceTip.tsx`)
- **Purpose:** Displays random financial literacy tip
- **Data:** Array of 25 hardcoded tips (50/30/20 rule, compound interest, etc.)
- **Usage:** Shown during loading states, empty states, and on the connect screen

#### `KeyboardAwareScrollViewCompat` (`components/KeyboardAwareScrollViewCompat.tsx`)
- **Purpose:** Platform-compatible keyboard-aware scroll view
- **Behavior:** Uses `react-native-keyboard-controller` on native, plain `ScrollView` on web

### 5.5 Hooks

#### `useCustomerSnapshot` (`hooks/useCustomerSnapshot.ts`)
- **Purpose:** Fetches Capital One Nessie customer snapshot
- **Input:** `customerId: string`
- **Output:** `{ data: CustomerSnapshot | null, loading, error, refresh }`
- **API:** `GET {API_BASE_URL}/api/capitalone/customer/{id}/snapshot`
- **Types defined:** `Account`, `Transaction`, `CustomerSnapshot`

### 5.6 Lib (Core Services)

#### `FinanceContext` (`lib/finance-context.tsx`)

**This is the central state management layer** — a React Context provider that holds all financial data.

**State managed:**
| State | Type | Description |
|---|---|---|
| `isConnected` | `boolean` | Whether bank is connected |
| `isDemoMode` | `boolean` | Using demo/Nessie data vs live Plaid |
| `isLoading` | `boolean` | Loading indicator |
| `accounts` | `Account[]` | Bank accounts |
| `transactions` | `Transaction[]` | Recent transactions |
| `categorySpending` | `CategorySpending[]` | Aggregated spending by category |
| `regretMetrics` | `RegretMetric[]` | Avg regret scores by category |
| `topRegretTransactions` | `Transaction[]` | Top 3 highest-regret transactions |
| `behavioralSummary` | `string | null` | AI-generated behavior summary |
| `budgets` | `BudgetCategory[]` | Budget categories with limits/spent |
| `netWorthHistory` | `NetWorthHistory[]` | 7-month net worth history |
| `totalNetWorth` | `number` | Computed from accounts |
| `connectionError` | `string | null` | Error message |
| `isSurveyCompleted` | `boolean` | Whether onboarding survey is done |
| `surveyAnalysis` | `any` | Stored survey analysis result |

**Key methods:**
- `connectBank(publicToken)` — Exchanges Plaid token, refreshes data
- `loadDemoData()` — **Primary data loading function**: Tries Nessie API first (`/api/capitalone/customers` → `/api/capitalone/customer/{id}/snapshot`), falls back to hardcoded demo data
- `refreshData()` — Checks connection, fetches accounts/transactions, recalculates budgets
- `calculateAnalytics(txns)` — Computes category spending, regret metrics, fetches behavioral summary
- `getFinancialContext()` — Formats all financial data into a string for AI context
- `getSurveyContext()` — Formats survey analysis + behavioral insights for AI context
- `updateBudget()`, `addBudgetCategory()`, `deleteBudgetCategory()` — CRUD for budgets

**Data flow for `loadDemoData()`:**
1. `GET /api/capitalone/customers` → get first customer ID
2. `GET /api/capitalone/customer/{id}/snapshot` → get all accounts with hydrated data
3. Map Nessie data → internal `Account[]` and `Transaction[]` types
4. If Nessie fails → fall back to `DEMO_ACCOUNTS` and `DEMO_TRANSACTIONS` (hardcoded)

**Transaction categorization** (`categorizeToBudget`): Maps transactions to budget IDs (food, transport, shopping, entertainment, bills) based on category strings and merchant name patterns.

**Default budgets:**
| ID | Name | Default Limit |
|---|---|---|
| food | Food & Dining | $500 |
| transport | Transportation | $200 |
| shopping | Shopping | $300 |
| entertainment | Entertainment | $150 |
| bills | Bills & Utilities | $400 |

#### `plaid-service.ts` (`lib/plaid-service.ts`)
- `createLinkToken()` → `POST /api/plaid/create-link-token` → returns `link_token`
- `exchangePublicToken(publicToken)` → `POST /api/plaid/exchange-token`

#### `query-client.ts` (`lib/query-client.ts`)
- `getApiUrl()` — Returns `EXPO_PUBLIC_API_BASE_URL` or defaults to `http://172.25.4.240:5001`
- `apiRequest(method, route, data?)` — Fetch wrapper with JSON headers, credentials included, error throwing
- `queryClient` — TanStack QueryClient configured with `staleTime: Infinity`, no retry, no refetch on focus
- Uses `expo/fetch` for fetch implementation

### 5.7 Constants

#### `colors.ts` (`constants/colors.ts`)

Dark cyberpunk/neon theme:
- **Background:** `#0A0E1A` (near-black navy)
- **Surface:** `#131829` (dark navy)
- **Primary tint:** `#00F0FF` (cyan)
- **Accent/Negative:** `#FF3D71` (hot pink)
- **Positive:** `#00E676` (neon green)
- **Gradient:** `#00F0FF` → `#0066FF` (cyan to blue)
- **Neon palette:** Yellow `#FFE500`, Purple `#B83DFF`, Blue `#0066FF`, Pink `#FF3D71`, Green `#00E676`

All colors are under `Colors.light` (despite being a dark theme — naming convention from Expo template).

---

## 6. Backend — Python / FastAPI

### 6.1 Entry Point & Server Startup

**File:** `server/index.ts` (Node.js entry)

The Node.js entry point **does not run an Express server**. Instead, it:
1. Loads `.env` via `dotenv/config`
2. Resolves the Python path (checks `.venv/bin/python3` first, falls back to `python3`)
3. Spawns `server_py/main.py` as a child process with `stdio: "inherit"`
4. Forwards SIGTERM/SIGINT signals to the Python process

**Alternative:** `run_server.sh` directly runs `python server_py/main.py`.

### 6.2 Main Application (`server_py/main.py`)

**Framework:** FastAPI with custom CORS middleware.

**Startup:**
- Loads env vars via `dotenv`
- Configures Plaid client (sandbox environment)
- Initializes `NessieClient`, `ChatService`
- Mounts static file directories (`static-build/`, `assets/`)
- Runs on port from `PORT` env var (default 5000) via Uvicorn

**CORS:** Custom middleware that allows all origins in development (sets `Access-Control-Allow-Origin` to the request origin).

**Demo Mode:** When `EXPO_PUBLIC_DEMO_MODE=1`:
- Plaid endpoints return hardcoded demo data
- Demo accounts: 1 checking ($1,250), 1 credit card ($2,500)
- Demo transactions: 30 days of random transactions across 7 categories + regret/anomaly examples

**Landing page:** Serves `server/templates/landing-page.html` on `GET /` with QR code for Expo Go. Detects `expo-platform` header and serves platform-specific manifests for native builds.

### 6.3 Chat Service (`server_py/chat.py`)

**Multi-model AI architecture using Dedalus Labs as a gateway:**

#### `DedalusClient`
- Wraps `AsyncOpenAI` client pointed at `https://api.dedaluslabs.ai/v1`
- API key: `EXPO_PUBLIC_DEDALUS_API_KEY`
- Supports streaming and non-streaming completions

#### `QueryRouter`
Routes user queries to different models based on keyword heuristics:
| Keywords | Model | Friendly Name |
|---|---|---|
| "analyze", "plan", "strategy" | `openai/gpt-4o` | Advanced Reasoning |
| "spending", "budget", "numbers", "calculate", etc. | `google/gemini-2.0-flash` | Quantitative Reasoning |
| (default) | `openai/gpt-4o-mini` | Fast Reasoning |

#### `ChatService`
Main service class with these capabilities:

1. **`get_response_stream()`** — Primary streaming endpoint
   - Detects multi-step trigger ("analyze" + "plan" in query)
   - Otherwise routes to appropriate model
   - Prepends `__Using {ModelName}__` to response
   - Streams tokens from Dedalus API

2. **`_handle_multi_step_workflow()`** — Three-step analysis pipeline:
   - Step 1: GPT-4o-mini categorizes transaction data
   - Step 2: Simulated "GPT-5" pattern recognition (mocked with sleep)
   - Step 3: GPT-4o creates detailed savings plan based on Step 1's summary

3. **`analyze_survey()`** — Non-streaming, returns JSON:
   ```json
   {
     "spending_regret": "analysis string",
     "user_goals": "goals string",
     "top_categories": ["cat1", "cat2", "cat3", "cat4", "cat5"]
   }
   ```
   Uses GPT-4o, with fallback defaults on error.

4. **`generate_behavioral_summary()`** — Non-streaming behavioral analysis
   - Input: Recent transactions + user profile
   - Output: 2-3 sentence behavioral summary
   - Uses GPT-4o-mini

5. **`analyze_transaction_regret()`** — (Referenced in `main.py` but defined via `chat_service`) Analyzes individual transactions for regret scores (0-100) with reasons.

**System Prompt (for chat):**
- Identity: "Origin, a professional AI financial advisor"
- Includes user financial data and survey analysis
- **Strict guardrail:** Refuses non-finance questions
- Guidelines: Concise, actionable, no stock picks

### 6.4 Database (`server_py/database.py`)

**SQLite database** at `server_py/finance.db`.

**Tables:**

1. **`user_profile`** (single-user, ID always = 1):
   | Column | Type | Description |
   |---|---|---|
   | id | INTEGER PK | Always 1 |
   | spending_regret | TEXT | Analysis of regret patterns |
   | user_goals | TEXT | Financial goals summary |
   | top_categories | TEXT (JSON) | Top spending categories |
   | updated_at | TIMESTAMP | Last update |

2. **`transaction_metadata`**:
   | Column | Type | Description |
   |---|---|---|
   | transaction_id | TEXT PK | Transaction identifier |
   | regret_score | INTEGER | 0-100 regret score |
   | regret_reason | TEXT | Why this may be regretted |
   | analyzed_at | TIMESTAMP | When analyzed |

**Functions:**
- `init_db()` — Creates tables if not exist (runs on module import)
- `save_user_profile(spending_regret, user_goals, top_categories)` — Upsert profile
- `get_user_profile()` → `Dict | None`
- `get_transaction_metadata(transaction_ids)` → `Dict[str, Dict]` — Bulk fetch regret data
- `save_transaction_regret(transaction_id, score, reason)` — Insert/replace

### 6.5 Nessie Client (`server_py/nessie_client.py`)

**Capital One Nessie API wrapper** using `httpx` async client.

**Base URL:** `NESSIE_BASE_URL` (default: `https://api.reimaginebanking.com`)
**Auth:** API key passed as `?key=` query parameter (`NESSIE_API_KEY`)

**Endpoints wrapped:**
| Method | Path | Purpose |
|---|---|---|
| `get_customers()` | `/customers` | List all customers |
| `get_customer_accounts(id)` | `/customers/{id}/accounts` | Customer's accounts |
| `get_account(id)` | `/accounts/{id}` | Single account details |
| `get_account_customer(id)` | `/accounts/{id}/customer` | Account's customer |
| `get_account_bills(id)` | `/accounts/{id}/bills` | Account bills |
| `get_account_deposits(id)` | `/accounts/{id}/deposits` | Account deposits |
| `get_account_loans(id)` | `/accounts/{id}/loans` | Account loans |
| `get_account_purchases(id)` | `/accounts/{id}/purchases` | Account purchases |
| `get_account_transfers(id)` | `/accounts/{id}/transfers` | Account transfers |
| `get_account_withdrawals(id)` | `/accounts/{id}/withdrawals` | Account withdrawals |

All methods use async `httpx.AsyncClient` with 20-second timeout.

---

## 7. Legacy Node.js Server (`server/`)

**File:** `server/routes.ts`

This file contains the **original Express implementation** of the backend before the migration to Python. It is **NOT actively used** in the current architecture (since `server/index.ts` only spawns the Python server).

It contains:
- Plaid routes (identical API surface to the Python implementation)
- An OpenAI chat endpoint using `gpt-5.2` model directly
- In-memory storage for Plaid access tokens

**Important for merging:** If merging with a Node.js-based project, these routes could be revived. The Python backend is the canonical implementation.

**Files:**
- `server/storage.ts` — In-memory `Map`-based user storage implementing `IStorage` interface
- `server/templates/landing-page.html` — Responsive landing page with Expo Go QR code, app store links, dark mode support

---

## 8. Shared Schema & Models

### `shared/schema.ts` (PostgreSQL via Drizzle ORM)

```typescript
users table:
  id: varchar PK (gen_random_uuid())
  username: text NOT NULL UNIQUE
  password: text NOT NULL
```

### `shared/models/chat.ts` (PostgreSQL via Drizzle ORM)

```typescript
conversations table:
  id: serial PK
  title: text NOT NULL
  createdAt: timestamp (default CURRENT_TIMESTAMP)

messages table:
  id: serial PK
  conversationId: integer FK → conversations.id (CASCADE delete)
  role: text NOT NULL
  content: text NOT NULL
  createdAt: timestamp (default CURRENT_TIMESTAMP)
```

**Note:** These schemas are for the PostgreSQL database used by the legacy Node.js server. The active Python backend uses SQLite with a different schema (see Section 6.4). The Drizzle schemas are configured via `drizzle.config.ts` pointing to `DATABASE_URL`.

---

## 9. API Documentation

All endpoints are served by the Python FastAPI backend on the configured port (default 5000, or `PORT` env var).

### 9.1 Plaid Endpoints

| Method | Endpoint | Request Body | Response | Description |
|---|---|---|---|---|
| POST | `/api/plaid/create-link-token` | — | `{ link_token: string }` | Creates Plaid Link token |
| POST | `/api/plaid/exchange-token` | `{ public_token: string }` | `{ success: true }` | Exchanges public token for access token |
| GET | `/api/plaid/accounts` | — | `{ accounts: Account[] }` | Gets connected accounts |
| GET | `/api/plaid/transactions` | — | `{ transactions: Transaction[], total: number }` | Gets last 7 days of transactions (with regret scoring) |
| GET | `/api/plaid/balance` | — | `{ accounts: Account[] }` | Gets account balances |
| GET | `/api/plaid/status` | — | `{ connected: boolean }` | Checks if bank is connected |
| POST | `/api/plaid/disconnect` | — | `{ success: true }` | Disconnects bank account |

**Transaction object (enhanced):**
```json
{
  "transaction_id": "string",
  "account_id": "string",
  "name": "string",
  "amount": 0.00,
  "date": "2026-02-07",
  "category": ["Category", "Subcategory"],
  "pending": false,
  "merchant_name": "string|null",
  "payment_channel": "string",
  "iso_currency_code": "USD",
  "regretScore": 75,        // 0-100, AI-analyzed
  "regretReason": "string"  // AI explanation
}
```

### 9.2 Capital One Nessie Endpoints

| Method | Endpoint | Response | Description |
|---|---|---|---|
| GET | `/api/capitalone/customers` | `{ customers: Customer[] }` | Lists all Nessie customers |
| GET | `/api/capitalone/customer/{id}/snapshot` | `{ customer_id, accounts: HydratedAccount[] }` | Full customer snapshot with all account data |

**Hydrated account structure:**
```json
{
  "account": { "_id": "...", "type": "...", "balance": 0 },
  "customer": { ... },
  "bills": [...],
  "deposits": [...],
  "loans": [...],
  "purchases": [...],
  "transfers": [...],
  "withdrawals": [...]
}
```

### 9.3 AI Advisor Endpoints

| Method | Endpoint | Request Body | Response | Description |
|---|---|---|---|---|
| POST | `/api/advisor/chat` | `{ messages, financialContext, surveyContext }` | SSE stream | Streaming AI chat |
| POST | `/api/advisor/survey-analysis` | `{ answers: Record, financialContext }` | `{ spending_regret, user_goals, top_categories }` | Survey analysis |
| POST | `/api/advisor/insights` | `{ transactions: Transaction[] }` | `{ behavioral_summary: string }` | Behavioral summary |

### 9.4 Utility Endpoints

| Method | Endpoint | Response | Description |
|---|---|---|---|
| GET | `/` | HTML landing page | Web landing with QR code |
| GET | `/health` | `{ ok: true }` | Health check |

---

## 10. Key Algorithms & Data Structures

### Transaction Categorization (Frontend)

**Location:** `lib/finance-context.tsx` → `categorizeToBudget()`

Maps transactions to budget categories using string pattern matching on both `category` array and `name`:
```
Food/Restaurant/Coffee/Grocer/Starbucks/Chipotle → "food"
Travel/Taxi/Transport/Gas/Uber/Lyft → "transport"
Shop/Merchandise/Department/Amazon/Target → "shopping"
Entertainment/Recreation/Streaming/Netflix → "entertainment"
Utility/Telecom/Service/Electric → "bills"
```

### Net Worth Calculation

**Location:** `lib/finance-context.tsx`

```
totalNetWorth = Σ(account.balances.current)
  where credit/loan accounts subtract from total
```

Net worth history: Synthetic 7-month history generated with decreasing variation from current net worth (2% per month back).

### Spending Prediction

**Location:** `app/(tabs)/index.tsx`

Simple linear projection: 3 future data points at 1.5% compound growth rate per period.

### Regret Scoring

**Location:** `server_py/main.py` (transaction processing) + `server_py/chat.py`

For each transaction without existing metadata:
1. Send transaction details + user profile to AI
2. AI returns `{ score: 0-100, reason: "..." }`
3. Score saved to SQLite for caching
4. Limited to 5 concurrent analyses per request to avoid timeouts

### Query Routing

**Location:** `server_py/chat.py` → `QueryRouter.route()`

Keyword-based routing:
- Complex analysis → GPT-4o (more capable)
- Quantitative queries → Gemini 2.0 Flash (fast for numbers)
- General queries → GPT-4o-mini (cheapest/fastest)

### Multi-Step Workflow

**Location:** `server_py/chat.py` → `_handle_multi_step_workflow()`

Triggered when query contains both "analyze" AND "plan":
1. **Categorize** (GPT-4o-mini) → spending summary
2. **Deep Analysis** (mocked) → pattern recognition
3. **Plan Creation** (GPT-4o) → detailed savings plan using Step 1 output

---

## 11. External Service Dependencies

| Service | Purpose | Auth Method | Environment |
|---|---|---|---|
| **Plaid** | Bank account linking & transaction data | Client ID + Secret | Sandbox |
| **Capital One Nessie** | Simulated banking data | API key in query param | Hackathon sandbox |
| **Dedalus Labs** | Multi-model AI gateway (OpenAI-compatible) | API key (Bearer) | Production |
| **PostgreSQL** | Legacy database (Drizzle ORM) | Connection URL | Docker (local) |
| **SQLite** | User profiles & transaction metadata | File-based | Local |

---

## 12. Environment Variables

### Required

| Variable | Used By | Description |
|---|---|---|
| `PLAID_CLIENT_ID` | Python backend | Plaid API client ID |
| `PLAID_SECRET` | Python backend | Plaid API secret key |
| `EXPO_PUBLIC_DEDALUS_API_KEY` | Python backend | Dedalus Labs API key for AI models |
| `NESSIE_API_KEY` | Python backend | Capital One Nessie API key |

### Optional

| Variable | Default | Description |
|---|---|---|
| `PORT` | `5000` | Backend server port |
| `EXPO_PUBLIC_API_BASE_URL` | `http://172.25.4.240:5001` | Frontend API base URL |
| `EXPO_PUBLIC_DEMO_MODE` | `"0"` | Set to `"1"` to enable demo mode |
| `EXPO_PUBLIC_DOMAIN` | — | Domain for Expo deployment |
| `DATABASE_URL` | — | PostgreSQL connection URL (legacy) |
| `NESSIE_BASE_URL` | `https://api.reimaginebanking.com` | Nessie API base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | — | OpenAI key (legacy Node.js server) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | — | OpenAI base URL (legacy) |

---

## 13. Build, Test & Deploy

### Initial Setup

```bash
# 1. Run the automated setup script
chmod +x setup.sh
./setup.sh
```

The `setup.sh` script:
1. Checks Docker is running
2. Creates Python venv, installs `uv`, syncs dependencies
3. Runs `npm install`
4. Resets Docker PostgreSQL container
5. Runs `drizzle-kit push` for schema migration
6. Seeds the database via `scripts/seed.ts`

### Manual Setup

```bash
# Python environment
python3 -m venv .venv
.venv/bin/pip install uv
.venv/bin/uv sync

# Node.js dependencies
npm install

# Database (optional, for legacy server)
docker-compose up -d
npm run db:push
npx tsx scripts/seed.ts
```

### Running the App

```bash
# Start the backend server (Python via Node.js launcher)
npm run server:dev    # Runs on PORT 5001 in dev mode

# OR start Python directly
python server_py/main.py  # Runs on PORT 5000 by default

# Start the Expo frontend
npm run start         # Standard Expo start
npm run expo:dev      # Dev mode with localhost proxy
npm run expo:phone    # LAN mode for physical device (hardcoded IP)
```

### Key npm Scripts

| Script | Command | Purpose |
|---|---|---|
| `server:dev` | `PORT=5001 NODE_ENV=development tsx server/index.ts` | Dev backend |
| `start` | `npx expo start` | Start Expo dev server |
| `expo:dev` | Expo with localhost config | Dev with proxy |
| `expo:phone` | Expo with LAN IP | Physical device testing |
| `server:build` | esbuild → `server_dist/` | Production server build |
| `server:prod` | `NODE_ENV=production node server_dist/index.js` | Production server |
| `db:push` | `drizzle-kit push` | Apply DB schema |
| `expo:static:build` | `node scripts/build.js` | Static Expo Go build |
| `lint` | `npx expo lint` | Run ESLint |

### Static Build (for Expo Go deployment)

`scripts/build.js` performs:
1. Starts Metro bundler in production mode
2. Downloads iOS and Android bundles + manifests
3. Extracts and downloads referenced assets
4. Updates bundle URLs to production domain
5. Creates platform-specific manifest files
6. Outputs to `static-build/` directory

### Testing

Test files exist in `server_py/`:
- `test_claude.py` — Tests Claude model integration
- `test_context.py` — Tests context generation
- `test_dedalus.py` — Tests Dedalus Labs API
- `test_regret.py` — Tests regret scoring
- `test_replacement.py` — Tests model replacement
- `test_survey.py` — Tests survey analysis
- `verify_chat.py` — Verifies chat endpoint

---

## 14. Design Decisions & Trade-offs

### 1. Python backend over Node.js
**Decision:** Migrated from Express/Node.js to FastAPI/Python mid-hackathon.
**Reason:** Better async support for multiple AI API calls, native Plaid SDK, faster prototyping.
**Impact:** Legacy Node.js code remains in `server/` but only acts as a process launcher.

### 2. Multi-model AI via Dedalus Labs
**Decision:** Route different query types to different AI models through a unified gateway.
**Reason:** Cost optimization (cheap models for simple queries) and capability matching (stronger models for analysis).
**Trade-off:** Adds complexity; keyword-based routing is brittle and may misroute queries.

### 3. SQLite for backend persistence
**Decision:** Use SQLite instead of PostgreSQL for the active backend.
**Reason:** Zero-configuration, file-based, sufficient for single-user hackathon demo.
**Trade-off:** Not suitable for multi-user or concurrent access; PostgreSQL config exists but is unused by the Python backend.

### 4. In-memory Plaid token storage
**Decision:** Store Plaid access token in a Python global variable.
**Reason:** Simplicity for demo; no need for persistent token storage.
**Trade-off:** Token lost on server restart; single-user only.

### 5. AsyncStorage for frontend persistence
**Decision:** Use `AsyncStorage` for budgets, survey state, and survey analysis.
**Reason:** Simple key-value store works for single-device, offline-first approach.
**Trade-off:** No sync across devices; data lost if app storage is cleared.

### 6. SSE for chat streaming
**Decision:** Server-Sent Events over WebSockets.
**Reason:** Simpler implementation, unidirectional stream sufficient for chat responses.
**Trade-off:** No bidirectional communication; each message requires a new HTTP request.

### 7. Dual data source (Plaid + Nessie)
**Decision:** Support both Plaid sandbox and Capital One Nessie with static fallback.
**Reason:** Hackathon flexibility; Nessie is free with no rate limits, Plaid provides realistic data.
**Trade-off:** Data mapping complexity; inconsistent data shapes require normalization.

---

## 15. Technical Debt & Areas for Improvement

### Critical

1. **No authentication/authorization** — Single-user model with no login system. Plaid tokens and user data are globally accessible.

2. **Hardcoded IP addresses** — `172.25.4.240` appears in multiple places as the default API URL. Should use environment variables exclusively.

3. **Mixed backend architectures** — Node.js server only spawns Python; the Express routes in `server/routes.ts` are dead code but still in the codebase. Should be cleaned up or clearly marked as deprecated.

4. **SQLite concurrency** — The Python backend uses module-level `get_db_connection()` that creates new connections per call. Under concurrent requests, SQLite may lock.

### Important

5. **No input validation on API routes** — Python endpoints accept raw JSON without schema validation (unlike the Zod schemas defined in shared/).

6. **AI model routing is keyword-based** — The `QueryRouter` uses simple string matching which can easily misroute. Consider embedding-based routing or user-selectable models.

7. **Regret scoring on every transaction fetch** — The `/api/plaid/transactions` endpoint triggers AI analysis for unscored transactions synchronously, slowing response times. Should use background tasks.

8. **No error recovery in SSE streaming** — If the AI stream fails mid-response, the frontend shows partial text with no retry mechanism.

9. **`finance-context.tsx` is monolithic** — 800+ lines managing all state. Should be split into separate contexts or use a state management library.

10. **Inconsistent demo data** — Three different sources of demo data: backend `generate_demo_transactions()`, `DEMO_ACCOUNTS`/`DEMO_TRANSACTIONS` in finance-context, and Nessie API. Should consolidate.

### Nice to Have

11. **No offline support** — App requires backend connection for all features including budget management (which could work locally).

12. **No tests for frontend** — No React Native test files or testing library configured.

13. **Dark theme naming** — Colors are all under `Colors.light` despite being a dark theme.

14. **No pagination** — Transaction list loads all at once (limited to 100 by Plaid).

15. **Net worth history is synthetic** — Generated from current net worth with random variation, not from real historical data.

---

## 16. Merge Guide for AI Agents

### Key Integration Points

When merging this codebase with another repository, pay attention to these critical integration surfaces:

#### 1. API Layer
- **Base URL configuration:** `lib/query-client.ts` → `getApiUrl()` — All API calls route through this
- **Request helper:** `apiRequest(method, route, data?)` — Standardized fetch wrapper
- **API routes:** All under `/api/` prefix — `/api/plaid/*`, `/api/capitalone/*`, `/api/advisor/*`

#### 2. State Management
- **Central context:** `lib/finance-context.tsx` exports `FinanceProvider` and `useFinance()` hook
- **All screens depend on `useFinance()`** for data
- **State types:** `Account`, `Transaction`, `BudgetCategory`, `NetWorthHistory`, `CategorySpending`, `RegretMetric`

#### 3. Navigation
- **Expo Router file-based routing** — Files in `app/` define routes
- **Tab structure:** 4 tabs in `app/(tabs)/`
- **Modals:** `advisor-modal` and `plaid-link` use `presentation: "modal"` stack screens

#### 4. Theming
- **All colors from `constants/colors.ts`** — `Colors.light.*`
- **Font:** DM Sans family (4 weights)
- **Dark theme by default**

#### 5. Backend Entry
- **Primary:** `server_py/main.py` — FastAPI app
- **Process launcher:** `server/index.ts` — spawns Python
- **Direct:** `run_server.sh` or `python server_py/main.py`

### Potential Conflicts When Merging

1. **`package.json`** — Heavy Expo-specific dependencies; version conflicts likely with another RN project
2. **`app/` directory** — Expo Router's file-based routing; conflicts if the other project uses React Navigation directly
3. **`server/` directory** — Contains both the launcher and legacy code; clarify which parts to keep
4. **Port conflicts** — Backend defaults to port 5000/5001; frontend API URL hardcoded in places
5. **Environment variables** — Many required env vars; `.env` file is gitignored
6. **Python + Node.js hybrid** — Unusual dual-runtime setup may conflict with pure-Node or pure-Python projects

### Recommended Merge Strategy

1. **Choose one backend runtime** — Either port Python routes to Node.js or vice versa
2. **Consolidate state management** — `FinanceContext` is the source of truth; integrate or replace carefully
3. **Resolve navigation** — Expo Router requires file-based routing; if the target uses React Navigation, you'll need to restructure
4. **Unify theming** — Copy `constants/colors.ts` or map to the target's design system
5. **Migrate environment variables** — Combine `.env` requirements, resolve naming conflicts
6. **Test API compatibility** — The frontend expects specific response shapes; validate after merging backends

---

*Generated on 2026-02-07 by analyzing every source file in the Tartan-Hacks-2026 repository.*
