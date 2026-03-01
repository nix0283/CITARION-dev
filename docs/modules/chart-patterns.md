# Chart Patterns Detection Module

## Overview

This module provides algorithmic detection of chart patterns for technical analysis. All patterns are detected using mathematical algorithms without any AI/ML, making them fast, deterministic, and explainable.

**Source:** Ported from [zeta-zetra/chart_patterns](https://github.com/zeta-zetra/chart_patterns) (Python)

**Implementation:** `/src/lib/indicators/chart-patterns.ts`

---

## Supported Patterns

### Reversal Patterns

| Pattern | Direction | Description |
|---------|-----------|-------------|
| **Head and Shoulders** | Bearish | Three peaks with the middle (head) higher than shoulders |
| **Inverse Head and Shoulders** | Bullish | Three troughs with the middle (head) lower than shoulders |
| **Double Top** | Bearish | Two peaks at approximately same level |
| **Double Bottom** | Bullish | Two troughs at approximately same level |
| **Triple Top** | Bearish | Three peaks at approximately same level |
| **Triple Bottom** | Bullish | Three troughs at approximately same level |
| **Rising Wedge** | Bearish | Both trendlines rising, lower steeper |
| **Falling Wedge** | Bullish | Both trendlines falling, upper steeper |

### Continuation Patterns

| Pattern | Direction | Description |
|---------|-----------|-------------|
| **Ascending Triangle** | Bullish | Flat upper line, rising lower line |
| **Descending Triangle** | Bearish | Falling upper line, flat lower line |
| **Symmetrical Triangle** | Neutral | Both trendlines converging |
| **Bull Flag** | Bullish | Parallel lines sloping downward |
| **Bear Flag** | Bearish | Parallel lines sloping upward |
| **Pennant** | Neutral | Short-term converging lines |
| **Rectangle** | Neutral | Horizontal parallel lines |

---

## Algorithm

### Core Components

#### 1. Pivot Points Detection

Pivot points are local extrema (peaks and valleys) in price data. They form the building blocks for all pattern detection.

```typescript
// Pivot detection logic
- Pivot Low: Current low is lowest among left_count + right_count candles
- Pivot High: Current high is highest among left_count + right_count candles
- Returns: 0 = not pivot, 1 = low, 2 = high, 3 = both
```

**Parameters:**
- `leftCount`: Number of candles to the left (default: 3)
- `rightCount`: Number of candles to the right (default: 3)

#### 2. Linear Regression

Used to fit trendlines through pivot points and calculate:
- **Slope**: Direction and steepness of the trendline
- **Intercept**: Starting point of the trendline
- **R-squared**: Quality of fit (0-1, higher is better)

#### 3. Pattern Detection Workflow

```
1. Find all pivot points in OHLC data
2. Separate into highs and lows
3. For each candle position:
   a. Gather pivots within lookback period
   b. Fit trendlines using linear regression
   c. Check pattern-specific conditions
   d. Calculate confidence score
4. Remove overlapping patterns (keep highest confidence)
5. Return filtered results
```

---

## API Usage

### REST API Endpoint

**Endpoint:** `POST /api/indicators/chart-patterns`

**Request Body:**
```json
{
  "data": [
    { "time": 1700000000, "open": 100, "high": 105, "low": 98, "close": 103 },
    ...
  ],
  "lookback": 60,
  "pivotInterval": 5,
  "minRSquared": 0.85,
  "patterns": ["head_and_shoulders", "double_top"],
  "direction": "bearish",
  "minConfidence": 0.5,
  "includePivots": false
}
```

**Response:**
```json
{
  "success": true,
  "totalCandles": 500,
  "config": { ... },
  "summary": {
    "totalPatterns": 5,
    "byDirection": {
      "bullish": 2,
      "bearish": 2,
      "neutral": 1
    },
    "byType": {
      "head_and_shoulders": 1,
      "double_top": 1,
      ...
    }
  },
  "patterns": [
    {
      "type": "head_and_shoulders",
      "direction": "bearish",
      "startIndex": 150,
      "endIndex": 200,
      "confidence": 0.85,
      "points": [
        { "index": 150, "value": 50250, "label": "Left Shoulder" },
        { "index": 165, "value": 49800, "label": "Neckline Left" },
        { "index": 180, "value": 51000, "label": "Head" },
        { "index": 195, "value": 49750, "label": "Neckline Right" },
        { "index": 200, "value": 50100, "label": "Right Shoulder" }
      ],
      "rSquared": 0.92
    }
  ],
  "latestPatterns": [ ... ]
}
```

### Programmatic Usage

```typescript
import {
  detectAllChartPatterns,
  findHeadAndShoulders,
  findDoubleTop,
  findAllPivotPoints,
  OHLC,
} from '@/lib/indicators/chart-patterns';

// Detect all patterns
const result = detectAllChartPatterns(ohlcData, {
  lookback: 60,
  pivotInterval: 5,
  minRSquared: 0.85,
});

// Access results
console.log('Total patterns:', result.patterns.length);
console.log('Bullish patterns:', result.byDirection.bullish);
console.log('Bearish patterns:', result.byDirection.bearish);

// Detect specific pattern
const hnsPatterns = findHeadAndShoulders(ohlcData);
const doubleTops = findDoubleTop(ohlcData);

// Get pivot points
const pivots = findAllPivotPoints(ohlcData);
console.log('High pivots:', pivots.filter(p => p.type === 'high').length);
console.log('Low pivots:', pivots.filter(p => p.type === 'low').length);
```

---

## UI Component

### ChartPatternPanel

Location: `/src/components/indicators/chart-pattern-panel.tsx`

```tsx
import { ChartPatternPanel } from '@/components/indicators/chart-pattern-panel';

function TradingView() {
  const [selectedPattern, setSelectedPattern] = useState(null);

  return (
    <ChartPatternPanel
      data={ohlcData}
      onSelectPattern={(pattern) => setSelectedPattern(pattern)}
      showPivots={true}
      minConfidence={0.6}
      filterDirection="bearish"
    />
  );
}
```

**Props:**
- `data`: OHLC data array
- `onSelectPattern`: Callback when pattern is selected
- `showPivots`: Show pivot points count (default: false)
- `minConfidence`: Minimum confidence filter (default: 0.5)
- `filterDirection`: Filter by direction ('bullish' | 'bearish' | 'neutral' | 'all')
- `filterType`: Filter by pattern types array

---

## Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lookback` | number | 60 | Number of candles to look back for pattern detection |
| `pivotInterval` | number | 5 | Candles on each side for pivot detection |
| `minRSquared` | number | 0.85 | Minimum R² for trendline quality |
| `maxFlatSlope` | number | 0.0001 | Maximum slope considered "flat" |
| `doubleRatio` | number | 0.02 | Tolerance ratio for double tops/bottoms |
| `headShoulderRatio` | number | 0.002 | Head-to-shoulder ratio tolerance |

---

## Pattern Detection Details

### Head and Shoulders

```
Detection Criteria:
1. Find three pivot highs (left shoulder, head, right shoulder)
2. Head must be highest (at least 1% higher than shoulders)
3. Shoulders must be roughly equal (within 5% tolerance)
4. Find two pivot lows for neckline
5. Neckline slope must be relatively flat (< 0.001)
6. Calculate confidence from head ratio and shoulder symmetry
```

### Double Top/Bottom

```
Detection Criteria:
1. Find two pivot highs (top) or lows (bottom)
2. Peaks/troughs must be within doubleRatio tolerance
3. Must have significant trough/peak between them (at least 1%)
4. Confidence based on peak/trough equality
```

### Triangles

```
Detection Criteria:
1. Gather pivot highs and lows in lookback window
2. Fit linear regression through each
3. Check R² meets minimum threshold
4. Ascending: flat upper line, rising lower line
5. Descending: falling upper line, flat lower line
6. Symmetrical: converging lines with similar slopes
```

### Flags and Wedges

```
Flag Detection:
1. Both trendlines parallel (slope ratio 0.8-1.2)
2. Bull flag: downward sloping
3. Bear flag: upward sloping
4. High R² for both trendlines

Wedge Detection:
1. Both trendlines sloping in same direction
2. Rising wedge: lower trendline steeper (bearish)
3. Falling wedge: upper trendline steeper (bullish)
```

---

## Performance Considerations

### Complexity

- **Pivot Detection:** O(n × (left + right)) where n = number of candles
- **Pattern Detection:** O(n × lookback) for each pattern type
- **Total:** O(n × lookback × pattern_types)

### Optimization Tips

1. **Reduce lookback:** Smaller lookback windows are faster
2. **Filter pattern types:** Only detect needed patterns
3. **Pre-filter data:** Work with smaller datasets when possible
4. **Cache results:** Patterns don't change for historical data

### Recommended Settings

| Timeframe | Lookback | Pivot Interval |
|-----------|----------|----------------|
| 1m - 5m | 60 | 3 |
| 15m - 1h | 60 | 5 |
| 4h - 1d | 90 | 7 |
| Weekly+ | 120 | 10 |

---

## Integration with CITARION

### Chart Overlay

Patterns can be displayed on the main chart:

```typescript
// Pattern points can be drawn on chart
pattern.points.forEach(point => {
  // Draw marker at point.index, point.value
  // Label with point.label
});

// Trendlines can be drawn using slope and intercept
const trendlineY = slope * index + intercept;
```

### Signal Generation

```typescript
// Generate signals from detected patterns
const signals = patterns.map(pattern => ({
  type: pattern.direction === 'bullish' ? 'BUY' : 'SELL',
  confidence: pattern.confidence,
  reason: `Detected ${pattern.type} pattern`,
  entryIndex: pattern.endIndex,
  targetPrice: calculateTarget(pattern),
  stopLoss: calculateStopLoss(pattern),
}));
```

### Alert System

```typescript
// Set up alerts for new patterns
if (latestPatterns.length > 0) {
  latestPatterns.forEach(pattern => {
    sendAlert({
      type: 'CHART_PATTERN',
      pattern: pattern.type,
      direction: pattern.direction,
      confidence: pattern.confidence,
    });
  });
}
```

---

## Testing

### Unit Tests

Located in `/src/lib/indicators/__tests__/chart-patterns.test.ts`

```bash
# Run tests
bun test src/lib/indicators/__tests__/chart-patterns.test.ts
```

### Test Data

Sample test data available at:
- `/download/chart_patterns/data/eurusd-4h.csv`

---

## References

1. **Original Library:** [zeta-zetra/chart_patterns](https://github.com/zeta-zetra/chart_patterns)
2. **Bulkowski, Thomas N.** "Encyclopedia of Chart Patterns"
3. **Murphy, John J.** "Technical Analysis of the Financial Markets"
4. **Pring, Martin J.** "Technical Analysis Explained"

---

## Changelog

### v1.0.0 (2024)
- Initial TypeScript port from Python
- 15 pattern types implemented
- REST API endpoint
- UI component
- Full documentation

---

## License

MIT License - Original Python code by Zetra Team, TypeScript port by CITARION Team
