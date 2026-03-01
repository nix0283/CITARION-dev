# ML Pipeline Enhancement - Medium-term Tasks

## Overview

This document describes the implementation of medium-term enhancement tasks for the ML signal pipeline:

1. **Advanced Feature Engineering** - Extended feature extraction
2. **Ensemble Methods** - Multiple classifier combination
3. **Real-time Learning** - Continuous model updates

## 1. Advanced Feature Engineering

### Feature Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FEATURE ENGINEERING PIPELINE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────┐  │
│  │  RAW DATA   │────►│  FEATURE    │────►│  NORMALIZED FEATURES       │  │
│  │  (OHLCV)    │     │  EXTRACTOR  │     │  (0-1 range)               │  │
│  └─────────────┘     └─────────────┘     └─────────────────────────────┘  │
│                                                                             │
│  FEATURE CATEGORIES:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. PRICE FEATURES                                                   │   │
│  │    - EMA crosses (5/20, 10/50)                                     │   │
│  │    - Price momentum (5, 20 period)                                  │   │
│  │    - Volatility (ATR%, BB width)                                   │   │
│  │    - Price patterns (higher highs, lower lows, inside/outside bars) │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 2. VOLUME FEATURES                                                  │   │
│  │    - Volume ratio vs average                                        │   │
│  │    - Volume trend                                                   │   │
│  │    - OBV divergence                                                 │   │
│  │    - VWAP distance                                                  │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 3. MOMENTUM FEATURES                                                │   │
│  │    - RSI (7, 14 period)                                            │   │
│  │    - RSI divergence                                                 │   │
│  │    - Stochastic K/D                                                 │   │
│  │    - CCI                                                            │   │
│  │    - MACD histogram & signal distance                               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 4. TREND FEATURES                                                   │   │
│  │    - ADX & strength                                                 │   │
│  │    - +DI / -DI                                                      │   │
│  │    - SuperTrend signal                                              │   │
│  │    - Ichimoku signal                                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 5. MICROSTRUCTURE FEATURES                                          │   │
│  │    - Average spread                                                 │   │
│  │    - Spread trend                                                   │   │
│  │    - Trade intensity                                                │   │
│  │    - Order imbalance                                                │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 6. TIME FEATURES (Cyclical Encoding)                                │   │
│  │    - Hour sin/cos (cyclical)                                        │   │
│  │    - Day sin/cos (cyclical)                                         │   │
│  │    - Trading sessions (Asian/London/NY)                             │   │
│  │    - Session overlaps                                               │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 7. SESSION PERFORMANCE                                               │   │
│  │    - Win rate by hour                                               │   │
│  │    - Win rate by day                                                │   │
│  │    - Average PnL by hour                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Feature Count

| Category | Feature Count |
|----------|---------------|
| Price | 10 |
| Volume | 4 |
| Momentum | 9 |
| Trend | 6 |
| Microstructure | 5 |
| Time | 9 |
| Session Performance | 3 |
| **Total** | **46** |

### Usage

```typescript
import { getAdvancedFeatureExtractor } from '@/lib/ml/advanced-feature-engineering'

const extractor = getAdvancedFeatureExtractor()

// Extract all features
const features = extractor.extractFeatures(high, low, close, volume)

// Update session stats
extractor.updateSessionStats(timestamp, true, 2.5)
```

## 2. Ensemble Methods

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENSEMBLE CLASSIFIER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         INPUT FEATURES                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                              │                                              │
│              ┌───────────────┼───────────────┬───────────────┐             │
│              ▼               ▼               ▼               ▼             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│  │   LAWRENCE    │ │   MOMENTUM    │ │    TREND      │ │   SESSION     │  │
│  │  CLASSIFIER   │ │  CLASSIFIER   │ │  CLASSIFIER   │ │  CLASSIFIER   │  │
│  │   Weight: 1.0 │ │  Weight: 0.8  │ │  Weight: 0.9  │ │  Weight: 0.6  │  │
│  └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘  │
│         │                │                │                │              │
│         └────────────────┼────────────────┴────────────────┘              │
│                          ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      AGGREGATION METHODS                               │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                      │  │
│  │  │   VOTING    │ │  WEIGHTED   │ │  STACKING   │                      │  │
│  │  │  (Hard/Soft)│ │   AVERAGE   │ │  (Meta-ML)  │                      │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                          │                                                 │
│                          ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      ENSEMBLE RESULT                                   │  │
│  │  - Direction: LONG/SHORT/NEUTRAL                                       │  │
│  │  - Confidence: 0-1                                                      │  │
│  │  - Agreement: 0-1 (how much classifiers agree)                         │  │
│  │  - Entropy: 0-1 (prediction uncertainty)                               │  │
│  │  - Consensus Strength: 0-1                                              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Aggregation Methods

| Method | Description | Best For |
|--------|-------------|----------|
| **Hard Voting** | Majority wins | Binary decisions |
| **Soft Voting** | Weighted probabilities | Multi-class problems |
| **Weighted Average** | Performance-weighted | Heterogeneous classifiers |
| **Stacking** | Meta-learner on top | Maximum accuracy |

### Dynamic Weighting

Weights are dynamically adjusted based on recent performance:

```typescript
effectiveWeight = baseWeight * recentAccuracy
```

### Usage

```typescript
import { getEnsembleClassifier } from '@/lib/ml/ensemble-classifier'

const ensemble = getEnsembleClassifier({
  method: 'weighted_average',
  dynamicWeighting: true,
})

const result = await ensemble.predict(features)

console.log(result.direction)          // LONG/SHORT/NEUTRAL
console.log(result.confidence)         // 0-1
console.log(result.agreement)          // Classifier agreement
console.log(result.classifierResults)  // Individual results
```

## 3. Real-time Learning

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REAL-TIME LEARNING PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         SAMPLE BUFFER                                   │  │
│  │   [Sample 1] [Sample 2] ... [Sample N]                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                          │                                                 │
│                          ▼                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    BATCH PROCESSING                                     │  │
│  │   - Min samples: 10                                                    │  │
│  │   - Batch size: 50                                                     │  │
│  │   - Learning rate: 0.1                                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                          │                                                 │
│              ┌───────────┴───────────┐                                    │
│              ▼                       ▼                                    │
│  ┌───────────────────┐   ┌───────────────────────────────────────────┐    │
│  │    TRAINING       │   │         DRIFT DETECTION                    │    │
│  │  (Lawrence +      │   │   - Performance window: 100               │    │
│  │   Ensemble)       │   │   - Drift threshold: 0.15                 │    │
│  └───────────────────┘   │   - Auto-adjust learning rate             │    │
│                          └───────────────────────────────────────────┘    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     PERFORMANCE TRACKING                                │  │
│  │   - Accuracy: 65.2%                                                    │  │
│  │   - Recent accuracy: 68.1%                                             │  │
│  │   - Drift detected: No                                                 │  │
│  │   - Effective LR: 0.12                                                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Concept Drift Detection

Drift is detected when:
1. Recent accuracy drops significantly below baseline
2. Performance window shows sustained degradation
3. Distribution shift exceeds threshold

When drift is detected:
1. Learning rate is increased
2. Model adapts faster to new patterns
3. Alert is logged for monitoring

### Usage

```typescript
import { getRealTimeLearner } from '@/lib/ml/realtime-learning'

const learner = getRealTimeLearner({
  enabled: true,
  batchSize: 50,
  driftDetection: true,
})

// Add training sample
learner.addSample({
  features: { n_rsi: 0.6, n_trend: 0.7, ... },
  label: 'LONG',
  weight: 0.8,
  timestamp: Date.now(),
})

// Report outcome for drift detection
learner.reportOutcome(true) // correct prediction

// Get stats
const stats = learner.getStats()
```

## Files Created

| File | Description | Lines |
|------|-------------|-------|
| `/src/lib/ml/advanced-feature-engineering.ts` | Extended feature extraction | ~900 |
| `/src/lib/ml/ensemble-classifier.ts` | Multi-classifier ensemble | ~550 |
| `/src/lib/ml/realtime-learning.ts` | Continuous learning system | ~350 |

## Feature Importance (Extended)

| Feature | Importance | Category |
|---------|------------|----------|
| n_rsi | 15.0% | Momentum |
| n_cci | 12.0% | Momentum |
| ema_cross_5_20 | 10.0% | Price |
| n_adx | 10.0% | Trend |
| volume_ratio | 8.0% | Volume |
| atr_percent | 7.0% | Volatility |
| session_overlap | 6.0% | Time |
| bollinger_width | 5.0% | Volatility |
| stochastic_k | 5.0% | Momentum |
| hour_sin/cos | 4.0% | Time |

## Next Steps

After completing medium-term tasks, proceed to:

1. **Long-term**:
   - Deep Learning Integration
   - Reinforcement Learning
   - Multi-timeframe Analysis
