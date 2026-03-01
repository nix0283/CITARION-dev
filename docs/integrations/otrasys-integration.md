# OTraSys Integration Report

## Source Repository

**Repository:** https://gitlab.com/werwurm/OTraSys  
**Author:** Denis Zetzmann (d1z@gmx.de)  
**License:** GNU General Public License v3.0  
**Language:** C  
**Description:** Open Trading System - An open source framework to create trading systems with Ichimoku Kinko Hyo as primary strategy

---

## Key Components for CITARION Integration

### 1. Ichimoku Signal Types ✅

OTraSys implements 5 Ichimoku signal types with strength classification:

| Signal Type | Description | Strength Determination |
|-------------|-------------|------------------------|
| **Kijun Cross** | Price crosses Kijun-sen | Above/below/inside Kumo |
| **Tenkan/Kijun Cross** | Tenkan crosses Kijun | Above/below/inside Kumo |
| **Kumo Breakout** | Price breaks through cloud | Strong by default |
| **Senkou Cross** | Senkou A crosses Senkou B | Above/below/inside Kumo |
| **Chikou Cross** | Chikou crosses price | Above/below/inside Kumo |

**Signal Strength Logic:**
```
Long signal:
- strong: signal above Kumo (uptrend)
- neutral: signal inside Kumo (sideways)
- weak: signal below Kumo (downtrend)

Short signal:
- strong: signal below Kumo (downtrend)
- neutral: signal inside Kumo (sideways)
- weak: signal above Kumo (uptrend)
```

### 2. Signal Filters ✅

OTraSys implements two key filters:

**a) Chikou Confirmation (ICHI_CHIKOU_CONFIRM)**
```c
// Signal is only valid if kumo_trend == chikou_trend
if(newSignal->strength == strong) {
    if(!(kumo_trend == chikou_trend))
        signal_filtered = true;
}
```

**b) Kumo Confirmation (ICHI_KUMO_CONFIRM)**
```c
// Uses persistence1D algorithm to detect local extrema
// Signal is valid only at new highs/lows
if(!check_new_lowhigh(daynr, close_quotes, ind_minima, ind_maxima, nr_maxima, signal_type))
    signal_filtered = true;
```

### 3. TNI (Trend Normalization Index) ✅

OTraSys includes TNI calculation:
```c
int ichimoku_tni(class_indicators *tenkan, class_indicators *kijun, 
                  class_indicators *senkouA, class_indicators *senkouB, 
                  class_indicators *tni);
```

**This confirms our TNI implementation approach is correct!**

### 4. Stop Loss Types ✅

OTraSys implements 3 stop loss strategies:

| Stop Type | Formula | Parameters |
|-----------|---------|------------|
| **Percentage** | `SL = price * (1 ± percentage)` | SL_PERCENTAGE_RISK |
| **Chandelier** | `SL = HH/LL - ATR * factor` | SL_ATR_PERIOD, SL_ATR_FACTOR |
| **ATR** | `SL = price - ATR * factor` | SL_ATR_PERIOD, SL_ATR_FACTOR |

**Stop Loss Adjustment Modes:**
- `fixed`: Initial SL only, never moves
- `trailing`: SL moves only in trend direction
- `updown`: SL moves up and down with price (for volatility-based)

### 5. Trend Detection ✅

```c
typedef enum {
    uptrend,
    downtrend,
    sideways
} trend_type;
```

Functions:
- `ichimoku_relation_to_kumo()` - Price position relative to cloud
- `ichimoku_get_chikou_trend()` - Chikou span trend status
- `ichimoku_update_trendStat()` - Update market trend statistics

### 6. Golden/Death Cross Detection ✅

```c
bool ichimoku_golden_X(unsigned int daynr, double* quotes_1, double* quotes_2, int offset_days);
bool ichimoku_death_X(unsigned int daynr, double* quotes_1, double* quotes_2, int offset_days);
```

---

## CITARION Integration Status

### Already Implemented (Task ID 93)

| Component | Status | Notes |
|-----------|--------|-------|
| ADX | ✅ Complete | Full ADX, +DI, -DI with Wilder's smoothing |
| TNI | ✅ Complete | Trend Normalization Index |
| Regime Detection | ✅ Complete | 5 market regimes |
| Signal Filtering | ✅ Complete | Combined filterScore |
| Ichimoku Confirmation | ✅ Complete | TK Cross, Cloud Position, Chikou |

### OTraSys Components to Integrate

| Component | Priority | Status | Notes |
|-----------|----------|--------|-------|
| Chandelier Stop | High | ⬜ Pending | ATR-based volatility stop |
| Signal Strength | High | ⬜ Pending | 3-level classification |
| Kumo Confirmation | Medium | ⬜ Pending | Local extrema detection |
| Trailing Stop Logic | Medium | ⬜ Pending | Fixed/Trailing/Updown modes |
| Exit Signals | High | ⬜ Pending | 4 exit types from OTraSys |

---

## Recommended Integration Tasks

### Task 1: Enhance Ichimoku Signal Strength (High Priority)

Port OTraSys signal strength logic to CITARION:

```typescript
interface IchimokuSignalEnhanced {
  type: 'kijun_cross' | 'tk_cross' | 'kumo_breakout' | 'senkou_cross' | 'chikou_cross';
  direction: 'long' | 'short';
  strength: 'strong' | 'neutral' | 'weak';
  price: number;
  time: number;
  kumoPosition: 'above' | 'below' | 'inside';
  chikouConfirm: boolean;
}
```

### Task 2: Implement Chandelier Stop (High Priority)

Port from OTraSys:

```typescript
function chandelierStop(
  highestHigh: number,  // For long positions
  lowestLow: number,    // For short positions
  atr: number,
  atrFactor: number,
  signalType: 'long' | 'short'
): number {
  switch(signalType) {
    case 'long':
      return highestHigh - atr * atrFactor;
    case 'short':
      return lowestLow + atr * atrFactor;
  }
}
```

### Task 3: Implement Exit Signals (High Priority)

OTraSys defines 4 exit signal types:

1. **Kumo Reentry Exit** - Price re-enters cloud
2. **Kijun Exit** - Price crosses Kijun against position
3. **Chikou Exit** - Chikou crosses price against position
4. **Stop Loss Exit** - Price hits stop loss

### Task 4: Implement Stop Loss Modes (Medium Priority)

```typescript
type StopLossMode = 'fixed' | 'trailing' | 'updown';

function shouldUpdateStopLoss(
  newStop: number,
  oldStop: number,
  mode: StopLossMode,
  signalType: 'long' | 'short'
): boolean {
  switch(mode) {
    case 'fixed':
      return false;
    case 'trailing':
      return signalType === 'long' 
        ? newStop > oldStop 
        : newStop < oldStop;
    case 'updown':
      return true;
  }
}
```

### Task 5: Local Extrema Detection (Medium Priority)

For Kumo Confirmation filter:

```typescript
// Uses persistence1D algorithm concept
interface LocalExtrema {
  minima: number[];  // Array of indices
  maxima: number[];  // Array of indices
}

function detectLocalExtrema(prices: number[]): LocalExtrema;
```

---

## Architecture Comparison

### OTraSys (C)
```
main.c
  └── class_market (market data)
      ├── class_indicators (OHLCV, Ichimoku)
      ├── class_signals (signal detection)
      ├── class_portfolio (position management)
      └── class_orderbook (order execution)
```

### CITARION (TypeScript/Next.js)
```
src/
├── lib/
│   ├── indicators/ (technical indicators)
│   │   ├── ichimoku.ts ✅
│   │   └── regime-filter.ts ✅
│   ├── strategy/ (signal generation)
│   ├── backtesting/ (backtest engine)
│   └── risk/ (risk management) ✅
└── app/api/ (REST endpoints)
```

---

## Code Quality Notes

### OTraSys Strengths
1. **Clean Signal Classification** - 5 signal types with strength levels
2. **Multiple Filter Mechanisms** - Chikou and Kumo confirmation
3. **Flexible Stop Loss** - 3 types, 3 adjustment modes
4. **Database Integration** - Full MySQL support
5. **Well Documented** - Doxygen comments throughout

### OTraSys Limitations (for CITARION context)
1. **C Language** - Not directly usable in TypeScript/Next.js
2. **MySQL Dependency** - CITARION uses SQLite/Prisma
3. **Single Strategy Focus** - Ichimoku only
4. **No Web Interface** - Terminal only

---

## Implementation Priorities

### Phase 1: Signal Enhancement (Week 1)
- [ ] Port signal strength classification
- [ ] Implement Chikou confirmation filter
- [ ] Add exit signal detection

### Phase 2: Stop Loss Enhancement (Week 2)
- [ ] Port Chandelier Stop
- [ ] Implement trailing stop logic
- [ ] Add stop loss modes

### Phase 3: Advanced Features (Week 3)
- [ ] Implement local extrema detection
- [ ] Add Kumo confirmation filter
- [ ] Integrate with existing regime filter

---

## References

- OTraSys Repository: https://gitlab.com/werwurm/OTraSys
- OTraSys Wiki: https://gitlab.com/werwurm/OTraSys/-/wikis/home
- Chandelier Exit: http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:chandelier_exit
- persistence1D: https://github.com/seelabucr/persistence1d

---

## Conclusion

OTraSys provides an excellent reference implementation for:
1. **Ichimoku signal classification** with strength levels
2. **Signal filtering** through Chikou and Kumo confirmation
3. **Stop loss strategies** including Chandelier and trailing stops
4. **Exit signal detection** for position management

The C codebase is well-structured and documented, making it straightforward to port the logic to TypeScript for CITARION. The most valuable components for immediate integration are:

1. **Signal strength classification** - Enhances our existing Ichimoku module
2. **Chandelier Stop** - Complements our existing ATR-based stops
3. **Exit signals** - Adds position exit logic
4. **TNI calculation** - Confirms our implementation approach

**Recommended Action:** Proceed with Phase 1 implementation, starting with signal strength enhancement.
