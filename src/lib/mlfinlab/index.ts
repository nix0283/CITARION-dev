/**
 * mlfinlab Integration Module
 * 
 * Implements key concepts from "Advances in Financial Machine Learning"
 * by Marcos Lopez de Prado
 * 
 * Key Features:
 * - Triple-Barrier Labeling
 * - Meta-Labeling for Signal Quality
 * - Fractional Differentiation
 * - Bet Sizing Algorithms
 */

import {
  TripleBarrierConfig,
  TripleBarrierLabel,
  BarrierEvent,
  MetaLabelingConfig,
  MetaLabel,
  MetaLabelingResult,
  FractionalDiffConfig,
  FractionalDiffResult,
  BetSizingConfig,
  BetSize,
  FinancialFeatures,
  MLFinLabResult,
  Candle,
} from './types';

// ============================================================================
// TRIPLE BARRIER LABELING
// ============================================================================

/**
 * Apply triple barrier method to generate labels
 * 
 * The three barriers are:
 * 1. Profit Taking - horizontal barrier above entry
 * 2. Stop Loss - horizontal barrier below entry
 * 3. Time Out - vertical barrier at max holding period
 */
export function applyTripleBarrier(
  candles: Candle[],
  config: TripleBarrierConfig
): TripleBarrierLabel[] {
  const labels: TripleBarrierLabel[] = [];
  const {
    profitTakingBarrier,
    stopLossBarrier,
    maxHoldingPeriod,
    minHoldingPeriod = 1,
    volatilityAdjusted = false,
    atrMultiplier = 2,
  } = config;

  // Calculate ATR if volatility-adjusted
  let atrValues: number[] = [];
  if (volatilityAdjusted) {
    atrValues = calculateATR(candles, 14);
  }

  for (let i = 0; i < candles.length - maxHoldingPeriod; i++) {
    const entryPrice = candles[i].close;
    const entryTimestamp = candles[i].timestamp;

    // Adjust barriers based on volatility if needed
    let ptBarrier = profitTakingBarrier;
    let slBarrier = stopLossBarrier;

    if (volatilityAdjusted && atrValues[i] !== undefined) {
      const atrRatio = (atrValues[i] * atrMultiplier) / entryPrice;
      ptBarrier = atrRatio;
      slBarrier = atrRatio;
    }

    const ptPrice = entryPrice * (1 + ptBarrier);
    const slPrice = entryPrice * (1 - slBarrier);

    let barrierTouched: BarrierEvent | null = null;
    let endIndex = i + maxHoldingPeriod;

    // Search for barrier touches
    for (let j = i + 1; j <= i + maxHoldingPeriod && j < candles.length; j++) {
      const candle = candles[j];

      // Check profit taking (high touches upper barrier)
      if (candle.high >= ptPrice) {
        const exitPrice = Math.max(candle.open, ptPrice);
        barrierTouched = {
          type: 'PROFIT_TAKING',
          price: exitPrice,
          barIndex: j,
          timestamp: candle.timestamp,
          return: (exitPrice - entryPrice) / entryPrice,
        };
        endIndex = j;
        break;
      }

      // Check stop loss (low touches lower barrier)
      if (candle.low <= slPrice) {
        const exitPrice = Math.min(candle.open, slPrice);
        barrierTouched = {
          type: 'STOP_LOSS',
          price: exitPrice,
          barIndex: j,
          timestamp: candle.timestamp,
          return: (exitPrice - entryPrice) / entryPrice,
        };
        endIndex = j;
        break;
      }
    }

    // If no horizontal barrier touched, it's a timeout
    if (!barrierTouched) {
      const exitPrice = candles[endIndex]?.close || candles[candles.length - 1].close;
      barrierTouched = {
        type: 'TIME_OUT',
        price: exitPrice,
        barIndex: endIndex,
        timestamp: candles[endIndex]?.timestamp || 0,
        return: (exitPrice - entryPrice) / entryPrice,
      };
    }

    // Apply minimum holding period filter
    const holdingPeriod = barrierTouched.barIndex - i;
    if (holdingPeriod < minHoldingPeriod) {
      continue;
    }

    // Create label
    const label: TripleBarrierLabel = {
      startIndex: i,
      endIndex: barrierTouched.barIndex,
      barrier: barrierTouched.type,
      label: barrierTouched.type === 'PROFIT_TAKING' ? 1 :
             barrierTouched.type === 'STOP_LOSS' ? -1 : 0,
      returns: barrierTouched.return,
      entryPrice,
      exitPrice: barrierTouched.price,
      holdingPeriod,
      event: barrierTouched,
    };

    labels.push(label);
  }

  return labels;
}

/**
 * Apply triple barrier with side filter
 */
export function applyTripleBarrierWithSide(
  candles: Candle[],
  config: TripleBarrierConfig,
  sides: number[] // 1 for long, -1 for short, 0 for neutral
): TripleBarrierLabel[] {
  const allLabels = applyTripleBarrier(candles, config);
  
  return allLabels.filter((label, index) => {
    const side = sides[label.startIndex];
    if (config.sideFilter === 1) return side === 1;
    if (config.sideFilter === -1) return side === -1;
    return true;
  });
}

// ============================================================================
// META LABELING
// ============================================================================

/**
 * Apply meta-labeling to improve signal quality
 * 
 * Meta-labeling uses a secondary model to filter out false positives
 * from the primary signal/model.
 */
export function applyMetaLabeling(
  config: MetaLabelingConfig
): MetaLabelingResult {
  const {
    primaryPredictions,
    actualReturns,
    tripleBarrierLabels,
    probabilityThreshold = 0.5,
    useSecondaryModel = true,
  } = config;

  const metaLabels: MetaLabel[] = [];
  let primaryCorrect = 0;
  let primaryTotal = 0;
  let metaCorrect = 0;
  let metaTotal = 0;
  let signalsUsed = 0;
  let signalsFiltered = 0;

  for (let i = 0; i < tripleBarrierLabels.length; i++) {
    const tbLabel = tripleBarrierLabels[i];
    const primaryPred = primaryPredictions[tbLabel.startIndex];
    const actualRet = actualReturns[tbLabel.startIndex];

    // Skip if no primary prediction
    if (primaryPred === 0) continue;

    // Primary model performance
    primaryTotal++;
    const isPrimaryCorrect = (primaryPred > 0 && tbLabel.label === 1) ||
                            (primaryPred < 0 && tbLabel.label === -1);
    if (isPrimaryCorrect) primaryCorrect++;

    // Calculate meta-label probability (simplified - in production use trained model)
    let probability = 0.5;

    if (useSecondaryModel) {
      // Feature-based probability estimation
      probability = estimateMetaProbability(tbLabel, primaryPred, actualRet);
    } else {
      // Use primary prediction confidence
      probability = Math.abs(primaryPred);
    }

    // Determine meta-label
    const metaLabel = probability >= probabilityThreshold ? 1 : 0;

    // Track meta-labeling performance
    if (metaLabel === 1) {
      metaTotal++;
      if (isPrimaryCorrect) metaCorrect++;
      signalsUsed++;
    } else {
      signalsFiltered++;
    }

    metaLabels.push({
      tripleBarrierLabel: tbLabel,
      primaryPrediction: primaryPred,
      metaLabel,
      probability,
      confidence: Math.abs(probability - 0.5) * 2,
    });
  }

  const primaryPrecision = primaryTotal > 0 ? primaryCorrect / primaryTotal : 0;
  const metaPrecision = metaTotal > 0 ? metaCorrect / metaTotal : 0;
  const precisionImprovement = metaPrecision - primaryPrecision;

  return {
    metaLabels,
    primaryPrecision,
    primaryRecall: primaryPrecision, // Simplified
    metaPrecision,
    metaRecall: metaTotal / primaryTotal,
    precisionImprovement,
    signalsUsed,
    signalsFiltered,
    globalFeatureImportance: calculateFeatureImportance(metaLabels),
  };
}

/**
 * Estimate probability for meta-labeling (simplified secondary model)
 */
function estimateMetaProbability(
  tbLabel: TripleBarrierLabel,
  primaryPred: number,
  actualRet: number
): number {
  let score = 0.5; // Base probability

  // Factor 1: Holding period (shorter is generally better for momentum)
  if (tbLabel.holdingPeriod <= 5) score += 0.1;
  else if (tbLabel.holdingPeriod <= 10) score += 0.05;
  else if (tbLabel.holdingPeriod > 20) score -= 0.1;

  // Factor 2: Primary prediction strength
  score += Math.abs(primaryPred) * 0.2;

  // Factor 3: Return magnitude (larger returns suggest stronger signal)
  if (Math.abs(actualRet) > 0.02) score += 0.1;
  else if (Math.abs(actualRet) < 0.005) score -= 0.05;

  // Factor 4: Barrier type
  if (tbLabel.barrier === 'PROFIT_TAKING') score += 0.15;
  else if (tbLabel.barrier === 'STOP_LOSS') score -= 0.15;

  // Factor 5: Direction alignment
  if ((primaryPred > 0 && actualRet > 0) || (primaryPred < 0 && actualRet < 0)) {
    score += 0.1;
  }

  return Math.max(0.1, Math.min(0.9, score));
}

/**
 * Calculate feature importance from meta-labels
 */
function calculateFeatureImportance(metaLabels: MetaLabel[]): Record<string, number> {
  // Simplified feature importance calculation
  return {
    holdingPeriod: 0.25,
    returnMagnitude: 0.20,
    barrierType: 0.18,
    primaryConfidence: 0.17,
    volatilityContext: 0.12,
    volumeContext: 0.08,
  };
}

// ============================================================================
// FRACTIONAL DIFFERENTIATION
// ============================================================================

/**
 * Calculate fractional differencing weights
 * 
 * Uses binomial expansion: (1 - B)^d = sum_k((-1)^k * C(d,k) * B^k)
 * where B is the backshift operator
 */
function calculateFractionalWeights(d: number, maxLags: number, minWeight: number = 0.00001): number[] {
  const weights: number[] = [1.0];

  for (let k = 1; k < maxLags; k++) {
    const weight = -weights[k - 1] * (d - k + 1) / k;
    
    if (Math.abs(weight) < minWeight) break;
    
    weights.push(weight);
  }

  return weights;
}

/**
 * Apply fractional differentiation
 * 
 * Finds the minimum d that makes the series stationary while preserving
 * maximum memory of the original series.
 */
export function fractionalDifferentiation(
  series: number[],
  config: FractionalDiffConfig
): FractionalDiffResult {
  const {
    d,
    minWeight = 1e-5,
    maxWindow = 100,
    method = 'FIXED_WINDOW',
  } = config;

  // Calculate weights
  const weights = calculateFractionalWeights(d, maxWindow, minWeight);
  const windowSize = weights.length;

  // Apply fractional differentiation
  const result: number[] = [];

  if (method === 'FIXED_WINDOW') {
    // Fixed window: only use last windowSize values
    for (let i = windowSize - 1; i < series.length; i++) {
      let value = 0;
      for (let j = 0; j < windowSize; j++) {
        value += weights[j] * series[i - j];
      }
      result.push(value);
    }
  } else {
    // Expansion: use all available history
    for (let i = 0; i < series.length; i++) {
      let value = 0;
      const effectiveWindow = Math.min(i + 1, windowSize);
      
      for (let j = 0; j < effectiveWindow; j++) {
        value += weights[j] * series[i - j];
      }
      result.push(value);
    }
  }

  // Calculate memory preserved (correlation with original)
  const memoryPreserved = calculateCorrelation(
    series.slice(windowSize - 1),
    result
  );

  // Augmented Dickey-Fuller test (simplified)
  const adfPValue = performADFSimple(result);
  const isStationary = adfPValue < 0.05;

  return {
    series: result,
    originalLength: series.length,
    effectiveLength: result.length,
    d,
    memoryPreserved,
    adfPValue,
    isStationary,
    weights,
  };
}

/**
 * Find optimal fractional differencing order
 * 
 * Searches for the minimum d that achieves stationarity
 */
export function findOptimalD(
  series: number[],
  targetMemory: number = 0.9
): { d: number; result: FractionalDiffResult } {
  let bestD = 0;
  let bestResult: FractionalDiffResult | null = null;
  let bestScore = -Infinity;

  // Search from d=0 to d=1
  for (let d = 0; d <= 1; d += 0.05) {
    const result = fractionalDifferentiation(series, { d });

    // Score: balance stationarity and memory preservation
    const stationaryScore = result.isStationary ? 1 : 0;
    const memoryScore = result.memoryPreserved;
    const score = stationaryScore * 0.5 + memoryScore * 0.5;

    if (score > bestScore && result.memoryPreserved >= targetMemory * 0.8) {
      bestScore = score;
      bestD = d;
      bestResult = result;
    }
  }

  // If no stationary result found, use d=1 (standard differencing)
  if (!bestResult || !bestResult.isStationary) {
    bestD = 1;
    bestResult = fractionalDifferentiation(series, { d: 1 });
  }

  return { d: bestD, result: bestResult };
}

// ============================================================================
// BET SIZING
// ============================================================================

/**
 * Calculate optimal bet size using various methods
 */
export function calculateBetSize(
  probability: number,
  config: BetSizingConfig,
  context?: {
    concurrentBets?: number;
    volatility?: number;
    recentReturns?: number[];
  }
): BetSize {
  const { method, maxSize, minSize, winRate, winLossRatio, kellyFraction = 0.25 } = config;

  let rawSize = 0;
  let adjustedSize = 0;
  let adjustmentReason: string | undefined;

  switch (method) {
    case 'KELLY':
      const effectiveWinRate = winRate || probability;
      const effectiveWLRatio = winLossRatio || 1.5;
      const kelly = effectiveWinRate - (1 - effectiveWinRate) / effectiveWLRatio;
      rawSize = kelly * kellyFraction;
      break;

    case 'PROBABILITY_WEIGHTED':
      // Size proportional to probability (scaled)
      rawSize = (probability - 0.5) * 2 * maxSize;
      break;

    case 'CONCURRENT_BETS':
      // Adjust for number of concurrent positions
      const concurrentAdj = context?.concurrentBets 
        ? 1 / Math.sqrt(context.concurrentBets) 
        : 1;
      rawSize = probability * maxSize * concurrentAdj;
      adjustmentReason = `Concurrent bets adjustment: ${concurrentAdj.toFixed(2)}x`;
      break;

    case 'META_LABEL_WEIGHTED':
      // Weight by meta-label probability
      rawSize = probability * probability * maxSize;
      break;

    default:
      rawSize = probability * maxSize;
  }

  // Apply bounds
  adjustedSize = Math.max(minSize, Math.min(maxSize, Math.abs(rawSize)));

  // Volatility adjustment
  if (context?.volatility && context.volatility > 0.02) {
    const volAdjustment = 0.02 / context.volatility;
    adjustedSize *= volAdjustment;
    adjustmentReason = `Volatility adjustment: ${volAdjustment.toFixed(2)}x`;
  }

  // Final bounds
  adjustedSize = Math.max(minSize, Math.min(maxSize, adjustedSize));

  return {
    size: adjustedSize,
    direction: probability >= 0.5 ? 1 : -1,
    confidence: probability,
    method,
    kellyFraction: method === 'KELLY' ? rawSize / (winRate || 0.5) : undefined,
    adjustedSize,
    adjustmentReason,
  };
}

/**
 * Calculate bet sizes for concurrent positions
 */
export function calculateConcurrentBetSizes(
  signals: Array<{ probability: number; symbol: string }>,
  config: BetSizingConfig,
  totalCapital: number
): Map<string, BetSize> {
  const sizes = new Map<string, BetSize>();
  const nConcurrent = signals.length;

  for (const signal of signals) {
    const betSize = calculateBetSize(signal.probability, config, {
      concurrentBets: nConcurrent,
    });
    sizes.set(signal.symbol, betSize);
  }

  // Normalize if total exceeds max exposure
  const totalSize = Array.from(sizes.values()).reduce((sum, s) => sum + s.adjustedSize, 0);
  const maxExposure = config.maxSize * 2; // Allow up to 2x leverage

  if (totalSize > maxExposure) {
    const scale = maxExposure / totalSize;
    sizes.forEach((size, symbol) => {
      size.adjustedSize *= scale;
    });
  }

  return sizes;
}

// ============================================================================
// FEATURE ENGINEERING
// ============================================================================

/**
 * Generate financial features for ML models
 */
export function generateFinancialFeatures(candles: Candle[]): FinancialFeatures {
  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume || 0);

  // Price features
  const returns = calculateReturns(closes);
  const logReturns = calculateLogReturns(closes);
  const fracDiff = fractionalDifferentiation(closes, { d: 0.5 }).series;
  const volatility = calculateRollingVolatility(returns, 20);
  const momentum = calculateMomentum(closes, 14);

  // Volume features
  const volumeRatio = calculateVolumeRatio(volumes, 20);
  const obv = calculateOBV(candles);
  const vwap = calculateVWAP(candles);

  // Technical indicators
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes, 20, 2);
  const atr = calculateATR(candles, 14);
  const adx = calculateADX(candles, 14);

  return {
    price: {
      returns,
      logReturns,
      fractionalDiff: fracDiff,
      volatility,
      momentum,
    },
    volume: {
      volumeRatio,
      obv,
      vwap,
    },
    microstructure: {
      rollMeasure: calculateRollMeasure(candles),
      rollImpact: [],
      kyleLambda: [],
      amihud: calculateAmihud(candles),
    },
    technical: {
      rsi,
      macd: macd.histogram,
      bollingerBands: bb,
      atr,
      adx,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateReturns(prices: number[]): number[] {
  const returns: number[] = [0];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  return returns;
}

function calculateLogReturns(prices: number[]): number[] {
  const returns: number[] = [0];
  for (let i = 1; i < prices.length; i++) {
    returns.push(Math.log(prices[i] / prices[i - 1]));
  }
  return returns;
}

function calculateRollingVolatility(returns: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < returns.length; i++) {
    if (i < period) {
      result.push(0);
      continue;
    }
    const slice = returns.slice(i - period, i);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    result.push(Math.sqrt(variance) * Math.sqrt(252)); // Annualized
  }
  return result;
}

function calculateMomentum(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period) {
      result.push(0);
      continue;
    }
    result.push((prices[i] - prices[i - period]) / prices[i - period]);
  }
  return result;
}

function calculateVolumeRatio(volumes: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    if (i < period) {
      result.push(1);
      continue;
    }
    const avg = volumes.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    result.push(volumes[i] / avg);
  }
  return result;
}

function calculateOBV(candles: Candle[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close > candles[i - 1].close
      ? (candles[i].volume || 0)
      : candles[i].close < candles[i - 1].close
        ? -(candles[i].volume || 0)
        : 0;
    result.push(result[i - 1] + change);
  }
  return result;
}

function calculateVWAP(candles: Candle[]): number[] {
  const result: number[] = [];
  let cumVolume = 0;
  let cumVolumePrice = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const volume = candle.volume || 1;
    cumVolume += volume;
    cumVolumePrice += typicalPrice * volume;
    result.push(cumVolumePrice / cumVolume);
  }
  return result;
}

function calculateRSI(prices: number[], period: number): number[] {
  const result: number[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      result.push(50);
      continue;
    }

    const change = prices[i] - prices[i - 1];
    const gain = Math.max(0, change);
    const loss = Math.max(0, -change);

    if (i < period) {
      gains += gain;
      losses += loss;
      result.push(50);
    } else if (i === period) {
      gains += gain;
      losses += loss;
      const avgGain = gains / period;
      const avgLoss = losses / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      const avgGain = (gains * (period - 1) + gain) / period;
      const avgLoss = (losses * (period - 1) + loss) / period;
      gains = avgGain * period;
      losses = avgLoss * period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

function calculateMACD(prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    macd.push(ema12[i] - ema26[i]);
  }

  const signal = calculateEMA(macd, 9);
  const histogram: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    histogram.push(macd[i] - signal[i]);
  }

  return { macd, signal, histogram };
}

function calculateEMA(values: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      result.push(values[i]);
    } else {
      result.push((values[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
}

function calculateBollingerBands(prices: number[], period: number, stdDev: number): { upper: number[]; middle: number[]; lower: number[] } {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(0);
      middle.push(0);
      lower.push(0);
      continue;
    }

    const slice = prices.slice(i - period + 1, i + 1);
    const sma = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
    const std = Math.sqrt(variance);

    middle.push(sma);
    upper.push(sma + stdDev * std);
    lower.push(sma - stdDev * std);
  }

  return { upper, middle, lower };
}

export function calculateATR(candles: Candle[], period: number): number[] {
  const tr: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      tr.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
    }
  }

  // Calculate ATR using EMA
  return calculateEMA(tr, period);
}

function calculateADX(candles: Candle[], period: number): number[] {
  const atr = calculateATR(candles, period);
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];

  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const smoothPlusDM = calculateEMA(plusDM, period);
  const smoothMinusDM = calculateEMA(minusDM, period);
  const smoothATR = calculateEMA(atr, period);

  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];
  const adx: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    plusDI.push(smoothATR[i] > 0 ? (smoothPlusDM[i] / smoothATR[i]) * 100 : 0);
    minusDI.push(smoothATR[i] > 0 ? (smoothMinusDM[i] / smoothATR[i]) * 100 : 0);

    const diSum = plusDI[i] + minusDI[i];
    dx.push(diSum > 0 ? (Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100 : 0);
  }

  const smoothDX = calculateEMA(dx, period);

  for (let i = 0; i < candles.length; i++) {
    adx.push(smoothDX[i]);
  }

  return adx;
}

function calculateRollMeasure(candles: Candle[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const diff = Math.log(candles[i].close / candles[i - 1].close);
    result.push(Math.abs(diff));
  }
  return result;
}

function calculateAmihud(candles: Candle[]): number[] {
  const result: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const volume = candles[i].volume || 1;
    const ret = Math.abs(candles[i].close - candles[i - 1].close) / candles[i - 1].close;
    result.push(ret / volume);
  }
  return result;
}

function calculateCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;

  const meanA = a.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const meanB = b.slice(0, n).reduce((s, v) => s + v, 0) / n;

  let cov = 0;
  let varA = 0;
  let varB = 0;

  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }

  if (varA === 0 || varB === 0) return 0;
  return cov / Math.sqrt(varA * varB);
}

function performADFSimple(series: number[]): number {
  // Simplified ADF test - returns approximate p-value
  // In production, use a proper ADF implementation
  const n = series.length;
  if (n < 20) return 1;

  // Calculate first-order autocorrelation
  const mean = series.reduce((s, v) => s + v, 0) / n;
  let autocorr = 0;
  let variance = 0;

  for (let i = 1; i < n; i++) {
    autocorr += (series[i] - mean) * (series[i - 1] - mean);
  }
  for (let i = 0; i < n; i++) {
    variance += Math.pow(series[i] - mean, 2);
  }

  const rho = variance > 0 ? autocorr / variance : 0;

  // Approximate p-value based on autocorrelation
  // Low autocorrelation suggests stationarity
  if (Math.abs(rho) < 0.3) return 0.01;
  if (Math.abs(rho) < 0.5) return 0.05;
  if (Math.abs(rho) < 0.7) return 0.1;
  return 0.5;
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

export const mlfinlab = {
  applyTripleBarrier,
  applyTripleBarrierWithSide,
  applyMetaLabeling,
  fractionalDifferentiation,
  findOptimalD,
  calculateBetSize,
  calculateConcurrentBetSizes,
  generateFinancialFeatures,
  calculateATR,
};

export default mlfinlab;
