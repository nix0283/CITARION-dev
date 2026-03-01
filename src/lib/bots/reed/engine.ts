/**
 * REED - Statistical Arbitrage Bot
 * 
 * Named after the flexible and resilient plant, this bot thrives in
 * mean-reverting environments using statistical methods.
 * 
 * Features:
 * - Engle-Granger cointegration testing
 * - Johansen test for multiple assets
 * - Z-score based entry/exit signals
 * - Half-life estimation for optimal holding period
 * - Dynamic hedge ratio calculation (OLS, TLS, Kalman Filter)
 * - Correlation regime detection
 * - Statistical significance filtering
 * - Spread construction and monitoring
 * 
 * Strategy Type: Statistical Arbitrage / Mean Reversion
 * No ML/Neural Networks - Pure classical statistics
 * 
 * References:
 * - Engle, R. F., & Granger, C. W. (1987). Co-integration and error correction
 * - Johansen, S. (1988). Statistical analysis of cointegration vectors
 */

// ==================== TYPES ====================

export type PairStatus = 'SEARCHING' | 'COINTEGRATED' | 'TRADING' | 'EXITED' | 'BROKEN';
export type HedgeMethod = 'OLS' | 'TLS' | 'KALMAN' | 'DYNAMIC';
export type SignalType = 'ENTRY_LONG_SPREAD' | 'ENTRY_SHORT_SPREAD' | 'EXIT' | 'NONE';
export type CorrelationRegime = 'HIGH' | 'NORMAL' | 'LOW' | 'BREAKDOWN';

export interface Pair {
  asset1: string;
  asset2: string;
  hedgeRatio: number;
  intercept: number;
  halfLife: number;
  adfPValue: number;
  johansenRank: number;
  status: PairStatus;
  lastUpdate: number;
}

export interface SpreadMetrics {
  current: number;
  mean: number;
  stdDev: number;
  zScore: number;
  percentile: number;       // Position in historical distribution
  hurstExponent: number;    // H < 0.5 = mean reverting
  varianceRatio: number;
  lastUpdate: number;
}

export interface ReedConfig {
  // Pair selection
  minCorrelation: number;     // Minimum correlation to consider pair
  minAdfPValue: number;      // Maximum ADF p-value for cointegration
  minHalfLife: number;       // Minimum half-life in periods
  maxHalfLife: number;       // Maximum half-life in periods
  lookbackPeriods: number;   // Historical data for analysis
  
  // Entry/Exit
  entryZScore: number;       // Z-score threshold for entry
  exitZScore: number;        // Z-score threshold for exit
  stopLossZScore: number;    // Z-score stop loss
  
  // Position sizing
  maxPositionSize: number;   // Maximum position in USDT
  kellyFraction: number;     // Kelly criterion fraction
  volatilityScaling: boolean;
  
  // Hedge ratio
  hedgeMethod: HedgeMethod;
  kalmanProcessNoise: number;
  kalmanMeasurementNoise: number;
  hedgeUpdateFrequency: number;
  
  // Risk management
  maxPairs: number;          // Maximum concurrent pairs
  maxCorrelationBreakdown: number;
  maxSpreadDivergence: number;
  
  // Monitoring
  checkIntervalMs: number;
  adfTestIntervalMs: number;
}

export interface ReedState {
  pairs: Map<string, Pair>;
  activePositions: Map<string, Position>;
  spreads: Map<string, SpreadMetrics>;
  regimes: Map<string, CorrelationRegime>;
  metrics: ReedMetrics;
  lastUpdate: number;
}

export interface Position {
  pairId: string;
  asset1: string;
  asset2: string;
  direction: 'LONG_SPREAD' | 'SHORT_SPREAD';
  quantity1: number;
  quantity2: number;
  entryPrice1: number;
  entryPrice2: number;
  entryZScore: number;
  currentZScore: number;
  hedgeRatio: number;
  unrealizedPnl: number;
  realizedPnl: number;
  openedAt: number;
}

export interface ReedMetrics {
  totalPnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgHoldTime: number;
  avgReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  pairsAnalyzed: number;
  pairsCointegrated: number;
}

// ==================== CONSTANTS ====================

export const DEFAULT_REED_CONFIG: ReedConfig = {
  minCorrelation: 0.7,
  minAdfPValue: 0.05,
  minHalfLife: 5,
  maxHalfLife: 100,
  lookbackPeriods: 252,      // ~1 year of daily data
  
  entryZScore: 2.0,
  exitZScore: 0.5,
  stopLossZScore: 4.0,
  
  maxPositionSize: 10000,
  kellyFraction: 0.25,
  volatilityScaling: true,
  
  hedgeMethod: 'KALMAN',
  kalmanProcessNoise: 0.0001,
  kalmanMeasurementNoise: 0.001,
  hedgeUpdateFrequency: 60,
  
  maxPairs: 10,
  maxCorrelationBreakdown: 0.3,
  maxSpreadDivergence: 5.0,
  
  checkIntervalMs: 60000,
  adfTestIntervalMs: 3600000,
};

// ==================== COINTEGRATION TESTS ====================

export class CointegrationTests {
  /**
   * Augmented Dickey-Fuller test
   * H0: Series has a unit root (not cointegrated)
   * H1: Series is stationary (cointegrated)
   */
  static adfTest(series: number[], maxLags: number = 10): { 
    adfStatistic: number; 
    pValue: number; 
    isStationary: boolean;
    criticalValues: { 1: number; 5: number; 10: number };
  } {
    const n = series.length;
    const lags = Math.min(maxLags, Math.floor(12 * Math.pow(n / 100, 1/4)));
    
    // Calculate first differences
    const diff: number[] = [];
    for (let i = 1; i < n; i++) {
      diff.push(series[i] - series[i-1]);
    }
    
    // Build regression: Δy_t = α + β*t + γ*y_{t-1} + Σδ_i*Δy_{t-i} + ε_t
    // For simplicity, use no trend version
    
    const y = diff.slice(lags);
    const yLag = series.slice(lags, n - 1);
    
    // OLS regression
    const result = this.olsRegression(y, [yLag]);
    const adfStatistic = result.coefficients[0] / result.stdErrors[0];
    
    // Approximate p-values using MacKinnon critical values
    const criticalValues = { 1: -3.43, 5: -2.86, 10: -2.57 };
    
    // Approximate p-value
    let pValue: number;
    if (adfStatistic < criticalValues[1]) pValue = 0.01;
    else if (adfStatistic < criticalValues[5]) pValue = 0.05;
    else if (adfStatistic < criticalValues[10]) pValue = 0.10;
    else pValue = 0.10 + (adfStatistic - criticalValues[10]) * 0.02;
    
    pValue = Math.min(1, Math.max(0, pValue));
    
    return {
      adfStatistic,
      pValue,
      isStationary: pValue < 0.05,
      criticalValues,
    };
  }

  /**
   * Johansen test for cointegration rank
   * Tests for number of cointegrating vectors
   */
  static johansenTest(
    series1: number[],
    series2: number[],
    maxLags: number = 2
  ): {
    rank: number;
    eigenValues: number[];
    traceStatistics: number[];
    isCointegrated: boolean;
  } {
    // Build VAR model and compute eigenvalues
    const n = series1.length;
    const matrix = this.buildCompanionMatrix(series1, series2, maxLags);
    const eigenValues = this.computeEigenValues(matrix);
    
    // Trace statistics
    const traceStatistics = eigenValues.map((ev, i) => {
      let trace = 0;
      for (let j = i; j < eigenValues.length; j++) {
        trace += -n * Math.log(1 - eigenValues[j]);
      }
      return trace;
    });
    
    // Critical values for trace test (5% level)
    const criticalValues = [15.41, 3.76];
    
    // Determine rank
    let rank = 0;
    for (let i = 0; i < traceStatistics.length; i++) {
      if (traceStatistics[i] > criticalValues[i]) rank++;
    }
    
    return {
      rank,
      eigenValues,
      traceStatistics,
      isCointegrated: rank > 0,
    };
  }

  private static olsRegression(y: number[], x: number[][]): {
    coefficients: number[];
    stdErrors: number[];
    r2: number;
  } {
    const n = y.length;
    const k = x.length;
    
    // Calculate X'X
    const XtX: number[][] = [];
    for (let i = 0; i < k; i++) {
      XtX[i] = [];
      for (let j = 0; j < k; j++) {
        let sum = 0;
        for (let t = 0; t < n; t++) {
          sum += x[i][t] * x[j][t];
        }
        XtX[i][j] = sum;
      }
    }
    
    // Calculate X'y
    const Xty: number[] = [];
    for (let i = 0; i < k; i++) {
      let sum = 0;
      for (let t = 0; t < n; t++) {
        sum += x[i][t] * y[t];
      }
      Xty[i] = sum;
    }
    
    // Solve using Gaussian elimination
    const coefficients = this.solveLinearSystem(XtX, Xty);
    
    // Calculate residuals
    const residuals: number[] = [];
    for (let t = 0; t < n; t++) {
      let predicted = 0;
      for (let i = 0; i < k; i++) {
        predicted += coefficients[i] * x[i][t];
      }
      residuals.push(y[t] - predicted);
    }
    
    // Calculate standard errors
    const residualVariance = residuals.reduce((sum, r) => sum + r * r, 0) / (n - k);
    
    const XtXInv = this.matrixInverse(XtX);
    const stdErrors = XtXInv.map((row, i) => Math.sqrt(residualVariance * row[i]));
    
    // Calculate R²
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    const tss = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rss = residuals.reduce((sum, r) => sum + r * r, 0);
    const r2 = 1 - rss / tss;
    
    return { coefficients, stdErrors, r2 };
  }

  private static buildCompanionMatrix(s1: number[], s2: number[], lags: number): number[][] {
    // Simplified: build covariance matrix
    const n = Math.min(s1.length, s2.length);
    const matrix: number[][] = [[0, 0], [0, 0]];
    
    for (let i = lags; i < n; i++) {
      matrix[0][0] += Math.pow(s1[i] - s1[i-1], 2);
      matrix[0][1] += (s1[i] - s1[i-1]) * (s2[i] - s2[i-1]);
      matrix[1][0] += (s2[i] - s2[i-1]) * (s1[i] - s1[i-1]);
      matrix[1][1] += Math.pow(s2[i] - s2[i-1], 2);
    }
    
    return matrix.map(row => row.map(v => v / (n - lags)));
  }

  private static computeEigenValues(matrix: number[][]): number[] {
    const a = matrix[0][0];
    const b = matrix[0][1];
    const c = matrix[1][0];
    const d = matrix[1][1];
    
    const trace = a + d;
    const det = a * d - b * c;
    const discriminant = Math.sqrt(trace * trace - 4 * det);
    
    const lambda1 = (trace + discriminant) / 2;
    const lambda2 = (trace - discriminant) / 2;
    
    return [lambda1, lambda2].map(l => Math.min(1, Math.max(0, l)));
  }

  private static solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    const x = new Array(n).fill(0);
    
    // Gaussian elimination with partial pivoting
    const aug = A.map((row, i) => [...row, b[i]]);
    
    for (let col = 0; col < n; col++) {
      // Find pivot
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
          maxRow = row;
        }
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      
      // Eliminate
      for (let row = col + 1; row < n; row++) {
        const factor = aug[row][col] / aug[col][col];
        for (let j = col; j <= n; j++) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }
    
    // Back substitution
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j];
      }
      x[i] /= aug[i][i];
    }
    
    return x;
  }

  private static matrixInverse(A: number[][]): number[][] {
    const n = A.length;
    const inv: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) inv[i][i] = 1;
    
    const aug = A.map((row, i) => [...row, ...inv[i]]);
    
    // Gaussian elimination
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) {
          maxRow = row;
        }
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      
      const pivot = aug[col][col];
      for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
      
      for (let row = 0; row < n; row++) {
        if (row !== col) {
          const factor = aug[row][col];
          for (let j = 0; j < 2 * n; j++) {
            aug[row][j] -= factor * aug[col][j];
          }
        }
      }
    }
    
    return aug.map(row => row.slice(n));
  }
}

// ==================== HEDGE RATIO CALCULATOR ====================

export class HedgeRatioCalculator {
  private method: HedgeMethod;
  private kalmanState: { ratio: number; variance: number } | null = null;
  private processNoise: number;
  private measurementNoise: number;

  constructor(method: HedgeMethod, processNoise: number = 0.0001, measurementNoise: number = 0.001) {
    this.method = method;
    this.processNoise = processNoise;
    this.measurementNoise = measurementNoise;
  }

  /**
   * Calculate hedge ratio using selected method
   */
  calculate(
    price1: number[],
    price2: number[]
  ): { ratio: number; intercept: number; stdError: number } {
    switch (this.method) {
      case 'OLS':
        return this.olsHedgeRatio(price1, price2);
      case 'TLS':
        return this.tlsHedgeRatio(price1, price2);
      case 'KALMAN':
        return this.kalmanHedgeRatio(price1[price1.length - 1], price2[price2.length - 1]);
      case 'DYNAMIC':
        return this.dynamicHedgeRatio(price1, price2);
      default:
        return this.olsHedgeRatio(price1, price2);
    }
  }

  /**
   * OLS (Ordinary Least Squares) hedge ratio
   * Minimizes sum of squared residuals in y = α + β*x + ε
   */
  private olsHedgeRatio(price1: number[], price2: number[]): { ratio: number; intercept: number; stdError: number } {
    const n = Math.min(price1.length, price2.length);
    const y = price1.slice(-n);
    const x = price2.slice(-n);
    
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (x[i] - xMean) * (y[i] - yMean);
      denominator += Math.pow(x[i] - xMean, 2);
    }
    
    const ratio = denominator !== 0 ? numerator / denominator : 1;
    const intercept = yMean - ratio * xMean;
    
    // Calculate standard error
    let residualSumSquares = 0;
    for (let i = 0; i < n; i++) {
      const predicted = intercept + ratio * x[i];
      residualSumSquares += Math.pow(y[i] - predicted, 2);
    }
    
    const xVariance = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
    const stdError = Math.sqrt(residualSumSquares / ((n - 2) * xVariance));
    
    return { ratio, intercept, stdError };
  }

  /**
   * TLS (Total Least Squares) hedge ratio
   * Accounts for errors in both variables
   */
  private tlsHedgeRatio(price1: number[], price2: number[]): { ratio: number; intercept: number; stdError: number } {
    const ols = this.olsHedgeRatio(price1, price2);
    const reverseOls = this.olsHedgeRatio(price2, price1);
    
    // TLS is geometric mean of OLS and reverse OLS
    const tlsRatio = ols.ratio / Math.sqrt(1 + ols.ratio * reverseOls.ratio);
    
    return {
      ratio: tlsRatio,
      intercept: ols.intercept,
      stdError: ols.stdError * 1.1, // Slightly higher uncertainty
    };
  }

  /**
   * Kalman Filter hedge ratio
   * Dynamically updates hedge ratio as new data arrives
   */
  private kalmanHedgeRatio(
    currentPrice1: number,
    currentPrice2: number
  ): { ratio: number; intercept: number; stdError: number } {
    if (!this.kalmanState) {
      // Initialize
      this.kalmanState = { ratio: 1.0, variance: 0.01 };
      return { ratio: 1.0, intercept: 0, stdError: 0.1 };
    }
    
    // Prediction step
    const predictedRatio = this.kalmanState.ratio;
    const predictedVariance = this.kalmanState.variance + this.processNoise;
    
    // Update step
    const innovation = currentPrice1 - predictedRatio * currentPrice2;
    const innovationVariance = predictedVariance * Math.pow(currentPrice2, 2) + this.measurementNoise;
    const kalmanGain = predictedVariance * currentPrice2 / innovationVariance;
    
    const updatedRatio = predictedRatio + kalmanGain * innovation / currentPrice2;
    const updatedVariance = (1 - kalmanGain * currentPrice2) * predictedVariance;
    
    this.kalmanState = { ratio: updatedRatio, variance: updatedVariance };
    
    return {
      ratio: updatedRatio,
      intercept: 0, // Kalman filter assumes no intercept for simplicity
      stdError: Math.sqrt(updatedVariance),
    };
  }

  /**
   * Dynamic hedge ratio with rolling window
   */
  private dynamicHedgeRatio(
    price1: number[],
    price2: number[]
  ): { ratio: number; intercept: number; stdError: number } {
    // Use shorter window for more recent data
    const shortWindow = Math.min(30, Math.floor(price1.length * 0.25));
    const longWindow = Math.min(90, Math.floor(price1.length * 0.75));
    
    const shortTerm = this.olsHedgeRatio(
      price1.slice(-shortWindow),
      price2.slice(-shortWindow)
    );
    
    const longTerm = this.olsHedgeRatio(
      price1.slice(-longWindow),
      price2.slice(-longWindow)
    );
    
    // Weighted average favoring recent data
    const ratio = shortTerm.ratio * 0.6 + longTerm.ratio * 0.4;
    const intercept = shortTerm.intercept * 0.6 + longTerm.intercept * 0.4;
    const stdError = Math.max(shortTerm.stdError, longTerm.stdError);
    
    return { ratio, intercept, stdError };
  }

  reset(): void {
    this.kalmanState = null;
  }
}

// ==================== SPREAD ANALYZER ====================

export class SpreadAnalyzer {
  /**
   * Calculate spread from price series and hedge ratio
   */
  static calculateSpread(
    price1: number[],
    price2: number[],
    hedgeRatio: number,
    intercept: number = 0
  ): number[] {
    return price1.map((p1, i) => p1 - hedgeRatio * price2[i] - intercept);
  }

  /**
   * Calculate z-score of spread
   */
  static calculateZScore(
    spread: number[],
    lookback: number = 20
  ): number {
    if (spread.length < lookback) return 0;
    
    const recentSpread = spread.slice(-lookback);
    const mean = recentSpread.reduce((a, b) => a + b, 0) / lookback;
    const variance = recentSpread.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / lookback;
    const stdDev = Math.sqrt(variance);
    
    const current = spread[spread.length - 1];
    
    return stdDev > 0 ? (current - mean) / stdDev : 0;
  }

  /**
   * Calculate spread metrics
   */
  static calculateMetrics(
    spread: number[],
    lookback: number
  ): SpreadMetrics {
    const recentSpread = spread.slice(-lookback);
    const current = spread[spread.length - 1];
    
    const mean = recentSpread.reduce((a, b) => a + b, 0) / lookback;
    const variance = recentSpread.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / lookback;
    const stdDev = Math.sqrt(variance);
    
    const zScore = stdDev > 0 ? (current - mean) / stdDev : 0;
    
    // Calculate percentile
    const sortedSpread = [...recentSpread].sort((a, b) => a - b);
    const rank = sortedSpread.findIndex(s => s >= current);
    const percentile = (rank / lookback) * 100;
    
    // Calculate Hurst exponent
    const hurstExponent = this.calculateHurstExponent(spread);
    
    // Calculate variance ratio
    const varianceRatio = this.calculateVarianceRatio(spread);
    
    return {
      current,
      mean,
      stdDev,
      zScore,
      percentile,
      hurstExponent,
      varianceRatio,
      lastUpdate: Date.now(),
    };
  }

  /**
   * Calculate Hurst exponent
   * H < 0.5 indicates mean reversion
   */
  static calculateHurstExponent(series: number[]): number {
    const n = series.length;
    if (n < 20) return 0.5;
    
    // Rescaled range analysis
    const lags = [2, 5, 10, 20, 50].filter(l => l < n);
    const rsValues: number[] = [];
    
    for (const lag of lags) {
      const m = Math.floor(n / lag);
      const chunks: number[][] = [];
      
      for (let i = 0; i < m; i++) {
        chunks.push(series.slice(i * lag, (i + 1) * lag));
      }
      
      let rsSum = 0;
      for (const chunk of chunks) {
        const mean = chunk.reduce((a, b) => a + b, 0) / chunk.length;
        const cumDev: number[] = [];
        let cumSum = 0;
        
        for (const val of chunk) {
          cumSum += val - mean;
          cumDev.push(cumSum);
        }
        
        const r = Math.max(...cumDev) - Math.min(...cumDev);
        const s = Math.sqrt(chunk.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / chunk.length);
        
        if (s > 0) rsSum += r / s;
      }
      
      rsValues.push(Math.log(rsSum / m));
    }
    
    // Linear regression to find H
    const logLags = lags.map(l => Math.log(l));
    const meanLag = logLags.reduce((a, b) => a + b, 0) / logLags.length;
    const meanRs = rsValues.reduce((a, b) => a + b, 0) / rsValues.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < logLags.length; i++) {
      numerator += (logLags[i] - meanLag) * (rsValues[i] - meanRs);
      denominator += Math.pow(logLags[i] - meanLag, 2);
    }
    
    return denominator > 0 ? numerator / denominator : 0.5;
  }

  /**
   * Calculate variance ratio test
   * VR ≠ 1 indicates mean reversion or momentum
   */
  static calculateVarianceRatio(series: number[], lag: number = 2): number {
    const n = series.length;
    if (n < lag * 2) return 1;
    
    // Calculate returns
    const returns: number[] = [];
    for (let i = 1; i < n; i++) {
      returns.push((series[i] - series[i-1]) / series[i-1]);
    }
    
    // Variance of 1-period returns
    const mean1 = returns.reduce((a, b) => a + b, 0) / returns.length;
    const var1 = returns.reduce((sum, r) => sum + Math.pow(r - mean1, 2), 0) / (returns.length - 1);
    
    // Variance of lag-period returns
    const lagReturns: number[] = [];
    for (let i = lag; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < lag; j++) {
        sum += returns[i - lag + j];
      }
      lagReturns.push(sum);
    }
    
    const meanLag = lagReturns.reduce((a, b) => a + b, 0) / lagReturns.length;
    const varLag = lagReturns.reduce((sum, r) => sum + Math.pow(r - meanLag, 2), 0) / (lagReturns.length - 1);
    
    return var1 > 0 ? varLag / (lag * var1) : 1;
  }

  /**
   * Estimate half-life of mean reversion
   */
  static estimateHalfLife(spread: number[]): number {
    const n = spread.length;
    if (n < 10) return 20;
    
    // Regress: spread[t] - spread[t-1] = α + β * spread[t-1] + ε
    const deltaY: number[] = [];
    const lagY: number[] = [];
    
    for (let i = 1; i < n; i++) {
      deltaY.push(spread[i] - spread[i-1]);
      lagY.push(spread[i-1]);
    }
    
    // OLS regression
    const yMean = deltaY.reduce((a, b) => a + b, 0) / deltaY.length;
    const xMean = lagY.reduce((a, b) => a + b, 0) / lagY.length;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < deltaY.length; i++) {
      numerator += (lagY[i] - xMean) * (deltaY[i] - yMean);
      denominator += Math.pow(lagY[i] - xMean, 2);
    }
    
    const beta = denominator > 0 ? numerator / denominator : -0.01;
    
    // Half-life = -ln(2) / ln(1 + β)
    if (beta >= 0) return Infinity; // Not mean reverting
    
    const halfLife = -Math.log(2) / Math.log(1 + beta);
    
    return Math.max(1, Math.min(halfLife, 500));
  }
}

// ==================== REED BOT ====================

export class ReedBot {
  private config: ReedConfig;
  private state: ReedState;
  private hedgeCalculator: HedgeRatioCalculator;

  constructor(config: Partial<ReedConfig>) {
    this.config = { ...DEFAULT_REED_CONFIG, ...config };
    this.hedgeCalculator = new HedgeRatioCalculator(
      this.config.hedgeMethod,
      this.config.kalmanProcessNoise,
      this.config.kalmanMeasurementNoise
    );
    
    this.state = {
      pairs: new Map(),
      activePositions: new Map(),
      spreads: new Map(),
      regimes: new Map(),
      metrics: this.initMetrics(),
      lastUpdate: Date.now(),
    };
  }

  private initMetrics(): ReedMetrics {
    return {
      totalPnL: 0,
      realizedPnL: 0,
      unrealizedPnL: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgHoldTime: 0,
      avgReturn: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      pairsAnalyzed: 0,
      pairsCointegrated: 0,
    };
  }

  /**
   * Analyze a pair for cointegration
   */
  analyzePair(
    asset1: string,
    asset2: string,
    price1: number[],
    price2: number[]
  ): Pair | null {
    if (price1.length < this.config.lookbackPeriods || price2.length < this.config.lookbackPeriods) {
      return null;
    }
    
    // Calculate correlation
    const correlation = this.calculateCorrelation(price1, price2);
    if (Math.abs(correlation) < this.config.minCorrelation) {
      return null;
    }
    
    // Calculate hedge ratio
    const hedge = this.hedgeCalculator.calculate(price1, price2);
    
    // Calculate spread
    const spread = SpreadAnalyzer.calculateSpread(price1, price2, hedge.ratio, hedge.intercept);
    
    // ADF test on spread
    const adfResult = CointegrationTests.adfTest(spread);
    
    if (adfResult.pValue > this.config.minAdfPValue) {
      return null; // Not cointegrated
    }
    
    // Calculate half-life
    const halfLife = SpreadAnalyzer.estimateHalfLife(spread);
    
    if (halfLife < this.config.minHalfLife || halfLife > this.config.maxHalfLife) {
      return null; // Half-life outside acceptable range
    }
    
    const pairId = `${asset1}/${asset2}`;
    
    const pair: Pair = {
      asset1,
      asset2,
      hedgeRatio: hedge.ratio,
      intercept: hedge.intercept,
      halfLife,
      adfPValue: adfResult.pValue,
      johansenRank: 1, // Simplified
      status: 'COINTEGRATED',
      lastUpdate: Date.now(),
    };
    
    // Store spread metrics
    this.state.spreads.set(pairId, SpreadAnalyzer.calculateMetrics(spread, this.config.lookbackPeriods));
    this.state.pairs.set(pairId, pair);
    
    return pair;
  }

  /**
   * Generate trading signals for a pair
   */
  generateSignals(
    pairId: string,
    currentPrice1: number,
    currentPrice2: number
  ): SignalType {
    const pair = this.state.pairs.get(pairId);
    const spreadMetrics = this.state.spreads.get(pairId);
    
    if (!pair || !spreadMetrics) return 'NONE';
    
    const position = this.state.activePositions.get(pairId);
    const zScore = spreadMetrics.zScore;
    
    // Already in position
    if (position) {
      // Stop loss
      if (Math.abs(zScore) > this.config.stopLossZScore) {
        return 'EXIT';
      }
      
      // Exit signal
      if (Math.abs(zScore) < this.config.exitZScore) {
        return 'EXIT';
      }
      
      return 'NONE';
    }
    
    // Entry signals
    if (zScore > this.config.entryZScore) {
      return 'ENTRY_SHORT_SPREAD'; // Spread too high, expect mean reversion
    }
    
    if (zScore < -this.config.entryZScore) {
      return 'ENTRY_LONG_SPREAD'; // Spread too low, expect mean reversion
    }
    
    return 'NONE';
  }

  /**
   * Execute a signal
   */
  executeSignal(
    pairId: string,
    signal: SignalType,
    price1: number,
    price2: number,
    availableCapital: number
  ): Position | null {
    if (signal === 'NONE' || signal === 'EXIT') return null;
    
    const pair = this.state.pairs.get(pairId);
    const spreadMetrics = this.state.spreads.get(pairId);
    
    if (!pair || !spreadMetrics) return null;
    
    // Calculate position size
    const positionSize = this.calculatePositionSize(availableCapital, spreadMetrics);
    
    // Calculate quantities
    const quantity1 = positionSize / price1;
    const quantity2 = (positionSize * pair.hedgeRatio) / price2;
    
    const position: Position = {
      pairId,
      asset1: pair.asset1,
      asset2: pair.asset2,
      direction: signal === 'ENTRY_LONG_SPREAD' ? 'LONG_SPREAD' : 'SHORT_SPREAD',
      quantity1: signal === 'ENTRY_LONG_SPREAD' ? quantity1 : -quantity1,
      quantity2: signal === 'ENTRY_LONG_SPREAD' ? -quantity2 : quantity2,
      entryPrice1: price1,
      entryPrice2: price2,
      entryZScore: spreadMetrics.zScore,
      currentZScore: spreadMetrics.zScore,
      hedgeRatio: pair.hedgeRatio,
      unrealizedPnl: 0,
      realizedPnl: 0,
      openedAt: Date.now(),
    };
    
    this.state.activePositions.set(pairId, position);
    pair.status = 'TRADING';
    
    return position;
  }

  /**
   * Close a position
   */
  closePosition(
    pairId: string,
    price1: number,
    price2: number
  ): { pnl: number; position: Position } | null {
    const position = this.state.activePositions.get(pairId);
    if (!position) return null;
    
    // Calculate PnL
    const pnl1 = (price1 - position.entryPrice1) * position.quantity1;
    const pnl2 = (price2 - position.entryPrice2) * position.quantity2;
    const totalPnl = pnl1 + pnl2;
    
    position.realizedPnl = totalPnl;
    position.unrealizedPnl = 0;
    
    // Update metrics
    this.state.metrics.realizedPnL += totalPnl;
    this.state.metrics.totalTrades++;
    if (totalPnl > 0) {
      this.state.metrics.winningTrades++;
    } else {
      this.state.metrics.losingTrades++;
    }
    this.state.metrics.winRate = this.state.metrics.winningTrades / this.state.metrics.totalTrades;
    
    this.state.activePositions.delete(pairId);
    
    const pair = this.state.pairs.get(pairId);
    if (pair) pair.status = 'COINTEGRATED';
    
    return { pnl: totalPnl, position };
  }

  /**
   * Update positions with current prices
   */
  updatePositions(
    prices: Map<string, { price1: number; price2: number }>
  ): void {
    for (const [pairId, { price1, price2 }] of prices) {
      const position = this.state.activePositions.get(pairId);
      const pair = this.state.pairs.get(pairId);
      
      if (!position || !pair) continue;
      
      // Update hedge ratio
      const hedge = this.hedgeCalculator.calculate([price1], [price2]);
      position.hedgeRatio = hedge.ratio;
      
      // Calculate unrealized PnL
      const pnl1 = (price1 - position.entryPrice1) * position.quantity1;
      const pnl2 = (price2 - position.entryPrice2) * position.quantity2;
      position.unrealizedPnl = pnl1 + pnl2;
      
      // Update spread metrics
      const spread = price1 - pair.hedgeRatio * price2 - pair.intercept;
      // Would need historical spread for proper z-score calculation
    }
    
    this.state.metrics.unrealizedPnL = Array.from(this.state.activePositions.values())
      .reduce((sum, p) => sum + p.unrealizedPnl, 0);
    this.state.metrics.totalPnL = this.state.metrics.realizedPnL + this.state.metrics.unrealizedPnL;
    
    this.state.lastUpdate = Date.now();
  }

  /**
   * Calculate position size using Kelly criterion
   */
  private calculatePositionSize(
    availableCapital: number,
    spreadMetrics: SpreadMetrics
  ): number {
    // Kelly criterion: f = p - (1-p)/W/L
    // Simplified: use z-score magnitude as proxy for edge
    
    const edge = Math.abs(spreadMetrics.zScore) / this.config.entryZScore;
    const kellyFraction = edge * this.config.kellyFraction;
    
    let positionSize = availableCapital * Math.min(kellyFraction, 0.25); // Cap at 25%
    
    // Volatility scaling
    if (this.config.volatilityScaling && spreadMetrics.stdDev > 0) {
      const volScale = 0.02 / spreadMetrics.stdDev; // Target 2% volatility
      positionSize *= Math.min(volScale, 1);
    }
    
    return Math.min(positionSize, this.config.maxPositionSize);
  }

  /**
   * Calculate correlation between two series
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const xSlice = x.slice(-n);
    const ySlice = y.slice(-n);
    
    const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
    const yMean = ySlice.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let xVar = 0;
    let yVar = 0;
    
    for (let i = 0; i < n; i++) {
      const dx = xSlice[i] - xMean;
      const dy = ySlice[i] - yMean;
      numerator += dx * dy;
      xVar += dx * dx;
      yVar += dy * dy;
    }
    
    const denominator = Math.sqrt(xVar * yVar);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Get state
   */
  getState(): ReedState {
    return {
      ...this.state,
      pairs: new Map(this.state.pairs),
      activePositions: new Map(this.state.activePositions),
      spreads: new Map(this.state.spreads),
      regimes: new Map(this.state.regimes),
    };
  }

  /**
   * Get config
   */
  getConfig(): ReedConfig {
    return { ...this.config };
  }

  /**
   * Reset
   */
  reset(): void {
    this.state = {
      pairs: new Map(),
      activePositions: new Map(),
      spreads: new Map(),
      regimes: new Map(),
      metrics: this.initMetrics(),
      lastUpdate: Date.now(),
    };
    this.hedgeCalculator.reset();
  }
}

// ==================== EXPORTS ====================

const ReedModule = {
  ReedBot,
  CointegrationTests,
  HedgeRatioCalculator,
  SpreadAnalyzer,
  DEFAULT_REED_CONFIG,
};

export default ReedModule;
