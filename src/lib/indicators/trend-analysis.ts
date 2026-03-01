/**
 * Trend Analysis Module
 * Ported from: https://github.com/harshgupta1810/trend_analysis_stockmarket
 *
 * Provides comprehensive trend analysis tools:
 * - Linear Regression Trend Detection
 * - Trend Strength Measurement
 * - Trend Direction Analysis
 * - Multiple Timeframe Trend Confirmation
 * - Trend Reversal Detection
 */

export interface TrendData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  trend: 'upward' | 'downward' | 'sideways';
  strength: number; // 0-100
}

export interface TrendAnalysisResult {
  timestamp: number;
  trend: 'upward' | 'downward' | 'sideways';
  strength: number;
  slope: number;
  rSquared: number;
  angle: number; // in degrees
}

export interface TrendLine {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  slope: number;
  type: 'support' | 'resistance';
  touches: number;
  strength: number;
}

export interface ComprehensiveTrendAnalysis {
  primaryTrend: 'upward' | 'downward' | 'sideways';
  trendStrength: number;
  slope: number;
  angle: number;
  rSquared: number;
  trendLines: TrendLine[];
  trendHistory: TrendAnalysisResult[];
  reversalWarning: boolean;
  reversalProbability: number;
  currentSignal: {
    signal: 'buy' | 'sell' | 'hold';
    strength: number;
    reason: string;
  };
  confidence: number;
}

/**
 * Perform Linear Regression
 * Returns slope, intercept, and R-squared
 */
export function linearRegression(
  xValues: number[],
  yValues: number[]
): { slope: number; intercept: number; rSquared: number } {
  const n = xValues.length;

  if (n < 2 || n !== yValues.length) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  // Calculate means
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - xMean) * (yValues[i] - yMean);
    denominator += (xValues[i] - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  let ssRes = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    ssRes += (yValues[i] - predicted) ** 2;
    ssTot += (yValues[i] - yMean) ** 2;
  }

  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

  return { slope, intercept, rSquared };
}

/**
 * Determine Trend from Slope
 */
export function determineTrendFromSlope(
  slope: number,
  priceRange: number,
  period: number,
  threshold: number = 0.01
): 'upward' | 'downward' | 'sideways' {
  // Normalize slope by price range and period
  const normalizedSlope = slope / (priceRange / period);

  if (normalizedSlope > threshold) {
    return 'upward';
  } else if (normalizedSlope < -threshold) {
    return 'downward';
  }

  return 'sideways';
}

/**
 * Calculate Trend Strength (0-100)
 * Based on R-squared and slope consistency
 */
export function calculateTrendStrength(
  slope: number,
  rSquared: number,
  dataLength: number
): number {
  // R-squared contribution (0-60 points)
  const rSquaredScore = rSquared * 60;

  // Slope significance contribution (0-40 points)
  // Stronger trends have more consistent slope
  const slopeScore = Math.min(40, Math.abs(slope) * 1000);

  // Data length bonus (more data = more confidence)
  const lengthBonus = Math.min(10, dataLength / 10);

  return Math.min(100, Math.max(0, rSquaredScore + slopeScore + lengthBonus));
}

/**
 * Calculate Angle from Slope
 */
export function calculateAngle(slope: number, priceScale: number = 1): number {
  // Convert slope to angle in degrees
  // Assuming x-axis is time (index) and y-axis is price
  return Math.atan(slope / priceScale) * (180 / Math.PI);
}

/**
 * Analyze Trend using Linear Regression
 */
export function analyzeTrend(
  data: TrendData[],
  period?: number
): TrendAnalysisResult {
  const usePeriod = period || data.length;

  if (data.length < 2) {
    return {
      timestamp: data[data.length - 1]?.timestamp || Date.now(),
      trend: 'sideways',
      strength: 0,
      slope: 0,
      rSquared: 0,
      angle: 0,
    };
  }

  const analysisData = period ? data.slice(-period) : data;

  // Create x values (indices)
  const xValues = analysisData.map((_, i) => i);
  const yValues = analysisData.map(d => d.close);

  // Perform linear regression
  const { slope, intercept, rSquared } = linearRegression(xValues, yValues);

  // Calculate price range
  const prices = analysisData.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // Determine trend
  const trend = determineTrendFromSlope(slope, priceRange, analysisData.length);

  // Calculate strength
  const strength = calculateTrendStrength(slope, rSquared, analysisData.length);

  // Calculate angle
  const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const angle = calculateAngle(slope, avgPrice);

  return {
    timestamp: analysisData[analysisData.length - 1].timestamp,
    trend,
    strength,
    slope,
    rSquared,
    angle,
  };
}

/**
 * Analyze Trend History over rolling periods
 */
export function analyzeTrendHistory(
  data: TrendData[],
  period: number = 20,
  step: number = 5
): TrendAnalysisResult[] {
  if (data.length < period) {
    return [];
  }

  const results: TrendAnalysisResult[] = [];

  for (let i = period; i <= data.length; i += step) {
    const segment = data.slice(i - period, i);
    const result = analyzeTrend(segment, period);
    results.push(result);
  }

  // Always include the most recent analysis
  if ((data.length - period) % step !== 0) {
    const lastSegment = data.slice(-period);
    const lastResult = analyzeTrend(lastSegment, period);
    results.push(lastResult);
  }

  return results;
}

/**
 * Identify Trend Lines (support and resistance)
 */
export function identifyTrendLines(
  data: TrendData[],
  lookback: number = 50,
  touchThreshold: number = 0.02
): TrendLine[] {
  if (data.length < lookback) {
    return [];
  }

  const trendLines: TrendLine[] = [];
  const analysisData = data.slice(-lookback);

  // Find local extremes
  const findLocalExtremes = (type: 'high' | 'low', window: number = 5) => {
    const extremes: { index: number; price: number }[] = [];

    for (let i = window; i < analysisData.length - window; i++) {
      let isExtreme = true;
      const currentPrice = type === 'high' ? analysisData[i].high : analysisData[i].low;

      for (let j = i - window; j <= i + window; j++) {
        if (j === i) continue;
        const comparePrice = type === 'high' ? analysisData[j].high : analysisData[j].low;
        if (type === 'high' && comparePrice >= currentPrice) {
          isExtreme = false;
          break;
        }
        if (type === 'low' && comparePrice <= currentPrice) {
          isExtreme = false;
          break;
        }
      }

      if (isExtreme) {
        extremes.push({ index: i, price: currentPrice });
      }
    }

    return extremes;
  };

  const highs = findLocalExtremes('high');
  const lows = findLocalExtremes('low');

  // Create resistance lines from highs
  for (let i = 0; i < highs.length - 1; i++) {
    for (let j = i + 1; j < highs.length; j++) {
      const slope = (highs[j].price - highs[i].price) / (highs[j].index - highs[i].index);

      // Count touches
      let touches = 2;
      for (let k = 0; k < analysisData.length; k++) {
        if (k === highs[i].index || k === highs[j].index) continue;
        const linePrice = highs[i].price + slope * (k - highs[i].index);
        const actualPrice = analysisData[k].high;
        const diff = Math.abs(actualPrice - linePrice) / linePrice;

        if (diff < touchThreshold) {
          touches++;
        }
      }

      if (touches >= 3) {
        trendLines.push({
          startIndex: highs[i].index,
          endIndex: highs[j].index,
          startPrice: highs[i].price,
          endPrice: highs[j].price,
          slope,
          type: 'resistance',
          touches,
          strength: Math.min(100, touches * 15),
        });
      }
    }
  }

  // Create support lines from lows
  for (let i = 0; i < lows.length - 1; i++) {
    for (let j = i + 1; j < lows.length; j++) {
      const slope = (lows[j].price - lows[i].price) / (lows[j].index - lows[i].index);

      // Count touches
      let touches = 2;
      for (let k = 0; k < analysisData.length; k++) {
        if (k === lows[i].index || k === lows[j].index) continue;
        const linePrice = lows[i].price + slope * (k - lows[i].index);
        const actualPrice = analysisData[k].low;
        const diff = Math.abs(actualPrice - linePrice) / linePrice;

        if (diff < touchThreshold) {
          touches++;
        }
      }

      if (touches >= 3) {
        trendLines.push({
          startIndex: lows[i].index,
          endIndex: lows[j].index,
          startPrice: lows[i].price,
          endPrice: lows[j].price,
          slope,
          type: 'support',
          touches,
          strength: Math.min(100, touches * 15),
        });
      }
    }
  }

  // Sort by strength (descending)
  return trendLines.sort((a, b) => b.strength - a.strength);
}

/**
 * Detect Trend Reversal
 */
export function detectTrendReversal(
  trendHistory: TrendAnalysisResult[],
  minTrendChanges: number = 2
): { warning: boolean; probability: number; reason: string } {
  if (trendHistory.length < 5) {
    return { warning: false, probability: 0, reason: 'Insufficient data' };
  }

  const recent = trendHistory.slice(-5);

  // Count trend changes
  let trendChanges = 0;
  let weakeningCount = 0;

  for (let i = 1; i < recent.length; i++) {
    if (recent[i].trend !== recent[i - 1].trend) {
      trendChanges++;
    }
    if (recent[i].strength < recent[i - 1].strength) {
      weakeningCount++;
    }
  }

  // Calculate reversal probability
  let probability = 0;

  // Trend instability
  probability += trendChanges * 15;

  // Strength decline
  probability += weakeningCount * 10;

  // R-squared decline
  const rSquaredDecline = recent[0].rSquared - recent[recent.length - 1].rSquared;
  if (rSquaredDecline > 0.2) {
    probability += 20;
  }

  // Slope direction change
  const firstSlope = recent[0].slope;
  const lastSlope = recent[recent.length - 1].slope;
  if (firstSlope * lastSlope < 0) {
    probability += 25; // Slope changed sign
  }

  probability = Math.min(100, Math.max(0, probability));

  const warning = probability > 50;

  let reason = 'No reversal signal';
  if (warning) {
    reason = `Potential trend reversal detected (${trendChanges} trend changes, strength declining)`;
  } else if (probability > 30) {
    reason = 'Trend weakening, monitor for potential reversal';
  }

  return { warning, probability, reason };
}

/**
 * Comprehensive Trend Analysis
 */
export function comprehensiveTrendAnalysis(
  data: TrendData[],
  options: {
    period?: number;
    step?: number;
    trendLineLookback?: number;
    touchThreshold?: number;
  } = {}
): ComprehensiveTrendAnalysis {
  const {
    period = 20,
    step = 5,
    trendLineLookback = 50,
    touchThreshold = 0.02,
  } = options;

  // Primary trend analysis
  const primaryAnalysis = analyzeTrend(data, period);

  // Trend history
  const trendHistory = analyzeTrendHistory(data, period, step);

  // Trend lines
  const trendLines = identifyTrendLines(data, trendLineLookback, touchThreshold);

  // Reversal detection
  const reversalCheck = detectTrendReversal(trendHistory);

  // Generate signal
  let signal: 'buy' | 'sell' | 'hold' = 'hold';
  let signalStrength = 50;
  let reason = 'No clear signal';

  if (primaryAnalysis.trend === 'upward' && primaryAnalysis.strength > 60) {
    signal = 'buy';
    signalStrength = primaryAnalysis.strength;
    reason = `Strong upward trend (strength: ${primaryAnalysis.strength.toFixed(0)}%)`;
  } else if (primaryAnalysis.trend === 'downward' && primaryAnalysis.strength > 60) {
    signal = 'sell';
    signalStrength = primaryAnalysis.strength;
    reason = `Strong downward trend (strength: ${primaryAnalysis.strength.toFixed(0)}%)`;
  } else if (primaryAnalysis.trend === 'sideways') {
    signal = 'hold';
    signalStrength = 30;
    reason = 'Market is ranging - wait for trend confirmation';
  }

  // Adjust for reversal warning
  if (reversalCheck.warning) {
    if (signal === 'buy') {
      signal = 'hold';
      signalStrength = Math.max(20, signalStrength - 30);
      reason = 'Upward trend may be reversing - consider taking profits';
    } else if (signal === 'sell') {
      signalStrength = Math.min(100, signalStrength + 20);
      reason = 'Downward trend accelerating with reversal potential';
    }
  }

  // Calculate confidence
  const confidence = Math.min(100, Math.max(0,
    primaryAnalysis.strength * 0.4 +
    primaryAnalysis.rSquared * 50 +
    (reversalCheck.warning ? -10 : 10) +
    (trendLines.length > 0 ? 10 : 0)
  ));

  return {
    primaryTrend: primaryAnalysis.trend,
    trendStrength: primaryAnalysis.strength,
    slope: primaryAnalysis.slope,
    angle: primaryAnalysis.angle,
    rSquared: primaryAnalysis.rSquared,
    trendLines,
    trendHistory,
    reversalWarning: reversalCheck.warning,
    reversalProbability: reversalCheck.probability,
    currentSignal: {
      signal,
      strength: signalStrength,
      reason,
    },
    confidence,
  };
}

/**
 * Multi-Timeframe Trend Analysis
 */
export function multiTimeframeTrendAnalysis(
  data: TrendData[],
  timeframes: number[] = [10, 20, 50, 100]
): {
  timeframe: number;
  trend: 'upward' | 'downward' | 'sideways';
  strength: number;
  alignment: 'bullish' | 'bearish' | 'mixed';
} {
  const results: { timeframe: number; trend: 'upward' | 'downward' | 'sideways'; strength: number }[] = [];

  for (const tf of timeframes) {
    if (data.length >= tf) {
      const analysis = analyzeTrend(data, tf);
      results.push({
        timeframe: tf,
        trend: analysis.trend,
        strength: analysis.strength,
      });
    }
  }

  // Determine alignment
  let bullishCount = 0;
  let bearishCount = 0;

  results.forEach(r => {
    if (r.trend === 'upward') bullishCount++;
    if (r.trend === 'downward') bearishCount++;
  });

  let alignment: 'bullish' | 'bearish' | 'mixed' = 'mixed';
  if (bullishCount > bearishCount && bullishCount >= results.length * 0.6) {
    alignment = 'bullish';
  } else if (bearishCount > bullishCount && bearishCount >= results.length * 0.6) {
    alignment = 'bearish';
  }

  return {
    ...results[results.length - 1],
    alignment,
  };
}

// Export all functions as default object
const trendAnalysis = {
  linearRegression,
  determineTrendFromSlope,
  calculateTrendStrength,
  calculateAngle,
  analyzeTrend,
  analyzeTrendHistory,
  identifyTrendLines,
  detectTrendReversal,
  comprehensiveTrendAnalysis,
  multiTimeframeTrendAnalysis,
};

export default trendAnalysis;
