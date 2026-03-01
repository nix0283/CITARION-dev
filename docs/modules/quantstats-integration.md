# quantstats Integration Module

## Overview

Professional portfolio analytics for quants. Provides comprehensive metrics, tear sheets, and reporting capabilities for strategy evaluation.

## Installation

The module is located at `/src/lib/quantstats/` and is already integrated into CITARION.

## Key Components

### 1. Performance Metrics

Calculate comprehensive performance metrics including:
- Return metrics (Total, CAGR, Daily/Monthly/Yearly averages)
- Risk metrics (Volatility, Max Drawdown, VaR, CVaR)
- Risk-adjusted metrics (Sharpe, Sortino, Calmar, Omega)
- Distribution metrics (Skewness, Kurtosis, Normality test)

```typescript
import { calculatePerformanceMetrics } from '@/lib/quantstats';

const metrics = calculatePerformanceMetrics(returns, benchmarkReturns, {
  riskFreeRate: 0.02,
  tradingDays: 252,
  varConfidence: 0.95,
});

console.log('Sharpe Ratio:', metrics.sharpeRatio);
console.log('Max Drawdown:', metrics.maxDrawdown);
console.log('VaR 95%:', metrics.var95);
```

### 2. Rolling Metrics

Calculate rolling window metrics for time-series analysis:

```typescript
import { calculateRollingMetrics } from '@/lib/quantstats';

const rolling = calculateRollingMetrics(returns, {
  rollingWindow: 252,
  riskFreeRate: 0.02,
});

// Access rolling metrics
rolling.rollingSharpe;      // Rolling Sharpe ratio
rolling.rollingVolatility;  // Rolling volatility
rolling.rollingDrawdown;    // Rolling drawdown
```

### 3. Tear Sheet Generation

Generate professional HTML tear sheets:

```typescript
import { generateTearSheet } from '@/lib/quantstats';

const tearSheet = generateTearSheet(returns, dates, {
  strategyName: 'Ichimoku Strategy',
  benchmarkName: 'BTC/USDT',
  riskFreeRate: 0.02,
  outputFormat: 'HTML',
  includePlots: true,
});

// Get HTML report
const html = tearSheet.htmlReport;

// Access metrics
const { performance, drawdownAnalysis, monthlyReturns } = tearSheet;
```

### 4. Drawdown Analysis

Detailed drawdown analysis with recovery statistics:

```typescript
import { calculateDrawdownAnalysis } from '@/lib/quantstats';

const ddAnalysis = calculateDrawdownAnalysis(returns);

// Results include:
// - All drawdown periods with start/end dates
// - Recovery times
// - Current drawdown status
// - Drawdown probability
```

### 5. Return Distribution

Statistical analysis of return distribution:

```typescript
import { calculateReturnDistribution } from '@/lib/quantstats';

const dist = calculateReturnDistribution(returns);

console.log('Skewness:', dist.skewness);
console.log('Kurtosis:', dist.kurtosis);
console.log('Is Normal:', dist.isNormal);
console.log('Percentiles:', dist.percentiles);
```

### 6. Benchmark Comparison

Compare strategy against benchmark:

```typescript
import { calculateBenchmarkComparison } from '@/lib/quantstats';

const comparison = calculateBenchmarkComparison(
  strategyReturns,
  benchmarkReturns,
  'BTC/USDT'
);

console.log('Alpha:', comparison.alpha);
console.log('Beta:', comparison.beta);
console.log('Information Ratio:', comparison.informationRatio);
console.log('Up Capture:', comparison.upCapture);
console.log('Down Capture:', comparison.downCapture);
```

## Integration Points

- **backtesting/engine.ts**: Add professional metrics to backtest results
- **pnl-analytics.tsx**: Display comprehensive performance metrics
- **hyperopt/engine.ts**: Use metrics as optimization objectives

## Key Metrics Explained

| Metric | Description | Interpretation |
|--------|-------------|----------------|
| Sharpe Ratio | Risk-adjusted return | >1 Good, >2 Excellent |
| Sortino Ratio | Downside risk-adjusted | >1 Good, >2 Excellent |
| Calmar Ratio | Return / Max Drawdown | >3 Good |
| Omega Ratio | Probability-weighted gains/losses | >1 Good |
| Tail Ratio | Right tail / Left tail | >1 Good |
| VaR 95% | 5% worst case loss | Lower is better |
| CVaR 95% | Average loss beyond VaR | Lower is better |

## API Reference

| Function | Description |
|----------|-------------|
| `calculatePerformanceMetrics()` | Full performance metrics |
| `calculateRollingMetrics()` | Rolling window metrics |
| `calculateMonthlyReturns()` | Monthly return breakdown |
| `calculateDrawdownAnalysis()` | Drawdown period analysis |
| `calculateReturnDistribution()` | Statistical distribution analysis |
| `calculateBenchmarkComparison()` | Strategy vs benchmark |
| `generateTearSheet()` | Full HTML tear sheet |

## Example: Complete Analysis

```typescript
import { 
  calculatePerformanceMetrics,
  calculateDrawdownAnalysis,
  generateTearSheet
} from '@/lib/quantstats';

// After backtest
const returns = backtestResult.equityCurve.map((e, i) => 
  i > 0 ? (e.equity - backtestResult.equityCurve[i-1].equity) / backtestResult.equityCurve[i-1].equity : 0
);

const metrics = calculatePerformanceMetrics(returns);
const ddAnalysis = calculateDrawdownAnalysis(returns);

// Generate report
const report = generateTearSheet(returns, dates, {
  strategyName: 'My Strategy',
  benchmarkName: 'Market Index',
});

// Save HTML report
fs.writeFileSync('tear-sheet.html', report.htmlReport);
```

## References

- [quantstats Python Library](https://github.com/ranaroussi/quantstats)
- [Quantopian pyfolio](https://github.com/quantopian/pyfolio)
