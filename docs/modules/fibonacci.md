# Fibonacci Retracement Detection Module

## Overview

This module provides algorithmic detection of Fibonacci retracement levels for technical analysis. All calculations are performed mathematically without AI/ML, providing fast and deterministic results.

**Source:** Ported from [white07S/Forex-Fibonacci](https://github.com/white07S/Forex-Fibonacci) (Python)

**Implementation:** `/src/lib/indicators/fibonacci.ts`

---

## Fibonacci Levels

### Retracement Levels (Within Range)

| Level | Name | Significance | Strength |
|-------|------|--------------|----------|
| 0% | Start | Beginning of the move | Very Strong |
| 23.6% | Shallow | Minor retracement | Weak |
| 38.2% | Moderate | Common pullback level | Moderate |
| 50% | Half | Psychological level | Moderate |
| **61.8%** | **Golden Ratio** | **Most significant** | **Strong** |
| 78.6% | Deep | Extended retracement | Strong |
| 100% | End | Complete retracement | Very Strong |

### Extension Levels (Beyond Range)

| Level | Name | Significance | Strength |
|-------|------|--------------|----------|
| 127.2% | Extension 1 | First target | Moderate |
| 141.4% | Extension 2 | Secondary target | Moderate |
| 161.8% | Golden Extension | Major target | Strong |
| 200% | Double | 2x the range | Moderate |
| 261.8% | Extended | 2.618x the range | Strong |
| 423.6% | Far Extension | Maximum target | Weak |

---

## Algorithm

### Core Components

#### 1. Swing Point Detection

Swing points are local maxima and minima used to identify the price range for Fibonacci calculations.

```typescript
// Swing High: current high is highest among left + right candles
// Swing Low: current low is lowest among left + right candles

function findSwingHighs(data: OHLC[], leftBars: number, rightBars: number): SwingPoint[]
function findSwingLows(data: OHLC[], leftBars: number, rightBars: number): SwingPoint[]
```

**Parameters:**
- `leftBars`: Number of candles to the left (default: 3)
- `rightBars`: Number of candles to the right (default: 3)

#### 2. Fibonacci Level Calculation

```typescript
// Calculate Fibonacci levels between high and low
function calculateFibonacciLevels(
  high: number,
  low: number,
  includeExtensions: boolean = true
): FibonacciLevel[]

// Formula: level_value = high - (high - low) × fib_level
```

#### 3. Drawdown Detection

Identifies periods of significant price decline for Fibonacci analysis context.

```typescript
function findDrawdownPeriods(
  data: OHLC[],
  drawdownCriteria: number = 0.15,  // 15% threshold
  recoveryCriteria: number = 0.02   // 2% recovery
): DrawdownPeriod[]
```

#### 4. Retracement Detection

Main function that identifies Fibonacci retracements in price data.

```typescript
function detectFibonacciRetracement(
  data: OHLC[],
  config: FibonacciConfig
): FibonacciRetracement | null
```

**Algorithm:**
```
1. Find significant swing points (high and low)
2. Calculate price range and direction
3. Generate Fibonacci levels
4. Find current price position relative to levels
5. Identify nearest support and resistance
6. Return complete retracement object
```

---

## API Usage

### REST API Endpoint

**Endpoint:** `POST /api/indicators/fibonacci`

**Request Body:**
```json
{
  "data": [
    { "time": 1700000000, "open": 100, "high": 105, "low": 98, "close": 103 },
    ...
  ],
  "swingThreshold": 0.03,
  "drawdownCriteria": 0.15,
  "lookback": 100,
  "includeExtensions": true,
  "includeSwings": false,
  "includeDrawdowns": false,
  "customHigh": null,
  "customLow": null
}
```

**Response:**
```json
{
  "success": true,
  "totalCandles": 500,
  "config": { ... },
  "summary": {
    "trend": "bullish",
    "currentLevel": "45.2%",
    "nearestSupport": 48500,
    "nearestResistance": 52000,
    "signalCount": 3
  },
  "retracement": {
    "direction": "bullish",
    "priceRange": {
      "high": 55000,
      "low": 45000,
      "range": 10000
    },
    "currentLevel": 0.452,
    "goldenRatio": 48820,
    "nearestSupport": 48500,
    "nearestResistance": 52000,
    "swingHigh": { "index": 150, "value": 55000 },
    "swingLow": { "index": 100, "value": 45000 },
    "levels": [
      { "level": 0, "value": 55000, "name": "Start", "type": "retracement", "strength": "very_strong" },
      { "level": 0.236, "value": 52640, "name": "23.6%", "type": "retracement", "strength": "weak" },
      ...
    ]
  },
  "zones": [...],
  "signals": [...]
}
```

### Programmatic Usage

```typescript
import {
  analyzeFibonacci,
  detectFibonacciRetracement,
  calculateFibonacciLevels,
  findSwingHighs,
  findSwingLows,
  OHLC,
} from '@/lib/indicators/fibonacci';

// Complete analysis
const analysis = analyzeFibonacci(ohlcData, {
  swingThreshold: 0.03,
  drawdownCriteria: 0.15,
  lookback: 100,
});

console.log('Trend:', analysis.summary.trend);
console.log('Current Level:', analysis.summary.currentLevel);
console.log('Golden Ratio:', analysis.retracement?.goldenRatio);
console.log('Signals:', analysis.signals);

// Just detect retracement
const retracement = detectFibonacciRetracement(ohlcData);
if (retracement) {
  console.log('Direction:', retracement.direction);
  console.log('Levels:', retracement.levels);
}

// Calculate specific levels
const levels = calculateFibonacciLevels(55000, 45000, true);
levels.forEach(level => {
  console.log(`${level.name}: ${level.value}`);
});

// Find swing points
const highs = findSwingHighs(ohlcData, 5, 5);
const lows = findSwingLows(ohlcData, 5, 5);
```

---

## UI Component

### FibonacciPanel

Location: `/src/components/indicators/fibonacci-panel.tsx`

```tsx
import { FibonacciPanel } from '@/components/indicators/fibonacci-panel';

function TradingView() {
  return (
    <FibonacciPanel
      data={ohlcData}
      showZones={true}
      showSignals={true}
      showDrawdowns={false}
      config={{
        swingThreshold: 0.03,
        lookback: 100,
      }}
      onLevelClick={(level) => {
        console.log('Clicked:', level.name, level.value);
      }}
    />
  );
}
```

**Props:**
- `data`: OHLC data array
- `showZones`: Show Fibonacci zones (default: true)
- `showSignals`: Show trading signals (default: true)
- `showDrawdowns`: Show drawdown periods (default: false)
- `config`: Detection configuration
- `onLevelClick`: Callback when a level is clicked

---

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `swingThreshold` | number | 0.03 | Minimum swing size (3%) |
| `drawdownCriteria` | number | 0.15 | Drawdown threshold (15%) |
| `recoveryCriteria` | number | 0.02 | Recovery threshold (2%) |
| `includeExtensions` | boolean | true | Include extension levels |
| `lookback` | number | 100 | Candles to analyze |

---

## Trading Signals

### Signal Types

| Type | Description | Use Case |
|------|-------------|----------|
| **support** | Price near support level | Buy on bounce |
| **resistance** | Price near resistance level | Sell/short |
| **golden_cross** | Price in golden ratio zone | Strong reversal zone |
| **extension_target** | Extension target reached | Take profit |

### Signal Generation

```typescript
const signals = generateFibonacciSignals(retracement, currentPrice);

// Each signal contains:
// - type: 'support' | 'resistance' | 'golden_cross' | 'extension_target'
// - level: FibonacciLevel object
// - price: Price at the level
// - distance: Distance from current price
// - distancePercent: Distance as percentage
// - strength: 'weak' | 'moderate' | 'strong' | 'very_strong'
// - description: Human-readable description
```

---

## Fibonacci Zones

Zones are areas between consecutive Fibonacci levels where price action is significant.

```typescript
interface FibonacciZone {
  upperLevel: FibonacciLevel;
  lowerLevel: FibonacciLevel;
  zoneWidth: number;
  priceInZone: boolean;
  zoneName: string;
}

// Get zones
const zones = getFibonacciZones(retracement, currentPrice);
```

**Important Zones:**
- **Golden Zone**: 50% - 61.8% area (highest probability reversal)
- **Extension Zone**: Above 100% for targets
- **Shallow Zone**: 0% - 23.6% (weak retracements)

---

## Use Cases in Trading

### 1. Entry Points

```typescript
// Buy at golden ratio retracement in uptrend
if (retracement.direction === 'bullish' && 
    retracement.currentLevel >= 0.618 &&
    retracement.currentLevel <= 0.786) {
  // Strong buy signal - price at golden ratio zone
}
```

### 2. Take Profit Targets

```typescript
// Set targets at extension levels
const targets = calculateExtensions(
  swingHigh,
  swingLow,
  'bullish'
);

// Targets: 127.2%, 161.8%, 261.8%
```

### 3. Stop Loss Placement

```typescript
// Place stop below nearest support level
const stopLoss = retracement.nearestSupport;
// Or below 78.6% level
const stopLoss = retracement.levels.find(l => l.level === 0.786)?.value;
```

### 4. Trend Confirmation

```typescript
// Uptrend confirmed when price holds above 50%
if (retracement.direction === 'bullish' &&
    retracement.currentLevel < 0.5) {
  // Trend still intact
}
```

---

## Integration with CITARION

### Chart Overlay

```typescript
// Draw Fibonacci levels on chart
retracement.levels.forEach(level => {
  if (level.type === 'retracement') {
    chart.addPriceLine({
      price: level.value,
      color: level.level === 0.618 ? '#FFB800' : '#666666',
      lineWidth: level.level === 0.618 ? 2 : 1,
      lineStyle: level.strength === 'strong' ? 0 : 1,
    });
  }
});
```

### Signal Generation

```typescript
// Convert Fibonacci signals to CITARION signals
analysis.signals.forEach(signal => {
  addSignal({
    type: signal.type === 'support' ? 'BUY' : 'SELL',
    price: signal.price,
    confidence: signal.strength === 'very_strong' ? 0.9 :
                signal.strength === 'strong' ? 0.75 :
                signal.strength === 'moderate' ? 0.6 : 0.4,
    reason: signal.description,
    indicator: 'fibonacci',
  });
});
```

### Alert System

```typescript
// Alert when price enters golden zone
if (analysis.zones.some(z => z.priceInZone && z.zoneName.includes('61.8'))) {
  sendAlert({
    type: 'GOLDEN_ZONE_ENTRY',
    price: currentPrice,
    level: 0.618,
  });
}
```

---

## Mathematical Formulas

### Fibonacci Level Value

```
FibValue = High - (High - Low) × FibLevel

Where FibLevel = 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1
```

### Extension Value

```
ExtValue = High + (High - Low) × (ExtLevel - 1)

Where ExtLevel = 1.272, 1.414, 1.618, 2.0, 2.618
```

### Current Level Calculation

```
CurrentLevel = (High - CurrentPrice) / (High - Low)

Result: 0 to 1 for price within range, < 0 or > 1 for extensions
```

---

## Testing

### Unit Tests

Located in `/src/lib/indicators/__tests__/fibonacci.test.ts`

```bash
# Run tests
bun test src/lib/indicators/__tests__/fibonacci.test.ts
```

### Test Data

Sample test data available at:
- `/download/Forex-Fibonacci/` - Original Python test data

---

## References

1. **Original Library:** [white07S/Forex-Fibonacci](https://github.com/white07S/Forex-Fibonacci)
2. **Bulkowski, Thomas N.** "Encyclopedia of Chart Patterns"
3. **Murphy, John J.** "Technical Analysis of the Financial Markets"
4. **Fibonacci in Trading:** https://www.investopedia.com/terms/f/fibonacciretracement.asp

---

## Changelog

### v1.0.0 (2024)
- Initial TypeScript port from Python
- Fibonacci level detection
- Swing point identification
- Drawdown analysis
- Signal generation
- Zone calculation
- REST API endpoint
- UI component
- Full documentation

---

## License

MIT License - Original Python code by Preetam Sharma (white07S), TypeScript port by CITARION Team
