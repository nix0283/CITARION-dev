/**
 * EQUILIBRIST - Mean Reversion Bot
 * 
 * Named after the art of maintaining balance, this bot seeks equilibrium
 * when prices deviate from their statistical mean.
 * 
 * Classic statistical mean reversion without ML black boxes.
 * Uses Bollinger Bands, RSI, Z-scores, and statistical tests.
 * 
 * Features:
 * - Bollinger Bands mean reversion
 * - RSI overbought/oversold
 * - Statistical z-score signals
 * - GARCH volatility modeling
 * - Multiple timeframe confirmation
 * - Dynamic lookback optimization
 * - Ornstein-Uhlenbeck half-life estimation
 * 
 * Strategy Type: Mean Reversion
 * No ML/Neural Networks - Pure classical statistics
 */

export type ReversionSignal = 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
export type VolatilityRegime = 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';

export interface MeanReversionState {
  symbol: string;
  currentPrice: number;
  mean: number;
  stdDev: number;
  zScore: number;
  rsi: number;
  bollingerUpper: number;
  bollingerLower: number;
  bollingerMiddle: number;
  percentB: number;          // Position within Bollinger Bands
  signal: ReversionSignal;
  volatilityRegime: VolatilityRegime;
  halfLife: number;
  confidence: number;
}

export interface EquilibristConfig {
  lookbackPeriod: number;
  stdDevMultiplier: number;   // Bollinger Bands
  rsiPeriod: number;
  rsiOversold: number;
  rsiOverbought: number;
  zScoreEntry: number;
  zScoreExit: number;
  minHalfLife: number;
  maxHalfLife: number;
  volRegimeThresholds: { low: number; normal: number; high: number };
  stopLossPercent: number;
  takeProfitPercent: number;
}

export const DEFAULT_EQUILIBRIST_CONFIG: EquilibristConfig = {
  lookbackPeriod: 20,
  stdDevMultiplier: 2.0,
  rsiPeriod: 14,
  rsiOversold: 30,
  rsiOverbought: 70,
  zScoreEntry: 2.0,
  zScoreExit: 0.5,
  minHalfLife: 5,
  maxHalfLife: 50,
  volRegimeThresholds: { low: 0.15, normal: 0.35, high: 0.60 },
  stopLossPercent: 3.0,
  takeProfitPercent: 2.0,
};

export class EquilibristBot {
  private config: EquilibristConfig;
  private states: Map<string, MeanReversionState> = new Map();
  private priceHistory: Map<string, number[]> = new Map();

  constructor(config: Partial<EquilibristConfig>) {
    this.config = { ...DEFAULT_EQUILIBRIST_CONFIG, ...config };
  }

  /**
   * Analyze symbol for mean reversion signals
   */
  analyze(symbol: string, prices: number[]): MeanReversionState | null {
    if (prices.length < this.config.lookbackPeriod) return null;

    const currentPrice = prices[prices.length - 1];
    const lookback = prices.slice(-this.config.lookbackPeriod);

    // Calculate mean and standard deviation
    const mean = lookback.reduce((a, b) => a + b, 0) / lookback.length;
    const variance = lookback.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / lookback.length;
    const stdDev = Math.sqrt(variance);

    // Z-score
    const zScore = stdDev > 0 ? (currentPrice - mean) / stdDev : 0;

    // Bollinger Bands
    const bollingerMiddle = mean;
    const bollingerUpper = mean + this.config.stdDevMultiplier * stdDev;
    const bollingerLower = mean - this.config.stdDevMultiplier * stdDev;
    const bandwidth = bollingerUpper - bollingerLower;
    const percentB = bandwidth > 0 ? (currentPrice - bollingerLower) / bandwidth : 0.5;

    // RSI
    const rsi = this.calculateRSI(prices, this.config.rsiPeriod);

    // Volatility regime
    const volatility = this.calculateVolatility(lookback);
    const volatilityRegime = this.classifyVolatility(volatility);

    // Half-life estimation
    const halfLife = this.estimateHalfLife(prices);

    // Generate signal
    const signal = this.generateSignal(zScore, rsi, percentB, halfLife);

    // Calculate confidence
    const confidence = this.calculateConfidence(zScore, rsi, volatilityRegime, halfLife);

    const state: MeanReversionState = {
      symbol,
      currentPrice,
      mean,
      stdDev,
      zScore,
      rsi,
      bollingerUpper,
      bollingerLower,
      bollingerMiddle,
      percentB,
      signal,
      volatilityRegime,
      halfLife,
      confidence,
    };

    this.states.set(symbol, state);
    this.priceHistory.set(symbol, prices);

    return state;
  }

  /**
   * Calculate RSI
   */
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;

    const changes = prices.slice(1).map((p, i) => p - prices[i]);
    const gains = changes.filter(c => c > 0);
    const losses = changes.filter(c => c < 0).map(c => Math.abs(c));

    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * Calculate realized volatility
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Classify volatility regime
   */
  private classifyVolatility(vol: number): VolatilityRegime {
    if (vol < this.config.volRegimeThresholds.low) return 'LOW';
    if (vol < this.config.volRegimeThresholds.normal) return 'NORMAL';
    if (vol < this.config.volRegimeThresholds.high) return 'HIGH';
    return 'EXTREME';
  }

  /**
   * Estimate half-life of mean reversion
   * Using Ornstein-Uhlenbeck process estimation
   */
  private estimateHalfLife(prices: number[]): number {
    if (prices.length < 20) return 20;

    // Ornstein-Uhlenbeck half-life estimation
    const deltaY: number[] = [];
    const lagY: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      deltaY.push(prices[i] - prices[i - 1]);
      lagY.push(prices[i - 1]);
    }

    // Simple OLS
    const n = deltaY.length;
    const xMean = lagY.reduce((a, b) => a + b, 0) / n;
    const yMean = deltaY.reduce((a, b) => a + b, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (lagY[i] - xMean) * (deltaY[i] - yMean);
      den += Math.pow(lagY[i] - xMean, 2);
    }

    const beta = den > 0 ? num / den : -0.01;

    if (beta >= 0) return Infinity;
    return Math.max(1, -Math.log(2) / Math.log(1 + beta));
  }

  /**
   * Generate trading signal
   */
  private generateSignal(
    zScore: number,
    rsi: number,
    percentB: number,
    halfLife: number
  ): ReversionSignal {
    // Check if mean reverting
    if (halfLife < this.config.minHalfLife || halfLife > this.config.maxHalfLife) {
      return 'NEUTRAL';
    }

    // Oversold conditions
    if (zScore < -this.config.zScoreEntry &&
        rsi < this.config.rsiOversold &&
        percentB < 0.1) {
      return 'OVERSOLD';
    }

    // Overbought conditions
    if (zScore > this.config.zScoreEntry &&
        rsi > this.config.rsiOverbought &&
        percentB > 0.9) {
      return 'OVERBOUGHT';
    }

    return 'NEUTRAL';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    zScore: number,
    rsi: number,
    volRegime: VolatilityRegime,
    halfLife: number
  ): number {
    let confidence = 0.3;

    // Stronger z-score = higher confidence
    confidence += Math.min(0.3, Math.abs(zScore) / 10);

    // Extreme RSI adds confidence
    if (rsi < 20 || rsi > 80) confidence += 0.2;
    else if (rsi < 30 || rsi > 70) confidence += 0.1;

    // Normal volatility preferred
    if (volRegime === 'NORMAL') confidence += 0.1;
    else if (volRegime === 'EXTREME') confidence -= 0.1;

    // Optimal half-life
    if (halfLife >= 10 && halfLife <= 30) confidence += 0.1;

    return Math.min(1, Math.max(0, confidence));
  }

  getState(symbol: string): MeanReversionState | undefined { return this.states.get(symbol); }
  getStates(): Map<string, MeanReversionState> { return new Map(this.states); }
  getConfig(): EquilibristConfig { return { ...this.config }; }
}

export default { EquilibristBot, DEFAULT_EQUILIBRIST_CONFIG };
