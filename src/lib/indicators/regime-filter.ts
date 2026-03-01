/**
 * Regime Filter Module
 * Combines ADX (Average Directional Index) and TNI (Trend Normalization Index)
 * for market regime detection and trend strength analysis.
 *
 * This module is designed to work with Ichimoku signals to filter out
 * low-probability trades in weak trend conditions.
 *
 * Key Components:
 * 1. ADX - Trend Strength Indicator (0-100)
 * 2. TNI - Trend Normalization Index (normalized trend direction)
 * 3. Regime Detection - Market state classification
 * 4. Signal Filtering - Quality assessment for trade signals
 */

import type { Time } from "lightweight-charts";
import type { Candle, IndicatorResult } from "./calculator";

// ==================== TYPES ====================

export interface RegimeFilterConfig {
  // ADX Parameters
  adxPeriod: number;          // Default: 14
  adxSmoothingPeriod: number; // Default: 14
  adxStrongTrend: number;     // Default: 25 (ADX > 25 = strong trend)
  adxWeakTrend: number;       // Default: 20 (ADX < 20 = weak/no trend)

  // TNI Parameters
  tniPeriod: number;          // Default: 14
  tniSmoothing: number;       // Default: 5

  // Regime Detection
  regimeLookback: number;     // Default: 50 - lookback for regime stability
  volatilityFactor: number;   // Default: 1.5 - multiplier for volatility threshold

  // Integration with Ichimoku
  ichimokuWeight: number;     // Default: 0.3 - weight for Ichimoku confirmation
  adxWeight: number;          // Default: 0.4 - weight for ADX in regime score
  tniWeight: number;          // Default: 0.3 - weight for TNI in regime score
}

export interface ADXResult {
  adx: number[];              // ADX line (trend strength)
  plusDI: number[];           // +DI line (bullish pressure)
  minusDI: number[];          // -DI line (bearish pressure)
  dx: number[];               // Directional Index
  trendStrength: TrendStrength;
}

export interface TNIResult {
  tni: number[];              // TNI values (-100 to +100)
  tniSmoothed: number[];      // Smoothed TNI
  trendDirection: TrendDirection;
  normalization: number[];    // Price normalization factor
}

export interface RegimeAnalysis {
  regime: MarketRegime;
  confidence: number;         // 0-100 confidence in regime classification
  trendStrength: TrendStrength;
  trendDirection: TrendDirection;
  regimeStability: number;    // 0-100 how stable the current regime is
  regimeDuration: number;     // Number of bars in current regime
  expectedDuration: number;   // Expected regime duration based on history
  transitionProbability: number; // Probability of regime change
}

export interface RegimeFilterResult {
  adx: ADXResult;
  tni: TNIResult;
  regime: RegimeAnalysis;
  filterScore: number;        // Combined filter score (0-100)
  passFilter: boolean;        // Whether signal passes the filter
  filterReason: string;       // Explanation for filter result
}

export type TrendStrength = 'none' | 'weak' | 'moderate' | 'strong' | 'very_strong';
export type TrendDirection = 'bullish' | 'bearish' | 'neutral' | 'transitional';
export type MarketRegime =
  | 'trending_up'      // Strong uptrend
  | 'trending_down'    // Strong downtrend
  | 'ranging'          // Sideways market
  | 'volatile'         // High volatility, unclear direction
  | 'transitional';    // Regime change in progress

// ==================== DEFAULT CONFIGURATION ====================

export const DEFAULT_REGIME_CONFIG: RegimeFilterConfig = {
  adxPeriod: 14,
  adxSmoothingPeriod: 14,
  adxStrongTrend: 25,
  adxWeakTrend: 20,

  tniPeriod: 14,
  tniSmoothing: 5,

  regimeLookback: 50,
  volatilityFactor: 1.5,

  ichimokuWeight: 0.3,
  adxWeight: 0.4,
  tniWeight: 0.3,
};

// ==================== ADX CALCULATIONS ====================

/**
 * Calculate True Range for a single candle
 */
function trueRange(candles: Candle[], index: number): number {
  if (index === 0) return candles[0].high - candles[0].low;

  const prevClose = candles[index - 1].close;
  return Math.max(
    candles[index].high - candles[index].low,
    Math.abs(candles[index].high - prevClose),
    Math.abs(candles[index].low - prevClose)
  );
}

/**
 * Calculate Directional Movement
 */
function directionalMovement(candles: Candle[], index: number): { plusDM: number; minusDM: number } {
  if (index === 0) return { plusDM: 0, minusDM: 0 };

  const upMove = candles[index].high - candles[index - 1].high;
  const downMove = candles[index - 1].low - candles[index].low;

  let plusDM = 0;
  let minusDM = 0;

  if (upMove > downMove && upMove > 0) {
    plusDM = upMove;
  }
  if (downMove > upMove && downMove > 0) {
    minusDM = downMove;
  }

  return { plusDM, minusDM };
}

/**
 * Smoothed Moving Average (Wilder's Smoothing)
 * This is the standard smoothing method used in ADX calculation
 */
function smoothedMA(data: number[], period: number, startIndex: number = 0): number[] {
  const result: number[] = new Array(data.length).fill(NaN);

  if (data.length < period) return result;

  // First value is simple average
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;

  // Subsequent values use Wilder's smoothing
  for (let i = period; i < data.length; i++) {
    result[i] = (result[i - 1] * (period - 1) + data[i]) / period;
  }

  return result;
}

/**
 * Calculate ADX (Average Directional Index)
 * Returns ADX, +DI, -DI, and DX values
 */
export function calculateADX(
  candles: Candle[],
  config: Partial<RegimeFilterConfig> = {}
): ADXResult {
  const period = config.adxPeriod ?? DEFAULT_REGIME_CONFIG.adxPeriod;
  const smoothingPeriod = config.adxSmoothingPeriod ?? DEFAULT_REGIME_CONFIG.adxSmoothingPeriod;
  const strongTrendThreshold = config.adxStrongTrend ?? DEFAULT_REGIME_CONFIG.adxStrongTrend;
  const weakTrendThreshold = config.adxWeakTrend ?? DEFAULT_REGIME_CONFIG.adxWeakTrend;

  const length = candles.length;
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  // Calculate True Range and Directional Movement
  for (let i = 0; i < length; i++) {
    tr.push(trueRange(candles, i));
    const dm = directionalMovement(candles, i);
    plusDM.push(dm.plusDM);
    minusDM.push(dm.minusDM);
  }

  // Smooth the values using Wilder's smoothing
  const smoothedTR = smoothedMA(tr, period);
  const smoothedPlusDM = smoothedMA(plusDM, period);
  const smoothedMinusDM = smoothedMA(minusDM, period);

  // Calculate +DI and -DI
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];

  for (let i = 0; i < length; i++) {
    if (isNaN(smoothedTR[i]) || smoothedTR[i] === 0) {
      plusDI.push(NaN);
      minusDI.push(NaN);
      dx.push(NaN);
    } else {
      const pdi = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
      const mdi = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
      plusDI.push(pdi);
      minusDI.push(mdi);

      const diSum = pdi + mdi;
      dx.push(diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0);
    }
  }

  // Calculate ADX (smoothed DX)
  const adx = smoothedMA(dx.filter(v => !isNaN(v)), smoothingPeriod);

  // Map back to original length
  const adxFull: number[] = new Array(length).fill(NaN);
  let adxIndex = 0;
  for (let i = 0; i < length; i++) {
    if (!isNaN(dx[i])) {
      adxFull[i] = adx[adxIndex++] ?? NaN;
    }
  }

  // Determine trend strength
  const lastADX = adxFull[length - 1];
  let trendStrength: TrendStrength = 'none';
  if (!isNaN(lastADX)) {
    if (lastADX >= 50) trendStrength = 'very_strong';
    else if (lastADX >= strongTrendThreshold) trendStrength = 'strong';
    else if (lastADX >= weakTrendThreshold) trendStrength = 'moderate';
    else if (lastADX >= 10) trendStrength = 'weak';
  }

  return {
    adx: adxFull,
    plusDI,
    minusDI,
    dx,
    trendStrength,
  };
}

// ==================== TNI CALCULATIONS ====================

/**
 * Calculate Trend Normalization Index (TNI)
 * TNI normalizes price movement relative to its volatility,
 * providing a consistent measure of trend direction regardless of asset.
 *
 * Formula:
 * TNI = (Price - SMA) / (ATR * Factor) * 100
 * Normalized to -100 to +100 range
 */
export function calculateTNI(
  candles: Candle[],
  config: Partial<RegimeFilterConfig> = {}
): TNIResult {
  const period = config.tniPeriod ?? DEFAULT_REGIME_CONFIG.tniPeriod;
  const smoothing = config.tniSmoothing ?? DEFAULT_REGIME_CONFIG.tniSmoothing;

  const length = candles.length;

  // Calculate SMA
  const sma: number[] = new Array(length).fill(NaN);
  for (let i = period - 1; i < length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += candles[j].close;
    }
    sma[i] = sum / period;
  }

  // Calculate ATR
  const atr: number[] = new Array(length).fill(NaN);
  const tr: number[] = [];
  for (let i = 0; i < length; i++) {
    tr.push(trueRange(candles, i));
  }

  // First ATR is simple average
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    trSum += tr[i];
  }
  atr[period - 1] = trSum / period;

  // Subsequent ATR uses Wilder's smoothing
  for (let i = period; i < length; i++) {
    atr[i] = (atr[i - 1] * (period - 1) + tr[i]) / period;
  }

  // Calculate TNI
  const tni: number[] = new Array(length).fill(NaN);
  const normalization: number[] = new Array(length).fill(NaN);

  for (let i = period - 1; i < length; i++) {
    if (!isNaN(sma[i]) && !isNaN(atr[i]) && atr[i] > 0) {
      const deviation = candles[i].close - sma[i];
      const normalized = (deviation / atr[i]) * 25; // Scale factor

      // Clamp to -100 to +100
      tni[i] = Math.max(-100, Math.min(100, normalized));
      normalization[i] = atr[i];
    }
  }

  // Smooth TNI using EMA
  const tniSmoothed: number[] = new Array(length).fill(NaN);
  const k = 2 / (smoothing + 1);

  // Find first valid TNI
  let firstValid = -1;
  for (let i = 0; i < length; i++) {
    if (!isNaN(tni[i])) {
      firstValid = i;
      break;
    }
  }

  if (firstValid >= 0) {
    tniSmoothed[firstValid] = tni[firstValid];
    for (let i = firstValid + 1; i < length; i++) {
      if (!isNaN(tni[i])) {
        tniSmoothed[i] = tni[i] * k + tniSmoothed[i - 1] * (1 - k);
      }
    }
  }

  // Determine trend direction
  const lastTNI = tniSmoothed[length - 1];
  let trendDirection: TrendDirection = 'neutral';

  if (!isNaN(lastTNI)) {
    if (lastTNI > 30) trendDirection = 'bullish';
    else if (lastTNI < -30) trendDirection = 'bearish';
    else if (Math.abs(lastTNI) < 15) trendDirection = 'neutral';
    else trendDirection = 'transitional';
  }

  return {
    tni,
    tniSmoothed,
    trendDirection,
    normalization,
  };
}

// ==================== REGIME DETECTION ====================

/**
 * Calculate volatility regime
 */
function calculateVolatilityRegime(candles: Candle[], lookback: number): {
  volatility: number;
  isHigh: boolean;
} {
  if (candles.length < lookback) {
    return { volatility: 0, isHigh: false };
  }

  const returns: number[] = [];
  for (let i = candles.length - lookback; i < candles.length; i++) {
    returns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }

  // Calculate standard deviation
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  // Compare to historical volatility
  const historicalReturns: number[] = [];
  for (let i = 1; i < Math.min(candles.length, lookback * 3); i++) {
    historicalReturns.push((candles[i].close - candles[i - 1].close) / candles[i - 1].close);
  }

  const histMean = historicalReturns.reduce((a, b) => a + b, 0) / historicalReturns.length;
  const histVariance = historicalReturns.reduce((a, b) => a + Math.pow(b - histMean, 2), 0) / historicalReturns.length;
  const histVolatility = Math.sqrt(histVariance);

  return {
    volatility,
    isHigh: volatility > histVolatility * 1.5,
  };
}

/**
 * Detect market regime based on ADX, TNI, and volatility
 */
export function detectRegime(
  candles: Candle[],
  adxResult: ADXResult,
  tniResult: TNIResult,
  config: Partial<RegimeFilterConfig> = {}
): RegimeAnalysis {
  const lookback = config.regimeLookback ?? DEFAULT_REGIME_CONFIG.regimeLookback;
  const length = candles.length;

  // Get current values
  const currentADX = adxResult.adx[length - 1] ?? 0;
  const currentTNI = tniResult.tniSmoothed[length - 1] ?? 0;
  const currentPlusDI = adxResult.plusDI[length - 1] ?? 0;
  const currentMinusDI = adxResult.minusDI[length - 1] ?? 0;

  // Calculate volatility
  const volatilityAnalysis = calculateVolatilityRegime(candles, lookback);

  // Determine regime
  let regime: MarketRegime = 'ranging';
  let confidence = 50;
  let regimeDuration = 1;

  // ADX-based regime determination
  if (currentADX >= 25) {
    // Strong trend
    if (currentPlusDI > currentMinusDI && currentTNI > 20) {
      regime = 'trending_up';
      confidence = Math.min(100, 50 + currentADX / 2 + Math.abs(currentTNI) / 4);
    } else if (currentMinusDI > currentPlusDI && currentTNI < -20) {
      regime = 'trending_down';
      confidence = Math.min(100, 50 + currentADX / 2 + Math.abs(currentTNI) / 4);
    } else {
      regime = 'transitional';
      confidence = 40;
    }
  } else if (currentADX < 20) {
    if (volatilityAnalysis.isHigh) {
      regime = 'volatile';
      confidence = 30;
    } else {
      regime = 'ranging';
      confidence = 60;
    }
  } else {
    // ADX between 20-25: transitional
    regime = 'transitional';
    confidence = 35;
  }

  // Calculate regime stability
  let regimeChanges = 0;
  const regimes: MarketRegime[] = [];
  for (let i = Math.max(0, length - lookback); i < length; i++) {
    const adx = adxResult.adx[i] ?? 0;
    const tni = tniResult.tniSmoothed[i] ?? 0;
    const pdi = adxResult.plusDI[i] ?? 0;
    const mdi = adxResult.minusDI[i] ?? 0;

    let r: MarketRegime = 'ranging';
    if (adx >= 25) {
      if (pdi > mdi && tni > 20) r = 'trending_up';
      else if (mdi > pdi && tni < -20) r = 'trending_down';
      else r = 'transitional';
    } else if (adx < 20) {
      r = 'ranging';
    } else {
      r = 'transitional';
    }

    regimes.push(r);
    if (i > 0 && r !== regimes[regimes.length - 2]) {
      regimeChanges++;
    }
  }

  // Regime stability (inverse of changes)
  const regimeStability = Math.max(0, 100 - regimeChanges * 10);

  // Calculate regime duration
  for (let i = regimes.length - 2; i >= 0; i--) {
    if (regimes[i] === regime) {
      regimeDuration++;
    } else {
      break;
    }
  }

  // Calculate transition probability
  const transitionProbability = regimeChanges > 0
    ? Math.min(100, regimeChanges * 5 + (100 - regimeStability) / 2)
    : 10;

  return {
    regime,
    confidence,
    trendStrength: adxResult.trendStrength,
    trendDirection: tniResult.trendDirection,
    regimeStability,
    regimeDuration,
    expectedDuration: lookback / Math.max(1, regimeChanges),
    transitionProbability,
  };
}

// ==================== SIGNAL FILTERING ====================

/**
 * Calculate Ichimoku confirmation score
 * This integrates with the existing Ichimoku module
 */
export function calculateIchimokuConfirmation(
  candles: Candle[],
  ichimokuData: {
    tenkan: number | null;
    kijun: number | null;
    senkouA: number | null;
    senkouB: number | null;
    chikou: number | null;
  }
): { score: number; bullish: boolean; details: string[] } {
  const details: string[] = [];
  let score = 50; // Base score
  const price = candles[candles.length - 1].close;

  // TK Cross
  if (ichimokuData.tenkan && ichimokuData.kijun) {
    if (ichimokuData.tenkan > ichimokuData.kijun) {
      score += 10;
      details.push('TK Cross: Bullish');
    } else {
      score -= 10;
      details.push('TK Cross: Bearish');
    }
  }

  // Cloud position
  if (ichimokuData.senkouA && ichimokuData.senkouB) {
    const cloudTop = Math.max(ichimokuData.senkouA, ichimokuData.senkouB);
    const cloudBottom = Math.min(ichimokuData.senkouA, ichimokuData.senkouB);

    if (price > cloudTop) {
      score += 15;
      details.push('Cloud: Above (Bullish)');
    } else if (price < cloudBottom) {
      score -= 15;
      details.push('Cloud: Below (Bearish)');
    } else {
      details.push('Cloud: Inside (Neutral)');
    }

    // Cloud color
    if (ichimokuData.senkouA > ichimokuData.senkouB) {
      score += 5;
      details.push('Cloud Color: Green (Bullish)');
    } else {
      score -= 5;
      details.push('Cloud Color: Red (Bearish)');
    }
  }

  // Chikou confirmation
  if (ichimokuData.chikou) {
    const chikouPrice = ichimokuData.chikou;
    // Chikou should be above/below cloud 26 periods ago
    if (chikouPrice > price) {
      score += 10;
      details.push('Chikou: Above price (Bullish)');
    } else {
      score -= 10;
      details.push('Chikou: Below price (Bearish)');
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    bullish: score >= 50,
    details,
  };
}

/**
 * Apply regime filter to a trading signal
 * Returns whether the signal passes the filter and why
 */
export function applyRegimeFilter(
  candles: Candle[],
  signalDirection: 'long' | 'short',
  config: Partial<RegimeFilterConfig> = {},
  ichimokuData?: {
    tenkan: number | null;
    kijun: number | null;
    senkouA: number | null;
    senkouB: number | null;
    chikou: number | null;
  }
): RegimeFilterResult {
  // Calculate ADX
  const adxResult = calculateADX(candles, config);

  // Calculate TNI
  const tniResult = calculateTNI(candles, config);

  // Detect regime
  const regime = detectRegime(candles, adxResult, tniResult, config);

  const length = candles.length;
  const currentADX = adxResult.adx[length - 1] ?? 0;
  const currentTNI = tniResult.tniSmoothed[length - 1] ?? 0;

  // Calculate filter score
  const adxWeight = config.adxWeight ?? DEFAULT_REGIME_CONFIG.adxWeight;
  const tniWeight = config.tniWeight ?? DEFAULT_REGIME_CONFIG.tniWeight;
  const ichimokuWeight = config.ichimokuWeight ?? DEFAULT_REGIME_CONFIG.ichimokuWeight;

  // ADX Score (0-100)
  const adxScore = Math.min(100, currentADX * 2);

  // TNI Score (0-100)
  let tniScore = 50;
  if (signalDirection === 'long') {
    tniScore = 50 + Math.abs(currentTNI) / 2 * (currentTNI > 0 ? 1 : -0.5);
  } else {
    tniScore = 50 + Math.abs(currentTNI) / 2 * (currentTNI < 0 ? 1 : -0.5);
  }
  tniScore = Math.max(0, Math.min(100, tniScore));

  // Ichimoku Score
  let ichimokuScore = 50;
  let ichimokuDetails: string[] = [];
  if (ichimokuData) {
    const ichimokuConfirmation = calculateIchimokuConfirmation(candles, ichimokuData);
    ichimokuScore = ichimokuConfirmation.score;
    ichimokuDetails = ichimokuConfirmation.details;
  }

  // Combined filter score
  const filterScore =
    adxScore * adxWeight +
    tniScore * tniWeight +
    ichimokuScore * ichimokuWeight;

  // Determine if signal passes filter
  let passFilter = false;
  const reasons: string[] = [];

  // Check ADX threshold
  const strongTrendThreshold = config.adxStrongTrend ?? DEFAULT_REGIME_CONFIG.adxStrongTrend;
  const weakTrendThreshold = config.adxWeakTrend ?? DEFAULT_REGIME_CONFIG.adxWeakTrend;

  if (currentADX >= strongTrendThreshold) {
    reasons.push(`ADX (${currentADX.toFixed(1)}) indicates strong trend`);
    passFilter = true;
  } else if (currentADX >= weakTrendThreshold) {
    reasons.push(`ADX (${currentADX.toFixed(1)}) indicates moderate trend`);
    passFilter = filterScore >= 50;
  } else {
    reasons.push(`ADX (${currentADX.toFixed(1)}) indicates weak trend`);
    // Allow signals with high Ichimoku confirmation in low ADX
    passFilter = ichimokuScore >= 70 && regime.regimeStability >= 60;
  }

  // Check TNI alignment
  if (signalDirection === 'long' && currentTNI < -20) {
    reasons.push('WARNING: TNI bearish for long signal');
    passFilter = false;
  } else if (signalDirection === 'short' && currentTNI > 20) {
    reasons.push('WARNING: TNI bullish for short signal');
    passFilter = false;
  } else {
    reasons.push(`TNI (${currentTNI.toFixed(1)}) aligned with signal`);
  }

  // Add Ichimoku details
  reasons.push(...ichimokuDetails);

  // Add regime information
  reasons.push(`Regime: ${regime.regime} (confidence: ${regime.confidence.toFixed(0)}%)`);
  reasons.push(`Regime stability: ${regime.regimeStability.toFixed(0)}%`);

  return {
    adx: adxResult,
    tni: tniResult,
    regime,
    filterScore,
    passFilter,
    filterReason: reasons.join('\n'),
  };
}

// ==================== COMPREHENSIVE ANALYSIS ====================

/**
 * Perform comprehensive regime analysis
 */
export function comprehensiveRegimeAnalysis(
  candles: Candle[],
  config: Partial<RegimeFilterConfig> = {}
): {
  adx: ADXResult;
  tni: TNIResult;
  regime: RegimeAnalysis;
  filterScore: number;
  recommendation: string;
} {
  const adxResult = calculateADX(candles, config);
  const tniResult = calculateTNI(candles, config);
  const regime = detectRegime(candles, adxResult, tniResult, config);

  const length = candles.length;
  const currentADX = adxResult.adx[length - 1] ?? 0;
  const currentTNI = tniResult.tniSmoothed[length - 1] ?? 0;
  const currentPlusDI = adxResult.plusDI[length - 1] ?? 0;
  const currentMinusDI = adxResult.minusDI[length - 1] ?? 0;

  // Calculate filter score
  const adxWeight = config.adxWeight ?? DEFAULT_REGIME_CONFIG.adxWeight;
  const tniWeight = config.tniWeight ?? DEFAULT_REGIME_CONFIG.tniWeight;

  const adxScore = Math.min(100, currentADX * 2);
  const tniScore = 50 + currentTNI / 2;

  const filterScore = adxScore * adxWeight + tniScore * tniWeight;

  // Generate recommendation
  let recommendation = '';

  if (regime.regime === 'trending_up') {
    recommendation = `Strong uptrend detected. ADX: ${currentADX.toFixed(1)}, +DI: ${currentPlusDI.toFixed(1)} > -DI: ${currentMinusDI.toFixed(1)}. Look for long entries on pullbacks to support.`;
  } else if (regime.regime === 'trending_down') {
    recommendation = `Strong downtrend detected. ADX: ${currentADX.toFixed(1)}, -DI: ${currentMinusDI.toFixed(1)} > +DI: ${currentPlusDI.toFixed(1)}. Look for short entries on rallies to resistance.`;
  } else if (regime.regime === 'ranging') {
    recommendation = `Ranging market. ADX: ${currentADX.toFixed(1)} below 20. Consider range-bound strategies: buy support, sell resistance. Avoid trend-following strategies.`;
  } else if (regime.regime === 'volatile') {
    recommendation = `High volatility regime. ADX: ${currentADX.toFixed(1)}, TNI: ${currentTNI.toFixed(1)}. Reduce position sizes, use wider stops. Wait for volatility to settle.`;
  } else {
    recommendation = `Transitional market. ADX: ${currentADX.toFixed(1)}, TNI: ${currentTNI.toFixed(1)}. Wait for clear direction confirmation before entering trades.`;
  }

  return {
    adx: adxResult,
    tni: tniResult,
    regime,
    filterScore,
    recommendation,
  };
}

// ==================== INDICATOR RESULT FOR CHART ====================

/**
 * Calculate regime filter as IndicatorResult for chart display
 */
export function calculateRegimeFilterIndicator(
  candles: Candle[],
  config: Partial<RegimeFilterConfig> = {}
): IndicatorResult {
  const adxResult = calculateADX(candles, config);
  const tniResult = calculateTNI(candles, config);

  // Build line data
  const buildLineData = (values: number[]): { time: Time; value: number }[] => {
    return candles
      .map((c, i) => ({
        time: c.time,
        value: values[i],
      }))
      .filter(d => !isNaN(d.value) && isFinite(d.value));
  };

  return {
    id: 'regime-filter',
    overlay: false,
    lines: [
      { name: 'adx', data: buildLineData(adxResult.adx), color: '#2196F3' },
      { name: 'plusDI', data: buildLineData(adxResult.plusDI), color: '#4CAF50' },
      { name: 'minusDI', data: buildLineData(adxResult.minusDI), color: '#F44336' },
      { name: 'tni', data: buildLineData(tniResult.tniSmoothed), color: '#9C27B0' },
    ],
    histograms: [],
  };
}

// ==================== EXPORTS ====================

const RegimeFilter = {
  calculateADX,
  calculateTNI,
  detectRegime,
  applyRegimeFilter,
  calculateIchimokuConfirmation,
  comprehensiveRegimeAnalysis,
  calculateRegimeFilterIndicator,
  DEFAULT_REGIME_CONFIG,
};

export default RegimeFilter;
