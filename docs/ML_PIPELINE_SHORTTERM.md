# ML Pipeline Enhancement - Short-term Tasks

## Overview

This document describes the implementation of short-term enhancement tasks for the ML signal pipeline:

1. **Model Evaluation Dashboard** - UI for monitoring model performance
2. **Feature Importance Visualization** - Visual analysis of feature weights
3. **Signal Performance Charts** - Historical performance tracking

## 1. Model Evaluation Dashboard

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     MODEL EVALUATION DASHBOARD                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          HEADER                                       │   │
│  │  Period Selector: [Day | Week | Month | All]    [Refresh Button]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       KEY METRICS                                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                │   │
│  │  │ Win Rate │ │ Samples  │ │ Avg PnL  │ │ Quality  │                │   │
│  │  │  65.2%   │ │  1,234   │ │  +2.3%   │ │  78.5%   │                │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                          TABS                                         │   │
│  │  [Overview] [Features] [By Bot] [By Symbol]                          │   │
│  │                                                                       │   │
│  │  Overview:                                                            │   │
│  │  ├── Classifier Stats (Long/Short/Neutral counts)                    │   │
│  │  └── Filter Stats (Passed/Rejected signals)                          │   │
│  │                                                                       │   │
│  │  Features:                                                            │   │
│  │  └── Feature Importance bars sorted by weight                        │   │
│  │                                                                       │   │
│  │  By Bot:                                                              │   │
│  │  └── Performance breakdown per bot code                              │   │
│  │                                                                       │   │
│  │  By Symbol:                                                           │   │
│  │  └── Performance breakdown per trading pair                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

#### MLEvaluationDashboard

**Location:** `/src/components/ml/ml-evaluation-dashboard.tsx`

**Features:**
- Key metrics overview (Win Rate, Samples, PnL, Quality)
- Lawrence Classifier statistics
- Signal Filter statistics
- Feature importance visualization
- Performance by bot breakdown
- Performance by symbol breakdown
- Period selector (Day/Week/Month/All)
- Auto-refresh every 30 seconds

**Usage:**
```tsx
import { MLEvaluationDashboard } from '@/components/ml/ml-evaluation-dashboard'

function EvaluationPage() {
  return <MLEvaluationDashboard />
}
```

### API Endpoint

#### GET /api/ml/evaluation

```typescript
// Query parameters
period: 'day' | 'week' | 'month' | 'all'
symbol?: string // Optional symbol filter

// Response
{
  success: true,
  timestamp: number,
  period: string,
  classifier: {
    totalSamples: number,
    longCount: number,
    shortCount: number,
    neutralCount: number,
    winRate: number,
    avgConfidence: number
  },
  filter: {
    totalSignals: number,
    passedSignals: number,
    rejectedSignals: number,
    avgQualityScore: number
  },
  historical: {
    totalSamples: number,
    wins: number,
    losses: number,
    winRate: number,
    avgPnlPercent: number
  },
  featureImportance: Record<string, number>,
  performanceByBot: Record<string, PerformanceStats>,
  performanceBySymbol: Record<string, PerformanceStats>
}
```

## 2. Feature Importance Visualization

### Feature Categories

| Category | Features | Description |
|----------|----------|-------------|
| **Momentum** | n_rsi, n_roc5, n_roc10 | Price momentum indicators |
| **Trend** | n_cci, n_wt, trend | Trend direction and strength |
| **Volatility** | n_adx, volatility | Market volatility measures |
| **Volume** | n_volume | Volume analysis |
| **Time** | hour, day, session | Temporal patterns |

### Importance Calculation

Feature importance is calculated based on:

1. **Model Weights** - Weights learned by the classifier
2. **Information Gain** - How much each feature reduces uncertainty
3. **Correlation** - Correlation with successful outcomes
4. **Frequency** - How often feature is used in decisions

### Default Importance Values

```typescript
const FEATURE_IMPORTANCE = {
  n_rsi: 0.15,        // Highest importance
  n_cci: 0.12,
  n_wt: 0.11,
  n_adx: 0.10,
  trend: 0.09,
  volatility: 0.08,
  n_volume: 0.07,
  session: 0.06,
  hour: 0.05,
  day: 0.04,
  n_roc5: 0.04,
  n_roc10: 0.04,
  n_deriv: 0.04,
}
```

## 3. Signal Performance Charts

### Metrics Tracked

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Win Rate** | Percentage of profitable signals | Wins / Total |
| **Avg PnL** | Average profit/loss percentage | Sum(PnL%) / Total |
| **Profit Factor** | Gross profit / Gross loss | GP / GL |
| **Sharpe Ratio** | Risk-adjusted return | (Return - Rf) / StdDev |
| **Max Drawdown** | Largest peak-to-trough decline | (Peak - Trough) / Peak |

### Performance by Bot

Each bot's performance is tracked separately:

```typescript
interface PerformanceStats {
  total: number      // Total signals
  wins: number       // Winning signals
  losses: number     // Losing signals
  winRate: number    // 0-1
  avgPnl: number     // Average PnL%
}
```

### Performance by Symbol

Trading pairs are tracked individually:

```typescript
// Example output
{
  "BTCUSDT": { total: 450, wins: 285, winRate: 0.633, avgPnl: 1.8 },
  "ETHUSDT": { total: 320, wins: 195, winRate: 0.609, avgPnl: 1.5 },
  "SOLUSDT": { total: 180, wins: 98, winRate: 0.544, avgPnl: 0.8 },
  ...
}
```

## UI Integration

The evaluation dashboard can be accessed through:

1. **Direct Navigation** - `/ml-evaluation` page
2. **ML Filter Panel** - Tab integration
3. **Dashboard Widget** - Summary card on main dashboard

### Adding to Sidebar

```typescript
// In sidebar.tsx menuItems
{ id: "ml-evaluation", label: "ML Evaluation", icon: BarChart3, isNew: true }
```

### Adding to Page

```typescript
// In page.tsx renderContent()
case "ml-evaluation":
  return <MLEvaluationDashboard />
```

## Files Created

| File | Description | Lines |
|------|-------------|-------|
| `/src/app/api/ml/evaluation/route.ts` | Evaluation API endpoint | ~300 |
| `/src/components/ml/ml-evaluation-dashboard.tsx` | Dashboard UI component | ~420 |

## Next Steps

After completing short-term tasks, proceed to:

1. **Medium-term**:
   - Advanced Feature Engineering
   - Ensemble Methods
   - Real-time Learning

2. **Long-term**:
   - Deep Learning Integration
   - Reinforcement Learning
   - Multi-timeframe Analysis
