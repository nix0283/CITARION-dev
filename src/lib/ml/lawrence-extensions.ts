/**
 * Lawrence Classifier Extensions
 * 
 * P0: Platt Scaling, Extended Features
 * P1: Kernel Regression, Session Filtering
 */

import { LawrenceClassifier, TrainingSample, LawrenceFeatures, LawrenceResult, lorentzianDistance } from './lawrence-classifier';

// ==================== P0: PLATT SCALING ====================

export class PlattScaler {
  private params = { a: 1, b: 0, trained: false };
  private scores: number[] = [];
  private labels: number[] = [];

  addSample(score: number, label: 'LONG' | 'SHORT' | 'NEUTRAL'): void {
    this.scores.push(score);
    this.labels.push(label === 'LONG' ? 1 : 0);
  }

  train(maxIterations = 100, tolerance = 1e-5): void {
    if (this.scores.length < 10) return;
    const n = this.scores.length;
    let a = 0, b = Math.log((n + 2) / (n - 2 + 0.001));
    const positives = this.labels.reduce((s, l) => s + l, 0);
    const negatives = n - positives;
    if (positives === 0 || negatives === 0) { this.params = { a: 1, b: 0, trained: true }; return; }
    const targets = this.labels.map(l => (l + 1) / (n + 2));

    for (let iter = 0; iter < maxIterations; iter++) {
      let h00 = 0, h01 = 0, h11 = 0, g0 = 0, g1 = 0;
      for (let i = 0; i < n; i++) {
        const f = a * this.scores[i] + b;
        const p = 1 / (1 + Math.exp(-f));
        const t = targets[i];
        g0 += this.scores[i] * (p - t); g1 += p - t;
        const d = p * (1 - p);
        h00 += this.scores[i] * this.scores[i] * d; h01 += this.scores[i] * d; h11 += d;
      }
      h00 += 1e-6; h11 += 1e-6;
      const det = h00 * h11 - h01 * h01;
      if (Math.abs(det) < 1e-10) break;
      const stepA = (h11 * g0 - h01 * g1) / det;
      const stepB = (-h01 * g0 + h00 * g1) / det;
      a -= stepA; b -= stepB;
      if (Math.abs(stepA) < tolerance && Math.abs(stepB) < tolerance) break;
    }
    this.params = { a, b, trained: true };
  }

  calibrate(score: number): number {
    if (!this.params.trained) return 1 / (1 + Math.exp(-score));
    const logit = this.params.a * score + this.params.b;
    if (logit > 20) return 0.99999;
    if (logit < -20) return 0.00001;
    return 1 / (1 + Math.exp(-logit));
  }

  getParams() { return { ...this.params }; }
  reset() { this.params = { a: 1, b: 0, trained: false }; this.scores = []; this.labels = []; }
}

// ==================== P0: EXTENDED FEATURES ====================

export class ExtendedFeatureCalculator {
  calculate(
    high: number[], low: number[], close: number[], volume?: number[], timestamp?: number
  ): Record<string, number> {
    const features: Record<string, number> = {};
    features.momentum = this.momentum(close);
    features.volatility_ratio = this.volatilityRatio(high, low, close);
    features.trend_strength = this.trendStrength(close);
    features.volume_profile = volume ? this.volumeProfile(volume) : 1;
    features.price_velocity = this.priceVelocity(close);
    features.efficiency_ratio = this.efficiencyRatio(close);
    features.session_factor = this.sessionFactor(timestamp || Date.now());
    features.day_of_week_factor = this.dayOfWeekFactor(timestamp || Date.now());
    return features;
  }

  private momentum(close: number[], period = 14): number {
    if (close.length < period + 1) return 0;
    const current = close[close.length - 1];
    const past = close[close.length - period - 1];
    return past === 0 ? 0 : (current - past) / past;
  }

  private volatilityRatio(high: number[], low: number[], close: number[], period = 14): number {
    if (close.length < period * 2) return 1;
    let currentATR = 0, historicalATR = 0;
    for (let i = close.length - period; i < close.length; i++) {
      currentATR += Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
    }
    for (let i = close.length - period * 2; i < close.length - period; i++) {
      historicalATR += Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
    }
    currentATR /= period; historicalATR /= period;
    return historicalATR === 0 ? 1 : currentATR / historicalATR;
  }

  private trendStrength(close: number[], period = 14): number {
    if (close.length < period + 1) return 50;
    let up = 0, down = 0;
    for (let i = close.length - period; i < close.length; i++) {
      if (close[i] > close[i - 1]) up++; else if (close[i] < close[i - 1]) down++;
    }
    const total = up + down;
    return total === 0 ? 50 : Math.abs(up - down) / total * 100;
  }

  private volumeProfile(volume: number[], period = 20): number {
    if (volume.length < period) return 1;
    const current = volume[volume.length - 1];
    const avg = volume.slice(-period).reduce((a, b) => a + b, 0) / period;
    return avg === 0 ? 1 : current / avg;
  }

  private priceVelocity(close: number[], period = 5): number {
    if (close.length < period + 1) return 0;
    const change = close[close.length - 1] - close[close.length - period - 1];
    const avgPrice = close.slice(-period).reduce((a, b) => a + b, 0) / period;
    return avgPrice === 0 ? 0 : change / (avgPrice * period);
  }

  private efficiencyRatio(close: number[], period = 10): number {
    if (close.length < period + 1) return 0.5;
    const netChange = Math.abs(close[close.length - 1] - close[close.length - period - 1]);
    let sumChange = 0;
    for (let i = close.length - period; i < close.length; i++) sumChange += Math.abs(close[i] - close[i - 1]);
    return sumChange === 0 ? 0.5 : netChange / sumChange;
  }

  private sessionFactor(timestamp: number): number {
    const hour = new Date(timestamp).getUTCHours();
    if (hour >= 13 && hour < 16) return 1.0;
    if (hour >= 7 && hour < 9) return 0.9;
    if (hour >= 8 && hour < 16) return 0.8;
    if (hour >= 13 && hour < 21) return 0.7;
    if (hour >= 0 && hour < 8) return 0.5;
    return 0.3;
  }

  private dayOfWeekFactor(timestamp: number): number {
    const day = new Date(timestamp).getUTCDay();
    const factors: Record<number, number> = { 0: 0.2, 1: 0.7, 2: 1.0, 3: 1.0, 4: 0.9, 5: 0.6, 6: 0.1 };
    return factors[day] || 0.5;
  }
}

// ==================== P1: KERNEL REGRESSION ====================

export const KernelFunctions = {
  gaussian: (u: number) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI),
  epanechnikov: (u: number) => Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0,
  uniform: (u: number) => Math.abs(u) <= 1 ? 0.5 : 0,
  triangular: (u: number) => Math.abs(u) <= 1 ? 1 - Math.abs(u) : 0,
};

export class NadarayaWatsonRegressor {
  private config: { bandwidth: number; kernelType: 'gaussian' | 'epanechnikov' | 'uniform' | 'triangular'; minSamples: number };

  constructor(config?: Partial<{ bandwidth: number; kernelType: 'gaussian' | 'epanechnikov' | 'uniform' | 'triangular'; minSamples: number }>) {
    this.config = { bandwidth: 1.0, kernelType: 'gaussian', minSamples: 5, ...config };
  }

  smoothClassifierOutput(queryFeatures: number[], trainingData: TrainingSample[], k = 10): 
    { smoothedProbability: number; direction: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number } {
    if (trainingData.length < this.config.minSamples) {
      return { smoothedProbability: 0.5, direction: 'NEUTRAL', confidence: 0 };
    }

    const kernel = KernelFunctions[this.config.kernelType];
    const distances = trainingData.map(s => ({
      sample: s,
      distance: lorentzianDistance(queryFeatures, Object.values(s.features)),
    })).sort((a, b) => a.distance - b.distance).slice(0, k);

    let weightedSum = 0, weightSum = 0;
    for (const { sample, distance } of distances) {
      const u = distance / this.config.bandwidth;
      const weight = kernel(u) * sample.weight / (1 + distance);
      weightedSum += weight * (sample.label === 'LONG' ? 1 : sample.label === 'SHORT' ? -1 : 0);
      weightSum += weight;
    }

    if (weightSum === 0) return { smoothedProbability: 0.5, direction: 'NEUTRAL', confidence: 0 };
    const value = weightedSum / weightSum;
    const direction = value > 0.2 ? 'LONG' : value < -0.2 ? 'SHORT' : 'NEUTRAL';
    return { smoothedProbability: (value + 1) / 2, direction, confidence: Math.min(1, Math.abs(value)) };
  }

  getConfig() { return { ...this.config }; }
  setConfig(c: Partial<typeof this.config>) { this.config = { ...this.config, ...c }; }
}

// ==================== P1: SESSION FILTER ====================

export class SessionFilter {
  private config: { enabled: boolean; sessions: Array<{ name: string; startHour: number; endHour: number; daysOfWeek: number[] }>; requireOverlap: boolean };

  constructor(config?: Partial<{ enabled: boolean; sessions: typeof this.config.sessions; requireOverlap: boolean }>) {
    this.config = {
      enabled: true,
      sessions: [
        { name: 'London', startHour: 8, endHour: 16, daysOfWeek: [1, 2, 3, 4, 5] },
        { name: 'New York', startHour: 13, endHour: 21, daysOfWeek: [1, 2, 3, 4, 5] },
      ],
      requireOverlap: false,
      ...config,
    };
  }

  isValidTime(timestamp: number): { valid: boolean; sessions: string[]; isOverlap: boolean } {
    if (!this.config.enabled) return { valid: true, sessions: ['Always'], isOverlap: false };
    const date = new Date(timestamp);
    const hour = date.getUTCHours();
    const day = date.getUTCDay();
    const activeSessions = this.config.sessions.filter(s => s.daysOfWeek.includes(day) && hour >= s.startHour && hour < s.endHour).map(s => s.name);
    const isOverlap = activeSessions.length > 1;
    return { valid: this.config.requireOverlap ? isOverlap : activeSessions.length > 0, sessions: activeSessions, isOverlap };
  }

  getSessionFactor(timestamp: number): number {
    const { valid, isOverlap } = this.isValidTime(timestamp);
    if (!valid) return 0.1;
    return isOverlap ? 1.0 : 0.7;
  }

  getConfig() { return { ...this.config }; }
  setConfig(c: Partial<typeof this.config>) { this.config = { ...this.config, ...c }; }
}

// ==================== ENHANCED CLASSIFIER ====================

export class EnhancedLawrenceClassifier extends LawrenceClassifier {
  private plattScaler = new PlattScaler();
  private featureCalculator = new ExtendedFeatureCalculator();
  private kernelRegressor = new NadarayaWatsonRegressor();
  private sessionFilter = new SessionFilter();
  private useKernelSmoothing = true;

  classifyEnhanced(features: LawrenceFeatures, priceData: { high: number[]; low: number[]; close: number[]; volume?: number[] }) {
    const baseResult = this.classify(features);
    const extendedFeatures = this.featureCalculator.calculate(priceData.high, priceData.low, priceData.close, priceData.volume);
    const allFeatures = { ...baseResult.features, ...extendedFeatures };
    const featureVector = Object.values(allFeatures);

    let kernelEstimate: { value: number; confidence: number; sampleCount: number } | undefined;
    let smoothedDirection = baseResult.direction;
    let smoothedProbability = baseResult.probability;

    if (this.useKernelSmoothing) {
      const kernelResult = this.kernelRegressor.smoothClassifierOutput(featureVector, this.exportTrainingData());
      kernelEstimate = { value: kernelResult.smoothedProbability, confidence: kernelResult.confidence, sampleCount: 10 };
      if (kernelResult.confidence > 0.5) {
        smoothedDirection = kernelResult.direction;
        smoothedProbability = (baseResult.probability + kernelResult.smoothedProbability) / 2;
      }
    }

    const calibratedProbability = this.plattScaler.calibrate(smoothedProbability - 0.5);
    const sessionCheck = this.sessionFilter.isValidTime(Date.now());

    return {
      direction: smoothedDirection,
      probability: smoothedProbability,
      confidence: baseResult.confidence,
      features: allFeatures,
      calibratedProbability,
      kernelEstimate,
      sessionValid: sessionCheck.valid,
      activeSession: sessionCheck.sessions.join(', '),
      featureImportance: { momentum: 1.0, volatility_ratio: 1.0, trend_strength: 1.2, volume_profile: 0.8 },
    };
  }

  trainWithCalibration(sample: TrainingSample): void {
    this.train(sample);
    const featureVector = Object.values(sample.features);
    const avgFeature = featureVector.reduce((a, b) => a + b, 0) / featureVector.length;
    this.plattScaler.addSample(avgFeature, sample.label);
  }

  calibrateProbabilities(): void {
    const trainingData = this.exportTrainingData();
    this.plattScaler.reset();
    for (const sample of trainingData) {
      const featureVector = Object.values(sample.features);
      const avgFeature = featureVector.reduce((a, b) => a + b, 0) / featureVector.length;
      this.plattScaler.addSample(avgFeature, sample.label);
    }
    this.plattScaler.train();
  }

  setKernelSmoothing(enabled: boolean): void { this.useKernelSmoothing = enabled; }
  configureSessionFilter(config: Parameters<typeof this.sessionFilter.setConfig>[0]): void { this.sessionFilter.setConfig(config); }
  getPlattScaler() { return this.plattScaler; }
}

// ==================== SINGLETON ====================

let enhancedInstance: EnhancedLawrenceClassifier | null = null;

export function getEnhancedLawrenceClassifier(): EnhancedLawrenceClassifier {
  if (!enhancedInstance) enhancedInstance = new EnhancedLawrenceClassifier();
  return enhancedInstance;
}

export function resetEnhancedLawrenceClassifier(): void { enhancedInstance = null; }

const lawrenceExtensionsModule = {
  PlattScaler, ExtendedFeatureCalculator, NadarayaWatsonRegressor, SessionFilter, EnhancedLawrenceClassifier,
  getEnhancedLawrenceClassifier, resetEnhancedLawrenceClassifier, KernelFunctions,
};

export default lawrenceExtensionsModule;
