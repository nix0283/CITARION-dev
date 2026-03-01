/**
 * VectorBT Integration Types
 * 
 * High-performance vectorized backtesting
 */

// ============================================================================
// CORE TYPES
// ============================================================================

export interface VectorBtConfig {
  /** Initial capital */
  initialCapital: number;
  /** Commission per trade (fraction) */
  commission: number;
  /** Slippage per trade (fraction) */
  slippage: number;
  /** Annualization factor */
  annualize?: boolean;
  /** Optional: high prices for slippage calculation */
  highPrices?: number[];
  /** Optional: low prices for slippage calculation */
  lowPrices?: number[];
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface VectorBtResult {
  trades: Trade[];
  metrics: PerformanceMetrics;
  summary: SummaryStatistics;
}

export interface Trade {
  entry: {
    price: number;
    index: number;
    direction: 'LONG' | 'SHORT';
  };
  exit: {
    price: number;
    index: number;
  };
  pnl: number;
  return: number;
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  tradesCount: number;
  avgTradeDuration: number;
}

export interface SummaryStatistics {
  avgReturn: number;
  maxReturn: number;
  minReturn: number;
  stdReturn: number;
  medianReturn: number;
  skewness: number;
  kurtosis: number;
  percentiles: {
    p05: number;
    p25: number;
    p75: number;
    p95: number;
  };
}

// ============================================================================
// OPTIMIZATION TYPES
// ============================================================================

export interface ParameterRange {
  name: string;
  start: number;
  end: number;
  step?: number;
  values?: any[];
}

export interface OptimizationResult {
  params: Record<string, any>;
  metrics: PerformanceMetrics;
  allResults: VectorBtResult[];
  validCombinations: number;
  best: BestResult | null;
  summary: SummaryStatistics;
}

export interface BestResult {
  params: Record<string, any>;
  metrics: PerformanceMetrics;
}
