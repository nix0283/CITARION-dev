# Built-in Indicators Documentation

This document describes all available indicators in the CITARION platform for chart visualization.

## Overview

CITARION includes **62 indicators** organized into **8 categories**:

| Category | Count | Description |
|----------|-------|-------------|
| Moving Averages | 14 | Trend-following indicators based on price smoothing |
| Oscillators | 18 | Momentum indicators showing overbought/oversold conditions |
| Volatility | 13 | Indicators measuring price volatility |
| Volume | 9 | Indicators analyzing trading volume |
| Trend | 8 | Indicators determining trend direction and strength |
| Pivot Points | 5 | Support/resistance levels based on previous price action |
| Fibonacci | 3 | Fibonacci retracement and extension levels |
| Transforms | 2 | Alternative chart types (Heikin-Ashi, Renko) |

---

## Moving Averages (14)

### Overview
Moving averages smooth price data to identify trends. Different types respond differently to price changes.

| ID | Name | Overlay | Description |
|----|------|---------|-------------|
| `sma` | Simple Moving Average | Yes | Basic average of prices over period |
| `ema` | Exponential Moving Average | Yes | Faster response to recent prices |
| `wma` | Weighted Moving Average | Yes | Linear weighted average |
| `hma` | Hull Moving Average | Yes | Very fast and smooth |
| `vwma` | Volume Weighted MA | Yes | Weighted by volume |
| `smma` | Smoothed MA (RMA) | Yes | Used in RSI/ATR calculations |
| `dema` | Double EMA | Yes | Faster than EMA |
| `tema` | Triple EMA | Yes | Even faster than DEMA |
| `kama` | Kaufman Adaptive MA | Yes | Adapts to volatility |
| `vidya` | Variable Index Dynamic Average | Yes | Adapts based on CMO |
| `mcginley` | McGinley Dynamic | Yes | Automatically adjusts to market speed |
| `ema_cross` | EMA Cross | Yes | Two EMAs showing crossovers |
| `vwap` | Volume Weighted Average Price | Yes | Institutional benchmark price |
| `rolling_vwap` | Rolling VWAP | Yes | VWAP over sliding window |

### Parameters

| Indicator | Parameter | Type | Default | Range |
|-----------|-----------|------|---------|-------|
| SMA, EMA, WMA, HMA, VWMA, SMMA, DEMA, TEMA, McGinley | length | int | 20 | 1-500 |
| KAMA | length | int | 20 | 1-500 |
| KAMA | fast | int | 2 | 1-50 |
| KAMA | slow | int | 30 | 1-200 |
| VIDYA | length | int | 20 | 1-500 |
| VIDYA | cmoPeriod | int | 10 | 1-100 |
| EMA Cross | fastLength | int | 9 | 1-200 |
| EMA Cross | slowLength | int | 21 | 1-500 |
| VWAP | stddevBands | float | 1.0 | 0.1-3.0 |
| Rolling VWAP | length | int | 20 | 1-500 |

---

## Oscillators (18)

### Overview
Oscillators fluctuate within a range, indicating overbought/oversold conditions and momentum.

| ID | Name | Overlay | Range | Description |
|----|------|---------|-------|-------------|
| `rsi` | Relative Strength Index | No | 0-100 | Momentum oscillator |
| `macd` | MACD | No | Unlimited | Trend-following momentum |
| `ppo` | Percentage Price Oscillator | No | % | Similar to MACD in percentages |
| `stochastic` | Stochastic Oscillator | No | 0-100 | Position within price range |
| `stochrsi` | Stochastic RSI | No | 0-100 | Stochastic applied to RSI |
| `williams_r` | Williams %R | No | -100 to 0 | Overbought/oversold |
| `cci` | Commodity Channel Index | No | Unlimited | Price relative to average |
| `mfi` | Money Flow Index | No | 0-100 | RSI with volume |
| `roc` | Rate of Change | No | % | Price change percentage |
| `momentum` | Momentum | No | Price diff | Current vs past price |
| `cmo` | Chande Momentum Oscillator | No | -100 to +100 | Weighted momentum |
| `ultimate_oscillator` | Ultimate Oscillator | No | 0-100 | Weighted 3-period oscillator |
| `awesome_oscillator` | Awesome Oscillator | No | Unlimited | 5/34 SMA difference |
| `tsi` | True Strength Index | No | Unlimited | Double-smoothed momentum |
| `vortex` | Vortex Indicator | No | Unlimited | +VI/-VI trend direction |
| `mass_index` | Mass Index | No | Unlimited | Range reversal indicator |
| `adx` | Average Directional Index | No | 0-100 | Trend strength |

### Parameters

| Indicator | Parameter | Type | Default |
|-----------|-----------|------|---------|
| RSI | length | int | 14 |
| MACD | fastLength, slowLength, signalLength | int | 12, 26, 9 |
| PPO | fastLength, slowLength, signalLength | int | 12, 26, 9 |
| Stochastic | kPeriod, dPeriod, smoothK | int | 14, 3, 1 |
| StochRSI | rsiPeriod, stochPeriod, kPeriod, dPeriod | int | 14, 14, 3, 3 |
| Williams %R, CCI, MFI | length | int | 14, 20, 14 |
| ROC, Momentum, CMO | length | int | 10, 10, 14 |
| Ultimate Oscillator | period1, period2, period3 | int | 7, 14, 28 |
| Awesome Oscillator | fastLength, slowLength | int | 5, 34 |
| TSI | longLength, shortLength | int | 25, 13 |
| Vortex, Mass Index, ADX | length | int | 14, 9, 14 |

---

## Volatility (13)

### Overview
Volatility indicators measure the rate and magnitude of price movements.

| ID | Name | Overlay | Description |
|----|------|---------|-------------|
| `bb` | Bollinger Bands | Yes | SMA ± standard deviations |
| `bb_width` | Bollinger Band Width | No | Band width as % of SMA |
| `atr` | Average True Range | No | Average price range |
| `natr` | Normalized ATR | No | ATR as % of price |
| `true_range` | True Range | No | Raw range values |
| `keltner_channel` | Keltner Channel | Yes | EMA ± ATR multiplier |
| `donchian_channel` | Donchian Channel | Yes | Highest high / lowest low |
| `stddev` | Standard Deviation | No | Price deviation |
| `historical_volatility` | Historical Volatility | No | Annualized volatility |
| `supertrend` | SuperTrend | Yes | ATR-based trend indicator |
| `parabolic_sar` | Parabolic SAR | Yes | Trailing stop indicator |
| `ichimoku` | Ichimoku Cloud | Yes | Complete trend system |

### Parameters

| Indicator | Parameter | Type | Default |
|-----------|-----------|------|---------|
| Bollinger Bands | length, mult | int, float | 20, 2.0 |
| BB Width | length, mult | int, float | 20, 2.0 |
| ATR, NATR | length | int | 14 |
| Keltner Channel | emaPeriod, atrPeriod, multiplier | int, int, float | 20, 10, 2.0 |
| Donchian Channel, StdDev | length | int | 20 |
| Historical Volatility | length, annualize | int, bool | 20, true |
| SuperTrend | period, multiplier | int, float | 10, 3.0 |
| Parabolic SAR | start, increment, maximum | float | 0.02, 0.02, 0.2 |
| Ichimoku | tenkanPeriod, kijunPeriod, senkouBPeriod, displacement | int | 9, 26, 52, 26 |

---

## Volume (9)

### Overview
Volume indicators analyze trading activity to confirm price movements.

| ID | Name | Overlay | Description |
|----|------|---------|-------------|
| `obv` | On-Balance Volume | No | Cumulative volume indicator |
| `cmf` | Chaikin Money Flow | No | Buying/selling pressure |
| `adl` | Accumulation/Distribution Line | No | Volume flow indicator |
| `mfi` | Money Flow Index | No | Volume-weighted RSI |
| `volume_oscillator` | Volume Oscillator | No | Volume SMA difference |
| `emv` | Ease of Movement | No | Price-volume relationship |
| `vol_sma` | Volume with SMA | No | Volume bars with moving average |
| `vwap` | VWAP | Yes | Volume-weighted price |
| `rolling_vwap` | Rolling VWAP | Yes | Sliding window VWAP |

### Parameters

| Indicator | Parameter | Type | Default |
|-----------|-----------|------|---------|
| OBV, ADL | None | - | - |
| CMF, MFI | length | int | 20, 14 |
| Volume Oscillator | fastLength, slowLength | int | 5, 10 |
| EMV | length | int | 14 |
| Volume SMA | length | int | 20 |
| VWAP | stddevBands | float | 1.0 |
| Rolling VWAP | length | int | 20 |

---

## Trend (8)

### Overview
Trend indicators determine market direction and trend strength.

| ID | Name | Overlay | Description |
|----|------|---------|-------------|
| `adx` | ADX - Trend Strength | No | Measures trend strength |
| `aroon` | Aroon | No | Trend beginning indicator |
| `supertrend` | SuperTrend | Yes | ATR-based trend |
| `ichimoku` | Ichimoku Cloud | Yes | Complete trend system |
| `parabolic_sar` | Parabolic SAR | Yes | Trend reversal indicator |
| `vortex` | Vortex Indicator | No | +VI/-VI direction |
| `dmi` | Directional Movement Index | No | +DI/-DI lines |
| `kama` | Kaufman Adaptive MA | Yes | Adaptive trend |

---

## Pivot Points (5)

### Overview
Pivot points calculate support and resistance levels based on previous price action.

| ID | Name | Formula |
|----|------|---------|
| `pivot_standard` | Standard/Floor | PP = (H+L+C)/3 |
| `pivot_fibonacci` | Fibonacci | Uses 0.382, 0.618 levels |
| `pivot_camarilla` | Camarilla | 8 levels with range factor |
| `pivot_woodie` | Woodie | PP = (H+L+2C)/4 |
| `pivot_demark` | Demark | Based on Open vs Close |

### Parameters

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| useWeekly | bool | false | - |
| useMonthly | bool | false | - |

---

## Fibonacci (3)

### Overview
Fibonacci tools project support/resistance levels based on Fibonacci ratios.

| ID | Name | Description |
|----|------|-------------|
| `fibonacci_retracement` | Fibonacci Retracement | Levels: 23.6%, 38.2%, 50%, 61.8%, 78.6% |
| `fibonacci_extension` | Fibonacci Extension | Levels: 127.2%, 161.8%, 200%, 261.8% |
| `fibonacci_levels` | Fibonacci Levels | All retracement levels |

### Parameters

| Indicator | Parameter | Type | Default |
|-----------|-----------|------|---------|
| Fibonacci Retracement | showLevels | bool | true |
| Fibonacci Levels | lookback | int | 100 |

---

## Chart Transforms (2)

### Overview
Alternative chart representations for trend analysis.

| ID | Name | Description |
|----|------|-------------|
| `heikin_ashi` | Heikin-Ashi | Smoothed candles for trend clarity |
| `renko` | Renko | Brick chart ignoring time |

---

## Usage Examples

### Adding an Indicator to Chart

```typescript
import { calculateIndicator, getBuiltinIndicator } from '@/lib/indicators';

// Get indicator definition
const indicator = getBuiltinIndicator('rsi');

// Calculate values
const result = calculateIndicator(indicator, candles, { length: 14 });

// result.lines contains the line data for chart
// result.histograms contains histogram data
// result.overlay indicates if it goes on main chart or separate pane
```

### Getting All Indicators by Category

```typescript
import { getIndicatorsByCategory, getIndicatorCategories } from '@/lib/indicators';

const categories = getIndicatorCategories();
// ['moving_average', 'oscillator', 'volatility', ...]

const maIndicators = getIndicatorsByCategory('moving_average');
// Array of all moving average indicators
```

---

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `getBuiltinIndicators()` | Returns all built-in indicators |
| `getBuiltinIndicator(id)` | Get indicator by ID |
| `getIndicatorsByCategory(category)` | Filter by category |
| `getIndicatorCategories()` | List all categories |
| `getIndicatorCountByCategory()` | Count per category |
| `getTotalIndicatorCount()` | Total indicator count |
| `calculateIndicator(indicator, candles, inputs)` | Calculate indicator values |
| `isOverlayIndicator(indicator)` | Check if overlay |
| `getAvailableIndicators()` | List IDs with calculators |

---

## File Structure

```
/src/lib/indicators/
├── builtin.ts          # Indicator definitions (62 indicators)
├── calculator.ts       # Calculation functions
├── pivot.ts           # Pivot points implementation
├── ichimoku.ts        # Ichimoku cloud
├── fibonacci.ts       # Fibonacci levels
├── fractals.ts        # Williams Fractals
├── ta4j-port.ts       # SuperTrend, VWAP, Keltner, etc.
├── quantclub-port.ts  # Stochastic, ADX
├── heikin-ashi.ts     # Heikin-Ashi transform
├── renko.ts           # Renko transform
└── depth.ts           # Order book indicators
```

---

## Integration with Other Modules

CITARION's indicator system integrates with:

- **WolfBot Module**: 200+ additional indicators available programmatically
- **Jesse Module**: 70+ indicators in Jesse style
- **Incremental Module**: 80+ O(1) real-time indicators
- **TA-Lib Port**: 50+ TA-Lib functions
- **Backtesting Engine**: Use any indicator in strategy backtests
- **Paper Trading**: Real-time indicator calculations

---

## Version History

- **v2.0.0** (2025-01): Expanded from 38 to 62 indicators
  - Added: WMA, HMA, VWMA, SMMA, DEMA, TEMA, KAMA, VIDYA, McGinley, Rolling VWAP
  - Added: PPO, StochRSI, Williams %R, CCI, MFI, ROC, Momentum, CMO, Ultimate Oscillator, AO, TSI, Vortex
  - Added: BB Width, NATR, True Range, Donchian Channel, StdDev, Historical Volatility, Parabolic SAR
  - Added: OBV, CMF, ADL, Volume Oscillator, EMV
  - Added: Aroon, DMI
  - Added: Fibonacci Retracement, Extension, Levels
