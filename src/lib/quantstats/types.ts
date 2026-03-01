/**
 * quantstats Integration Types
 * 
 * Professional portfolio analytics for quants
 */

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface PerformanceMetrics {
  // Return metrics
  totalReturn: number;
  cagr: number;
  avgDailyReturn: number;
  avgMonthlyReturn: number;
  avgYearlyReturn: number;
  cumulativeReturn: number;

  // Risk metrics
  volatility: number;
  dailyVolatility: number;
  annualizedVolatility: number;
  downsideVolatility: number;
  maxDrawdown: number;
  maxDrawdownDuration: number;
  avgDrawdown: number;
  calmarRatio: number;

  // Risk-adjusted metrics
  sharpeRatio: number;
  sortinoRatio: number;
  treynorRatio: number;
  informationRatio: number;
  omegaRatio: number;
  tailRatio: number;
  burkeRatio: number;
  kellyCriterion: number;

  // Distribution metrics
  skewness: number;
  kurtosis: number;
  jarqueBera: number;
  normalDistribution: boolean;

  // Drawdown metrics
  maxDrawdownPercent: number;
  avgDrawdownPercent: number;
  medianDrawdown: number;
  drawdownRecoveryDays: number;
  drawdownProbability: number;
  longestDrawdownDays: number;
  currentDrawdown: number;

  // Win/Loss metrics
  winRate: number;
  avgWin: number;
  avgLoss: number;
  bestDay: number;
  worstDay: number;
  bestMonth: number;
  worstMonth: number;
  bestYear: number;
  worstYear: number;
  profitFactor: number;
  expectancy: number;

  // VaR/CVaR metrics
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;

  // Alpha/Beta
  alpha: number;
  beta: number;
  rSquared: number;
  correlation: number;
  trackingError: number;

  // Trade metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgTradeReturn: number;
  avgWinReturn: number;
  avgLossReturn: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgHoldingPeriod: number;
}

export interface RollingMetrics {
  dates: number[];
  rollingReturns: number[];
  rollingVolatility: number[];
  rollingSharpe: number[];
  rollingSortino: number[];
  rollingBeta: number[];
  rollingAlpha: number[];
  rollingCorrelation: number[];
  rollingDrawdown: number[];
  rollingWinRate: number[];
}

export interface MonthlyReturns {
  years: number[];
  months: {
    jan: number[];
    feb: number[];
    mar: number[];
    apr: number[];
    may: number[];
    jun: number[];
    jul: number[];
    aug: number[];
    sep: number[];
    oct: number[];
    nov: number[];
    dec: number[];
  };
  yearlyReturns: number[];
  bestMonth: { month: string; return: number };
  worstMonth: { month: string; return: number };
  bestYear: { year: number; return: number };
  worstYear: { year: number; return: number };
  avgMonthlyReturn: number;
  avgYearlyReturn: number;
  positiveMonths: number;
  negativeMonths: number;
}

export interface DrawdownAnalysis {
  drawdowns: Array<{
    start: number;
    end: number;
    peak: number;
    trough: number;
    drawdown: number;
    duration: number;
    recoveryDate: number | null;
  }>;
  maxDrawdown: number;
  maxDuration: number;
  avgDrawdown: number;
  avgDuration: number;
  currentDrawdown: number;
  currentDuration: number;
  drawdownProbability: number;
  recoveryProbability: number;
}

export interface ReturnDistribution {
  mean: number;
  median: number;
  std: number;
  skewness: number;
  kurtosis: number;
  jarqueBera: number;
  isNormal: boolean;
  percentiles: {
    p1: number;
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  histogram: Array<{
    bin: [number, number];
    count: number;
    frequency: number;
  }>;
  normalFit: {
    mean: number;
    std: number;
    pdf: number[];
  };
}

export interface BenchmarkComparison {
  benchmarkName: string;
  strategyReturns: number[];
  benchmarkReturns: number[];
  alpha: number;
  beta: number;
  correlation: number;
  rSquared: number;
  trackingError: number;
  informationRatio: number;
  upCapture: number;
  downCapture: number;
  relativePerformance: number[];
  cumulativeOutperformance: number;
}

// ============================================================================
// TEAR SHEET
// ============================================================================

export interface TearSheet {
  title: string;
  generatedAt: number;
  strategyName: string;
  benchmarkName: string;
  period: {
    start: number;
    end: number;
    years: number;
  };
  performance: PerformanceMetrics;
  rollingMetrics: RollingMetrics;
  monthlyReturns: MonthlyReturns;
  drawdownAnalysis: DrawdownAnalysis;
  returnDistribution: ReturnDistribution;
  benchmarkComparison: BenchmarkComparison;
  riskDecomposition: {
    systematicRisk: number;
    idiosyncraticRisk: number;
    totalRisk: number;
  };
  statistics: {
    sharpeRank: number;
    sortinoRank: number;
    calmarRank: number;
    riskAdjustedRank: number;
  };
  htmlReport: string;
}

// ============================================================================
// CONFIG
// ============================================================================

export interface QuantStatsConfig {
  /** Risk-free rate for Sharpe calculation */
  riskFreeRate: number;
  /** Trading days per year */
  tradingDays: number;
  /** Confidence level for VaR */
  varConfidence: number;
  /** Rolling window size */
  rollingWindow: number;
  /** Benchmark returns for comparison */
  benchmarkReturns?: number[];
  /** Strategy name */
  strategyName: string;
  /** Benchmark name */
  benchmarkName: string;
  /** Include bootstrap analysis */
  includeBootstrap?: boolean;
  /** Bootstrap iterations */
  bootstrapIterations?: number;
}

export interface TearSheetConfig extends QuantStatsConfig {
  /** Output format */
  outputFormat: 'HTML' | 'JSON' | 'BOTH';
  /** Include plots */
  includePlots: boolean;
  /** Plot format */
  plotFormat: 'BASE64' | 'URL';
  /** Custom title */
  title?: string;
}
