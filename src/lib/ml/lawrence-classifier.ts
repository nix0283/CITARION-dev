/**
 * Lawrence Classifier
 * 
 * k-NN classifier using Lorentzian distance for market direction prediction.
 */

// ==================== TYPES ====================

export interface LawrenceFeatures {
  indicators: {
    rsi?: number;
    macd?: number;
    ema20?: number;
    ema50?: number;
    atr?: number;
    volumeRatio?: number;
  };
  context: {
    trend: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGING';
    volatility: 'LOW' | 'MEDIUM' | 'HIGH';
    volume: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  signal: {
    direction: 'LONG' | 'SHORT';
    symbol: string;
    timeframe: string;
    entryPrice: number;
  };
  time: {
    hour: number;
    dayOfWeek: number;
    isSessionOverlap: boolean;
  };
}

export interface LawrenceResult {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  probability: number;
  confidence: number;
  features: Record<string, number>;
}

export interface TrainingSample {
  features: Record<string, number>;
  label: 'LONG' | 'SHORT' | 'NEUTRAL';
  weight: number;
  timestamp: number;
}

export interface ClassifierStats {
  totalSamples: number;
  longCount: number;
  shortCount: number;
  neutralCount: number;
  avgConfidence: number;
  winRate: number;
  lastUpdated: number;
}

// ==================== CORE FUNCTIONS ====================

/**
 * Calculate Lorentzian Distance
 */
export function lorentzianDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Feature vectors must have the same length');
  }
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    distance += Math.log(1 + Math.abs(a[i] - b[i]));
  }
  return distance;
}

/**
 * Normalize value to 0-1 range
 */
export function normalize(value: number, range: number): number {
  if (range === 0) return 0.5;
  const normalized = value / range;
  return 1 / (1 + Math.exp(-2 * normalized));
}

/**
 * Hyperbolic Tangent
 */
export function tanh(value: number): number {
  if (value > 20) return 1;
  if (value < -20) return -1;
  const exp2x = Math.exp(2 * value);
  return (exp2x - 1) / (exp2x + 1);
}

/**
 * Calculate RSI
 */
export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Find k nearest neighbors
 */
export function findNearestNeighbors(
  query: number[],
  database: TrainingSample[],
  k: number
): Array<{ sample: TrainingSample; distance: number }> {
  if (database.length === 0) return [];

  const distances = database.map(sample => {
    const featureVector = Object.values(sample.features);
    const distance = lorentzianDistance(query, featureVector);
    return { sample, distance };
  });

  distances.sort((a, b) => a.distance - b.distance);
  return distances.slice(0, k);
}

// ==================== CLASSIFIER ====================

export class LawrenceClassifier {
  private trainingData: TrainingSample[] = [];
  private config: {
    lookbackWindow: number;
    neighborCount: number;
  };
  private stats: ClassifierStats;

  constructor(config?: { lookbackWindow?: number; neighborCount?: number }) {
    this.config = {
      lookbackWindow: config?.lookbackWindow ?? 2000,
      neighborCount: config?.neighborCount ?? 8,
    };
    this.stats = {
      totalSamples: 0,
      longCount: 0,
      shortCount: 0,
      neutralCount: 0,
      avgConfidence: 0,
      winRate: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Extract features from market data
   */
  extractFeatures(
    high: number[],
    low: number[],
    close: number[],
    volume?: number[]
  ): Record<string, number> {
    const features: Record<string, number> = {};

    // RSI
    const rsi = calculateRSI(close, 14);
    features.n_rsi = normalize((rsi - 50) / 50, 1);

    // Momentum
    if (close.length > 14) {
      const momentum = (close[close.length - 1] - close[close.length - 14]) / close[close.length - 14];
      features.n_momentum = normalize(tanh(momentum * 10), 1);
    }

    // Volatility
    if (close.length > 20) {
      const returns = [];
      for (let i = 1; i < close.length; i++) {
        returns.push((close[i] - close[i - 1]) / close[i - 1]);
      }
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      features.n_volatility = normalize(Math.sqrt(variance) * 100, 1);
    }

    // Volume ratio
    if (volume && volume.length > 20) {
      const avgVolume = volume.slice(-20).reduce((a, b) => a + b, 0) / 20;
      features.n_volume = normalize(volume[volume.length - 1] / avgVolume - 1, 2);
    }

    // ATR relative
    if (close.length > 14) {
      let atrSum = 0;
      for (let i = close.length - 14; i < close.length; i++) {
        atrSum += Math.max(
          high[i] - low[i],
          Math.abs(high[i] - close[i - 1]),
          Math.abs(low[i] - close[i - 1])
        );
      }
      const atr = atrSum / 14;
      features.n_atr = normalize(atr / close[close.length - 1] * 100, 1);
    }

    return features;
  }

  /**
   * Convert LawrenceFeatures to feature vector
   */
  featuresToVector(features: LawrenceFeatures): number[] {
    const vector: number[] = [];

    if (features.indicators.rsi !== undefined) {
      vector.push(normalize((features.indicators.rsi - 50) / 50, 1));
    } else {
      vector.push(0.5);
    }

    vector.push(features.context.trend === 'TRENDING_UP' ? 0.8 : 
                features.context.trend === 'TRENDING_DOWN' ? 0.2 : 0.5);
    vector.push(features.context.volatility === 'HIGH' ? 0.8 : 
                features.context.volatility === 'LOW' ? 0.2 : 0.5);
    vector.push(normalize(features.time.hour / 24, 1));
    vector.push(features.time.isSessionOverlap ? 0.8 : 0.3);

    return vector;
  }

  /**
   * Classify market direction
   */
  classify(features: LawrenceFeatures): LawrenceResult {
    const featureVector = this.featuresToVector(features);

    const neighbors = findNearestNeighbors(
      featureVector,
      this.trainingData,
      this.config.neighborCount
    );

    if (neighbors.length === 0) {
      return {
        direction: 'NEUTRAL',
        probability: 0.5,
        confidence: 0,
        features: {},
      };
    }

    // Weighted voting
    let longWeight = 0;
    let shortWeight = 0;
    let neutralWeight = 0;
    let totalWeight = 0;

    for (const { sample, distance } of neighbors) {
      const distWeight = 1 / (1 + distance);
      const weight = distWeight * sample.weight;
      totalWeight += weight;

      switch (sample.label) {
        case 'LONG':
          longWeight += weight;
          break;
        case 'SHORT':
          shortWeight += weight;
          break;
        case 'NEUTRAL':
          neutralWeight += weight;
          break;
      }
    }

    if (totalWeight === 0) {
      return {
        direction: 'NEUTRAL',
        probability: 0.5,
        confidence: 0,
        features: {},
      };
    }

    const longProb = longWeight / totalWeight;
    const shortProb = shortWeight / totalWeight;
    const neutralProb = neutralWeight / totalWeight;

    let direction: 'LONG' | 'SHORT' | 'NEUTRAL';
    let probability: number;

    if (longProb > shortProb && longProb > neutralProb) {
      direction = 'LONG';
      probability = longProb;
    } else if (shortProb > longProb && shortProb > neutralProb) {
      direction = 'SHORT';
      probability = shortProb;
    } else {
      direction = 'NEUTRAL';
      probability = neutralProb;
    }

    const maxProb = Math.max(longProb, shortProb, neutralProb);
    const secondProb = [longProb, shortProb, neutralProb].sort((a, b) => b - a)[1];
    const confidence = maxProb - secondProb;

    return {
      direction,
      probability,
      confidence,
      features: { n_rsi: featureVector[0], trend: featureVector[1] },
    };
  }

  /**
   * Train with a new sample
   */
  train(sample: TrainingSample): void {
    this.trainingData.push(sample);

    if (this.trainingData.length > this.config.lookbackWindow) {
      this.trainingData = this.trainingData.slice(-this.config.lookbackWindow);
    }

    this.stats.totalSamples = this.trainingData.length;
    this.stats.lastUpdated = Date.now();

    switch (sample.label) {
      case 'LONG':
        this.stats.longCount++;
        break;
      case 'SHORT':
        this.stats.shortCount++;
        break;
      case 'NEUTRAL':
        this.stats.neutralCount++;
        break;
    }
  }

  /**
   * Get statistics
   */
  getStats(): ClassifierStats {
    return { ...this.stats };
  }

  /**
   * Export training data
   */
  exportTrainingData(): TrainingSample[] {
    return [...this.trainingData];
  }
}

// ==================== SINGLETON ====================

let classifierInstance: LawrenceClassifier | null = null;

export function getLawrenceClassifier(): LawrenceClassifier {
  if (!classifierInstance) {
    classifierInstance = new LawrenceClassifier();
  }
  return classifierInstance;
}

export function resetLawrenceClassifier(): void {
  classifierInstance = null;
}

const lawrenceClassifierModule = {
  LawrenceClassifier,
  getLawrenceClassifier,
  resetLawrenceClassifier,
  lorentzianDistance,
  normalize,
  tanh,
  calculateRSI,
  findNearestNeighbors,
};

export default lawrenceClassifierModule;
