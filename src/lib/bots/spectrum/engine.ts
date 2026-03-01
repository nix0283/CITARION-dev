/**
 * SPECTRUM - Pairs Trading / Correlation Bot
 * 
 * Trades correlated assets using statistical relationships.
 * No ML - pure correlation/cointegration based signals.
 * 
 * Features:
 * - Rolling correlation analysis
 * - Dynamic pair selection
 * - Spread trading with z-score triggers
 * - Correlation regime detection
 * - Multi-pair portfolio optimization
 */

export type PairSignal = 'OPEN_LONG_SPREAD' | 'OPEN_SHORT_SPREAD' | 'CLOSE' | 'HOLD';
export type CorrelationRegime = 'HIGH_CORR' | 'NORMAL' | 'LOW_CORR' | 'DIVERGENCE';

export interface CorrelatedPair {
  asset1: string;
  asset2: string;
  correlation: number;
  correlationHistory: number[];
  regime: CorrelationRegime;
  spread: number;
  spreadZScore: number;
  hedgeRatio: number;
  halfLife: number;
}

export interface SpectrumConfig {
  minCorrelation: number;
  maxCorrelation: number;
  lookbackPeriods: number;
  correlationThreshold: number;
  divergenceThreshold: number;
  entryZScore: number;
  exitZScore: number;
  maxPositions: number;
  rebalanceInterval: number;
}

export const DEFAULT_SPECTRUM_CONFIG: SpectrumConfig = {
  minCorrelation: 0.6,
  maxCorrelation: 0.95,
  lookbackPeriods: 60,
  correlationThreshold: 0.1,
  divergenceThreshold: 0.3,
  entryZScore: 2.0,
  exitZScore: 0.5,
  maxPositions: 5,
  rebalanceInterval: 3600000,
};

export class SpectrumBot {
  private config: SpectrumConfig;
  private pairs: Map<string, CorrelatedPair> = new Map();
  private positions: Map<string, { pairId: string; size: number; entryZ: number }> = new Map();

  constructor(config: Partial<SpectrumConfig>) {
    this.config = { ...DEFAULT_SPECTRUM_CONFIG, ...config };
  }

  /**
   * Calculate rolling correlation
   */
  calculateCorrelation(prices1: number[], prices2: number[]): number {
    const n = Math.min(prices1.length, prices2.length);
    if (n < 2) return 0;

    const x = prices1.slice(-n);
    const y = prices2.slice(-n);
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
      const dx = x[i] - xMean;
      const dy = y[i] - yMean;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }

    return denX > 0 && denY > 0 ? num / Math.sqrt(denX * denY) : 0;
  }

  /**
   * Detect correlation regime change
   */
  detectRegime(currentCorr: number, historicalCorr: number[]): CorrelationRegime {
    if (historicalCorr.length < 10) return 'NORMAL';

    const avgCorr = historicalCorr.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const change = Math.abs(currentCorr - avgCorr);

    if (currentCorr > this.config.maxCorrelation) return 'HIGH_CORR';
    if (currentCorr < this.config.minCorrelation) return 'LOW_CORR';
    if (change > this.config.divergenceThreshold) return 'DIVERGENCE';
    return 'NORMAL';
  }

  /**
   * Generate trading signal
   */
  generateSignal(pair: CorrelatedPair): PairSignal {
    const position = this.positions.get(`${pair.asset1}/${pair.asset2}`);

    if (position) {
      // Check exit
      if (Math.abs(pair.spreadZScore) < this.config.exitZScore) return 'CLOSE';
      if (pair.regime === 'DIVERGENCE') return 'CLOSE';
      return 'HOLD';
    }

    // Check entry
    if (pair.regime === 'HIGH_CORR' || pair.regime === 'NORMAL') {
      if (pair.spreadZScore > this.config.entryZScore) return 'OPEN_SHORT_SPREAD';
      if (pair.spreadZScore < -this.config.entryZScore) return 'OPEN_LONG_SPREAD';
    }

    return 'HOLD';
  }

  /**
   * Analyze and update a pair
   */
  analyzePair(
    asset1: string,
    asset2: string,
    prices1: number[],
    prices2: number[]
  ): CorrelatedPair | null {
    const correlation = this.calculateCorrelation(prices1, prices2);

    if (Math.abs(correlation) < this.config.minCorrelation) return null;

    const pairId = `${asset1}/${asset2}`;
    const existing = this.pairs.get(pairId);

    const corrHistory = existing?.correlationHistory || [];
    corrHistory.push(correlation);
    if (corrHistory.length > 100) corrHistory.shift();

    // Calculate hedge ratio (OLS)
    const hedgeRatio = this.calculateHedgeRatio(prices1, prices2);

    // Calculate spread
    const spread = prices1[prices1.length - 1] - hedgeRatio * prices2[prices2.length - 1];
    const spreads = prices1.map((p1, i) => p1 - hedgeRatio * prices2[i]);
    const meanSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length;
    const stdSpread = Math.sqrt(spreads.reduce((s, sp) => s + Math.pow(sp - meanSpread, 2), 0) / spreads.length);
    const zScore = stdSpread > 0 ? (spread - meanSpread) / stdSpread : 0;

    const regime = this.detectRegime(correlation, corrHistory);

    const pair: CorrelatedPair = {
      asset1,
      asset2,
      correlation,
      correlationHistory: corrHistory,
      regime,
      spread,
      spreadZScore: zScore,
      hedgeRatio,
      halfLife: existing?.halfLife || 20,
    };

    this.pairs.set(pairId, pair);
    return pair;
  }

  private calculateHedgeRatio(prices1: number[], prices2: number[]): number {
    const n = Math.min(prices1.length, prices2.length);
    const x = prices2.slice(-n);
    const y = prices1.slice(-n);
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;

    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (x[i] - xMean) * (y[i] - yMean);
      den += Math.pow(x[i] - xMean, 2);
    }

    return den > 0 ? num / den : 1;
  }

  getPairs(): Map<string, CorrelatedPair> { return new Map(this.pairs); }
  getPositions(): Map<string, { pairId: string; size: number; entryZ: number }> { return new Map(this.positions); }
  getConfig(): SpectrumConfig { return { ...this.config }; }
}

export default { SpectrumBot, DEFAULT_SPECTRUM_CONFIG };
