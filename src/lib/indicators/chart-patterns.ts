/**
 * Chart Pattern Detection Library
 *
 * Ported from Python chart_patterns library by Zetra Team
 * https://github.com/zeta-zetra/chart_patterns
 *
 * This module provides algorithmic detection of chart patterns without AI/ML.
 * All patterns are detected using pivot points and linear regression.
 *
 * @author CITARION Team (TypeScript port)
 * @original Zetra Team (Python)
 * @license MIT
 */

//=============================================================================
// Types and Interfaces
//=============================================================================

export interface OHLC {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PivotPoint {
  index: number;
  type: 'high' | 'low' | 'both';
  value: number;
}

export interface PatternResult {
  type: PatternType;
  direction: 'bullish' | 'bearish' | 'neutral';
  startIndex: number;
  endIndex: number;
  confidence: number;
  points: PatternPoint[];
  slope?: number;
  intercept?: number;
  rSquared?: number;
}

export interface PatternPoint {
  index: number;
  value: number;
  label: string;
}

export type PatternType =
  | 'head_and_shoulders'
  | 'inverse_head_and_shoulders'
  | 'double_top'
  | 'double_bottom'
  | 'triple_top'
  | 'triple_bottom'
  | 'ascending_triangle'
  | 'descending_triangle'
  | 'symmetrical_triangle'
  | 'rising_wedge'
  | 'falling_wedge'
  | 'bull_flag'
  | 'bear_flag'
  | 'pennant'
  | 'rectangle';

export interface ChartPatternsConfig {
  /** Number of candles to look back for pattern detection */
  lookback: number;
  /** Number of candles on each side for pivot detection */
  pivotInterval: number;
  /** Minimum R-squared value for trendline fit */
  minRSquared: number;
  /** Maximum slope for flat lines */
  maxFlatSlope: number;
  /** Ratio tolerance for double tops/bottoms */
  doubleRatio: number;
  /** Ratio tolerance for head vs shoulders */
  headShoulderRatio: number;
}

const DEFAULT_CONFIG: ChartPatternsConfig = {
  lookback: 60,
  pivotInterval: 5,
  minRSquared: 0.85,
  maxFlatSlope: 0.0001,
  doubleRatio: 0.02,
  headShoulderRatio: 0.002,
};

//=============================================================================
// Pivot Points Detection
//=============================================================================

/**
 * Find a single pivot point at the given index
 *
 * @param data - OHLC data array
 * @param currentIndex - Index to check for pivot
 * @param leftCount - Number of candles to the left
 * @param rightCount - Number of candles to the right
 * @returns 0 = not a pivot, 1 = pivot low, 2 = pivot high, 3 = both
 */
export function findPivotPoint(
  data: OHLC[],
  currentIndex: number,
  leftCount: number = 3,
  rightCount: number = 3
): number {
  // Check bounds
  if (currentIndex - leftCount < 0 || currentIndex + rightCount >= data.length) {
    return 0;
  }

  let isPivotLow = true;
  let isPivotHigh = true;

  const currentLow = data[currentIndex].low;
  const currentHigh = data[currentIndex].high;

  for (let i = currentIndex - leftCount; i <= currentIndex + rightCount; i++) {
    if (i === currentIndex) continue;

    // Check if current is lowest
    if (currentLow > data[i].low) {
      isPivotLow = false;
    }

    // Check if current is highest
    if (currentHigh < data[i].high) {
      isPivotHigh = false;
    }
  }

  if (isPivotLow && isPivotHigh) return 3;
  if (isPivotLow) return 1;
  if (isPivotHigh) return 2;
  return 0;
}

/**
 * Find all pivot points in the OHLC data
 *
 * @param data - OHLC data array
 * @param leftCount - Number of candles to the left
 * @param rightCount - Number of candles to the right
 * @returns Array of pivot points with type and position
 */
export function findAllPivotPoints(
  data: OHLC[],
  leftCount: number = 3,
  rightCount: number = 3
): PivotPoint[] {
  const pivots: PivotPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    const pivotType = findPivotPoint(data, i, leftCount, rightCount);

    if (pivotType === 1) {
      pivots.push({
        index: i,
        type: 'low',
        value: data[i].low,
      });
    } else if (pivotType === 2) {
      pivots.push({
        index: i,
        type: 'high',
        value: data[i].high,
      });
    } else if (pivotType === 3) {
      // Both high and low - add both
      pivots.push({
        index: i,
        type: 'both',
        value: data[i].high,
      });
    }
  }

  return pivots;
}

//=============================================================================
// Linear Regression Utilities
//=============================================================================

interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

/**
 * Perform linear regression on x, y data points
 */
export function linearRegression(x: number[], y: number[]): RegressionResult {
  const n = x.length;
  if (n !== y.length || n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
    sumY2 += y[i] * y[i];
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const meanY = sumY / n;
  let ssTotal = 0;
  let ssResidual = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept;
    ssTotal += (y[i] - meanY) ** 2;
    ssResidual += (y[i] - predicted) ** 2;
  }

  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  return { slope, intercept, rSquared };
}

//=============================================================================
// Pattern Detection Functions
//=============================================================================

/**
 * Find Head and Shoulders pattern (bearish reversal)
 *
 * Pattern structure:
 *   Left Shoulder - Head - Right Shoulder
 *   With a neckline connecting the two troughs
 */
export function findHeadAndShoulders(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);

  // Separate highs and lows
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  for (let i = 2; i < highs.length - 2; i++) {
    // We need at least 3 highs (left shoulder, head, right shoulder)
    // and 2 lows for the neckline

    const leftShoulder = highs[i - 1];
    const head = highs[i];
    const rightShoulder = highs[i + 1];

    if (!leftShoulder || !head || !rightShoulder) continue;

    // Find neckline lows (between shoulders)
    const necklineLows = lows.filter(
      l => l.index > leftShoulder.index && l.index < rightShoulder.index
    );

    if (necklineLows.length < 2) continue;

    // Sort by index
    necklineLows.sort((a, b) => a.index - b.index);

    // Check head is highest
    if (head.value <= leftShoulder.value || head.value <= rightShoulder.value) {
      continue;
    }

    // Check shoulders are roughly equal
    const shoulderRatio = Math.abs(leftShoulder.value - rightShoulder.value) / leftShoulder.value;
    if (shoulderRatio > 0.05) continue; // 5% tolerance

    // Check head is significantly higher than shoulders
    const headRatio = head.value / Math.max(leftShoulder.value, rightShoulder.value);
    if (headRatio < 1.01) continue; // Head must be at least 1% higher

    // Calculate neckline slope
    const neckIndices = necklineLows.slice(0, 2).map(l => l.index);
    const neckValues = necklineLows.slice(0, 2).map(l => l.value);
    const neckReg = linearRegression(neckIndices, neckValues);

    // Neckline should be relatively flat or slightly upward
    if (Math.abs(neckReg.slope) > 0.001) continue;

    patterns.push({
      type: 'head_and_shoulders',
      direction: 'bearish',
      startIndex: leftShoulder.index,
      endIndex: rightShoulder.index,
      confidence: Math.min(headRatio - 1, 0.2) * 5 + (1 - shoulderRatio * 10),
      points: [
        { index: leftShoulder.index, value: leftShoulder.value, label: 'Left Shoulder' },
        { index: necklineLows[0].index, value: necklineLows[0].value, label: 'Neckline Left' },
        { index: head.index, value: head.value, label: 'Head' },
        { index: necklineLows[1].index, value: necklineLows[1].value, label: 'Neckline Right' },
        { index: rightShoulder.index, value: rightShoulder.value, label: 'Right Shoulder' },
      ],
      slope: neckReg.slope,
      intercept: neckReg.intercept,
      rSquared: neckReg.rSquared,
    });
  }

  return patterns;
}

/**
 * Find Inverse Head and Shoulders pattern (bullish reversal)
 */
export function findInverseHeadAndShoulders(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);

  // Separate highs and lows
  const highs = pivots.filter(p => p.type === 'high');
  const lows = pivots.filter(p => p.type === 'low' || p.type === 'both');

  for (let i = 2; i < lows.length - 2; i++) {
    const leftShoulder = lows[i - 1];
    const head = lows[i];
    const rightShoulder = lows[i + 1];

    if (!leftShoulder || !head || !rightShoulder) continue;

    // Find neckline highs (between shoulders)
    const necklineHighs = highs.filter(
      h => h.index > leftShoulder.index && h.index < rightShoulder.index
    );

    if (necklineHighs.length < 2) continue;

    necklineHighs.sort((a, b) => a.index - b.index);

    // Check head is lowest
    if (head.value >= leftShoulder.value || head.value >= rightShoulder.value) {
      continue;
    }

    // Check shoulders are roughly equal
    const shoulderRatio = Math.abs(leftShoulder.value - rightShoulder.value) / leftShoulder.value;
    if (shoulderRatio > 0.05) continue;

    // Check head is significantly lower than shoulders
    const headRatio = head.value / Math.min(leftShoulder.value, rightShoulder.value);
    if (headRatio > 0.99) continue;

    // Calculate neckline slope
    const neckIndices = necklineHighs.slice(0, 2).map(h => h.index);
    const neckValues = necklineHighs.slice(0, 2).map(h => h.value);
    const neckReg = linearRegression(neckIndices, neckValues);

    patterns.push({
      type: 'inverse_head_and_shoulders',
      direction: 'bullish',
      startIndex: leftShoulder.index,
      endIndex: rightShoulder.index,
      confidence: Math.min(1 - headRatio, 0.2) * 5 + (1 - shoulderRatio * 10),
      points: [
        { index: leftShoulder.index, value: leftShoulder.value, label: 'Left Shoulder' },
        { index: necklineHighs[0].index, value: necklineHighs[0].value, label: 'Neckline Left' },
        { index: head.index, value: head.value, label: 'Head' },
        { index: necklineHighs[1].index, value: necklineHighs[1].value, label: 'Neckline Right' },
        { index: rightShoulder.index, value: rightShoulder.value, label: 'Right Shoulder' },
      ],
      slope: neckReg.slope,
      intercept: neckReg.intercept,
      rSquared: neckReg.rSquared,
    });
  }

  return patterns;
}

/**
 * Find Double Top pattern (bearish reversal)
 */
export function findDoubleTop(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  for (let i = 1; i < highs.length - 1; i++) {
    const peak1 = highs[i - 1];
    const peak2 = highs[i];

    // Find the trough between the two peaks
    const troughs = lows.filter(
      l => l.index > peak1.index && l.index < peak2.index
    );

    if (troughs.length === 0) continue;

    const trough = troughs.reduce((min, t) => t.value < min.value ? t : min, troughs[0]);

    // Check peaks are roughly equal
    const peakRatio = Math.abs(peak1.value - peak2.value) / peak1.value;
    if (peakRatio > cfg.doubleRatio) continue;

    // Check trough is significantly lower
    const troughRatio = (Math.min(peak1.value, peak2.value) - trough.value) / peak1.value;
    if (troughRatio < 0.01) continue; // At least 1% lower

    patterns.push({
      type: 'double_top',
      direction: 'bearish',
      startIndex: peak1.index,
      endIndex: peak2.index,
      confidence: 1 - peakRatio / cfg.doubleRatio,
      points: [
        { index: peak1.index, value: peak1.value, label: 'Peak 1' },
        { index: trough.index, value: trough.value, label: 'Trough' },
        { index: peak2.index, value: peak2.value, label: 'Peak 2' },
      ],
    });
  }

  return patterns;
}

/**
 * Find Double Bottom pattern (bullish reversal)
 */
export function findDoubleBottom(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high');
  const lows = pivots.filter(p => p.type === 'low' || p.type === 'both');

  for (let i = 1; i < lows.length - 1; i++) {
    const trough1 = lows[i - 1];
    const trough2 = lows[i];

    // Find the peak between the two troughs
    const peaks = highs.filter(
      h => h.index > trough1.index && h.index < trough2.index
    );

    if (peaks.length === 0) continue;

    const peak = peaks.reduce((max, h) => h.value > max.value ? h : max, peaks[0]);

    // Check troughs are roughly equal
    const troughRatio = Math.abs(trough1.value - trough2.value) / trough1.value;
    if (troughRatio > cfg.doubleRatio) continue;

    // Check peak is significantly higher
    const peakRatio = (peak.value - Math.max(trough1.value, trough2.value)) / trough1.value;
    if (peakRatio < 0.01) continue;

    patterns.push({
      type: 'double_bottom',
      direction: 'bullish',
      startIndex: trough1.index,
      endIndex: trough2.index,
      confidence: 1 - troughRatio / cfg.doubleRatio,
      points: [
        { index: trough1.index, value: trough1.value, label: 'Trough 1' },
        { index: peak.index, value: peak.value, label: 'Peak' },
        { index: trough2.index, value: trough2.value, label: 'Trough 2' },
      ],
    });
  }

  return patterns;
}

/**
 * Find Ascending Triangle pattern (bullish continuation)
 *
 * Flat upper trendline, rising lower trendline
 */
export function findAscendingTriangle(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  // Need at least 3 points for each trendline
  if (highs.length < 3 || lows.length < 3) return patterns;

  for (let startIdx = 0; startIdx < highs.length - 3; startIdx++) {
    for (let endIdx = startIdx + 10; endIdx < Math.min(startIdx + cfg.lookback, data.length); endIdx++) {
      // Get highs and lows in this range
      const rangeHighs = highs.filter(h => h.index >= startIdx && h.index <= endIdx);
      const rangeLows = lows.filter(l => l.index >= startIdx && l.index <= endIdx);

      if (rangeHighs.length < 3 || rangeLows.length < 3) continue;

      // Check upper trendline (should be flat)
      const highIndices = rangeHighs.map(h => h.index);
      const highValues = rangeHighs.map(h => h.value);
      const highReg = linearRegression(highIndices, highValues);

      if (Math.abs(highReg.slope) > cfg.maxFlatSlope || highReg.rSquared < cfg.minRSquared) continue;

      // Check lower trendline (should be rising)
      const lowIndices = rangeLows.map(l => l.index);
      const lowValues = rangeLows.map(l => l.value);
      const lowReg = linearRegression(lowIndices, lowValues);

      if (lowReg.slope <= 0 || lowReg.rSquared < cfg.minRSquared) continue;

      patterns.push({
        type: 'ascending_triangle',
        direction: 'bullish',
        startIndex: Math.min(...highIndices, ...lowIndices),
        endIndex: Math.max(...highIndices, ...lowIndices),
        confidence: (highReg.rSquared + lowReg.rSquared) / 2,
        points: [
          ...rangeHighs.map((h, i) => ({ index: h.index, value: h.value, label: `High ${i + 1}` })),
          ...rangeLows.map((l, i) => ({ index: l.index, value: l.value, label: `Low ${i + 1}` })),
        ],
        slope: lowReg.slope,
        intercept: lowReg.intercept,
        rSquared: (highReg.rSquared + lowReg.rSquared) / 2,
      });

      break; // Found pattern, move to next starting point
    }
  }

  return patterns;
}

/**
 * Find Descending Triangle pattern (bearish continuation)
 *
 * Falling upper trendline, flat lower trendline
 */
export function findDescendingTriangle(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  if (highs.length < 3 || lows.length < 3) return patterns;

  for (let startIdx = 0; startIdx < lows.length - 3; startIdx++) {
    for (let endIdx = startIdx + 10; endIdx < Math.min(startIdx + cfg.lookback, data.length); endIdx++) {
      const rangeHighs = highs.filter(h => h.index >= startIdx && h.index <= endIdx);
      const rangeLows = lows.filter(l => l.index >= startIdx && l.index <= endIdx);

      if (rangeHighs.length < 3 || rangeLows.length < 3) continue;

      // Check lower trendline (should be flat)
      const lowIndices = rangeLows.map(l => l.index);
      const lowValues = rangeLows.map(l => l.value);
      const lowReg = linearRegression(lowIndices, lowValues);

      if (Math.abs(lowReg.slope) > cfg.maxFlatSlope || lowReg.rSquared < cfg.minRSquared) continue;

      // Check upper trendline (should be falling)
      const highIndices = rangeHighs.map(h => h.index);
      const highValues = rangeHighs.map(h => h.value);
      const highReg = linearRegression(highIndices, highValues);

      if (highReg.slope >= 0 || highReg.rSquared < cfg.minRSquared) continue;

      patterns.push({
        type: 'descending_triangle',
        direction: 'bearish',
        startIndex: Math.min(...highIndices, ...lowIndices),
        endIndex: Math.max(...highIndices, ...lowIndices),
        confidence: (highReg.rSquared + lowReg.rSquared) / 2,
        points: [
          ...rangeHighs.map((h, i) => ({ index: h.index, value: h.value, label: `High ${i + 1}` })),
          ...rangeLows.map((l, i) => ({ index: l.index, value: l.value, label: `Low ${i + 1}` })),
        ],
        slope: highReg.slope,
        intercept: highReg.intercept,
        rSquared: (highReg.rSquared + lowReg.rSquared) / 2,
      });

      break;
    }
  }

  return patterns;
}

/**
 * Find Symmetrical Triangle pattern (continuation, direction depends on breakout)
 *
 * Both trendlines converging
 */
export function findSymmetricalTriangle(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  if (highs.length < 3 || lows.length < 3) return patterns;

  for (let startIdx = 0; startIdx < Math.min(highs.length, lows.length) - 3; startIdx++) {
    for (let endIdx = startIdx + 10; endIdx < Math.min(startIdx + cfg.lookback, data.length); endIdx++) {
      const rangeHighs = highs.filter(h => h.index >= startIdx && h.index <= endIdx);
      const rangeLows = lows.filter(l => l.index >= startIdx && l.index <= endIdx);

      if (rangeHighs.length < 3 || rangeLows.length < 3) continue;

      const highIndices = rangeHighs.map(h => h.index);
      const highValues = rangeHighs.map(h => h.value);
      const highReg = linearRegression(highIndices, highValues);

      const lowIndices = rangeLows.map(l => l.index);
      const lowValues = rangeLows.map(l => l.value);
      const lowReg = linearRegression(lowIndices, lowValues);

      // Upper trendline should be falling
      if (highReg.slope >= 0 || highReg.rSquared < cfg.minRSquared) continue;

      // Lower trendline should be rising
      if (lowReg.slope <= 0 || lowReg.rSquared < cfg.minRSquared) continue;

      // Lines should be converging
      const convergence = Math.abs(highReg.slope) - Math.abs(lowReg.slope);
      if (Math.abs(convergence) > 0.001) continue;

      patterns.push({
        type: 'symmetrical_triangle',
        direction: 'neutral',
        startIndex: Math.min(...highIndices, ...lowIndices),
        endIndex: Math.max(...highIndices, ...lowIndices),
        confidence: (highReg.rSquared + lowReg.rSquared) / 2,
        points: [
          ...rangeHighs.map((h, i) => ({ index: h.index, value: h.value, label: `High ${i + 1}` })),
          ...rangeLows.map((l, i) => ({ index: l.index, value: l.value, label: `Low ${i + 1}` })),
        ],
        rSquared: (highReg.rSquared + lowReg.rSquared) / 2,
      });

      break;
    }
  }

  return patterns;
}

/**
 * Find Rising Wedge pattern (bearish reversal)
 *
 * Both trendlines rising, but lower trendline steeper
 */
export function findRisingWedge(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  if (highs.length < 3 || lows.length < 3) return patterns;

  for (let startIdx = 0; startIdx < Math.min(highs.length, lows.length) - 3; startIdx++) {
    for (let endIdx = startIdx + 10; endIdx < Math.min(startIdx + cfg.lookback, data.length); endIdx++) {
      const rangeHighs = highs.filter(h => h.index >= startIdx && h.index <= endIdx);
      const rangeLows = lows.filter(l => l.index >= startIdx && l.index <= endIdx);

      if (rangeHighs.length < 3 || rangeLows.length < 3) continue;

      const highIndices = rangeHighs.map(h => h.index);
      const highValues = rangeHighs.map(h => h.value);
      const highReg = linearRegression(highIndices, highValues);

      const lowIndices = rangeLows.map(l => l.index);
      const lowValues = rangeLows.map(l => l.value);
      const lowReg = linearRegression(lowIndices, lowValues);

      // Both trendlines should be rising
      if (highReg.slope <= 0 || lowReg.slope <= 0) continue;

      // Lower trendline should be steeper
      if (lowReg.slope <= highReg.slope) continue;

      if (highReg.rSquared < cfg.minRSquared || lowReg.rSquared < cfg.minRSquared) continue;

      patterns.push({
        type: 'rising_wedge',
        direction: 'bearish',
        startIndex: Math.min(...highIndices, ...lowIndices),
        endIndex: Math.max(...highIndices, ...lowIndices),
        confidence: (highReg.rSquared + lowReg.rSquared) / 2,
        points: [
          ...rangeHighs.map((h, i) => ({ index: h.index, value: h.value, label: `High ${i + 1}` })),
          ...rangeLows.map((l, i) => ({ index: l.index, value: l.value, label: `Low ${i + 1}` })),
        ],
        rSquared: (highReg.rSquared + lowReg.rSquared) / 2,
      });

      break;
    }
  }

  return patterns;
}

/**
 * Find Falling Wedge pattern (bullish reversal)
 *
 * Both trendlines falling, but upper trendline steeper
 */
export function findFallingWedge(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  if (highs.length < 3 || lows.length < 3) return patterns;

  for (let startIdx = 0; startIdx < Math.min(highs.length, lows.length) - 3; startIdx++) {
    for (let endIdx = startIdx + 10; endIdx < Math.min(startIdx + cfg.lookback, data.length); endIdx++) {
      const rangeHighs = highs.filter(h => h.index >= startIdx && h.index <= endIdx);
      const rangeLows = lows.filter(l => l.index >= startIdx && l.index <= endIdx);

      if (rangeHighs.length < 3 || rangeLows.length < 3) continue;

      const highIndices = rangeHighs.map(h => h.index);
      const highValues = rangeHighs.map(h => h.value);
      const highReg = linearRegression(highIndices, highValues);

      const lowIndices = rangeLows.map(l => l.index);
      const lowValues = rangeLows.map(l => l.value);
      const lowReg = linearRegression(lowIndices, lowValues);

      // Both trendlines should be falling
      if (highReg.slope >= 0 || lowReg.slope >= 0) continue;

      // Upper trendline should be steeper (more negative)
      if (highReg.slope >= lowReg.slope) continue;

      if (highReg.rSquared < cfg.minRSquared || lowReg.rSquared < cfg.minRSquared) continue;

      patterns.push({
        type: 'falling_wedge',
        direction: 'bullish',
        startIndex: Math.min(...highIndices, ...lowIndices),
        endIndex: Math.max(...highIndices, ...lowIndices),
        confidence: (highReg.rSquared + lowReg.rSquared) / 2,
        points: [
          ...rangeHighs.map((h, i) => ({ index: h.index, value: h.value, label: `High ${i + 1}` })),
          ...rangeLows.map((l, i) => ({ index: l.index, value: l.value, label: `Low ${i + 1}` })),
        ],
        rSquared: (highReg.rSquared + lowReg.rSquared) / 2,
      });

      break;
    }
  }

  return patterns;
}

/**
 * Find Flag pattern (continuation)
 *
 * Parallel trendlines in opposite direction to the trend
 */
export function findFlag(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  if (highs.length < 3 || lows.length < 3) return patterns;

  for (let startIdx = 0; startIdx < Math.min(highs.length, lows.length) - 3; startIdx++) {
    for (let endIdx = startIdx + 10; endIdx < Math.min(startIdx + cfg.lookback, data.length); endIdx++) {
      const rangeHighs = highs.filter(h => h.index >= startIdx && h.index <= endIdx);
      const rangeLows = lows.filter(l => l.index >= startIdx && l.index <= endIdx);

      if (rangeHighs.length < 3 || rangeLows.length < 3) continue;

      const highIndices = rangeHighs.map(h => h.index);
      const highValues = rangeHighs.map(h => h.value);
      const highReg = linearRegression(highIndices, highValues);

      const lowIndices = rangeLows.map(l => l.index);
      const lowValues = rangeLows.map(l => l.value);
      const lowReg = linearRegression(lowIndices, lowValues);

      // Both trendlines should have similar slope (parallel)
      const slopeRatio = lowReg.slope / highReg.slope;
      if (slopeRatio < 0.8 || slopeRatio > 1.2) continue;

      // Bull flag: slightly downward sloping parallel lines
      const isBullFlag = highReg.slope < 0 && lowReg.slope < 0;

      // Bear flag: slightly upward sloping parallel lines
      const isBearFlag = highReg.slope > 0 && lowReg.slope > 0;

      if (!isBullFlag && !isBearFlag) continue;

      if (highReg.rSquared < cfg.minRSquared || lowReg.rSquared < cfg.minRSquared) continue;

      patterns.push({
        type: isBullFlag ? 'bull_flag' : 'bear_flag',
        direction: isBullFlag ? 'bullish' : 'bearish',
        startIndex: Math.min(...highIndices, ...lowIndices),
        endIndex: Math.max(...highIndices, ...lowIndices),
        confidence: (highReg.rSquared + lowReg.rSquared) / 2,
        points: [
          ...rangeHighs.map((h, i) => ({ index: h.index, value: h.value, label: `High ${i + 1}` })),
          ...rangeLows.map((l, i) => ({ index: l.index, value: l.value, label: `Low ${i + 1}` })),
        ],
        rSquared: (highReg.rSquared + lowReg.rSquared) / 2,
      });

      break;
    }
  }

  return patterns;
}

/**
 * Find Pennant pattern (continuation)
 *
 * Converging trendlines forming a small triangle after a strong move
 */
export function findPennant(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  if (highs.length < 3 || lows.length < 3) return patterns;

  for (let startIdx = 0; startIdx < Math.min(highs.length, lows.length) - 3; startIdx++) {
    for (let endIdx = startIdx + 5; endIdx < Math.min(startIdx + 25, data.length); endIdx++) {
      const rangeHighs = highs.filter(h => h.index >= startIdx && h.index <= endIdx);
      const rangeLows = lows.filter(l => l.index >= startIdx && l.index <= endIdx);

      if (rangeHighs.length < 3 || rangeLows.length < 3) continue;

      const highIndices = rangeHighs.map(h => h.index);
      const highValues = rangeHighs.map(h => h.value);
      const highReg = linearRegression(highIndices, highValues);

      const lowIndices = rangeLows.map(l => l.index);
      const lowValues = rangeLows.map(l => l.value);
      const lowReg = linearRegression(lowIndices, lowValues);

      // Upper trendline should be falling
      if (highReg.slope >= 0) continue;

      // Lower trendline should be rising
      if (lowReg.slope <= 0) continue;

      // Slopes should be roughly symmetrical
      const slopeRatio = Math.abs(highReg.slope / lowReg.slope);
      if (slopeRatio < 0.8 || slopeRatio > 1.2) continue;

      if (highReg.rSquared < cfg.minRSquared || lowReg.rSquared < cfg.minRSquared) continue;

      patterns.push({
        type: 'pennant',
        direction: 'neutral',
        startIndex: Math.min(...highIndices, ...lowIndices),
        endIndex: Math.max(...highIndices, ...lowIndices),
        confidence: (highReg.rSquared + lowReg.rSquared) / 2,
        points: [
          ...rangeHighs.map((h, i) => ({ index: h.index, value: h.value, label: `High ${i + 1}` })),
          ...rangeLows.map((l, i) => ({ index: l.index, value: l.value, label: `Low ${i + 1}` })),
        ],
        rSquared: (highReg.rSquared + lowReg.rSquared) / 2,
      });

      break;
    }
  }

  return patterns;
}

/**
 * Find Rectangle pattern (continuation)
 *
 * Horizontal parallel trendlines (support and resistance)
 */
export function findRectangle(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): PatternResult[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const patterns: PatternResult[] = [];
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);
  const highs = pivots.filter(p => p.type === 'high' || p.type === 'both');
  const lows = pivots.filter(p => p.type === 'low');

  if (highs.length < 3 || lows.length < 3) return patterns;

  for (let startIdx = 0; startIdx < Math.min(highs.length, lows.length) - 3; startIdx++) {
    for (let endIdx = startIdx + 10; endIdx < Math.min(startIdx + cfg.lookback, data.length); endIdx++) {
      const rangeHighs = highs.filter(h => h.index >= startIdx && h.index <= endIdx);
      const rangeLows = lows.filter(l => l.index >= startIdx && l.index <= endIdx);

      if (rangeHighs.length < 3 || rangeLows.length < 3) continue;

      const highIndices = rangeHighs.map(h => h.index);
      const highValues = rangeHighs.map(h => h.value);
      const highReg = linearRegression(highIndices, highValues);

      const lowIndices = rangeLows.map(l => l.index);
      const lowValues = rangeLows.map(l => l.value);
      const lowReg = linearRegression(lowIndices, lowValues);

      // Both trendlines should be flat
      if (Math.abs(highReg.slope) > cfg.maxFlatSlope) continue;
      if (Math.abs(lowReg.slope) > cfg.maxFlatSlope) continue;

      if (highReg.rSquared < cfg.minRSquared || lowReg.rSquared < cfg.minRSquared) continue;

      patterns.push({
        type: 'rectangle',
        direction: 'neutral',
        startIndex: Math.min(...highIndices, ...lowIndices),
        endIndex: Math.max(...highIndices, ...lowIndices),
        confidence: (highReg.rSquared + lowReg.rSquared) / 2,
        points: [
          ...rangeHighs.map((h, i) => ({ index: h.index, value: h.value, label: `High ${i + 1}` })),
          ...rangeLows.map((l, i) => ({ index: l.index, value: l.value, label: `Low ${i + 1}` })),
        ],
        rSquared: (highReg.rSquared + lowReg.rSquared) / 2,
      });

      break;
    }
  }

  return patterns;
}

//=============================================================================
// Main Detection Function
//=============================================================================

export interface AllPatternsResult {
  patterns: PatternResult[];
  pivots: PivotPoint[];
  byType: Record<PatternType, PatternResult[]>;
  byDirection: {
    bullish: PatternResult[];
    bearish: PatternResult[];
    neutral: PatternResult[];
  };
}

/**
 * Detect all chart patterns in the OHLC data
 *
 * @param data - OHLC data array
 * @param config - Detection configuration
 * @returns All detected patterns organized by type and direction
 */
export function detectAllChartPatterns(
  data: OHLC[],
  config: Partial<ChartPatternsConfig> = {}
): AllPatternsResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Detect all pattern types
  const allPatterns: PatternResult[] = [
    ...findHeadAndShoulders(data, cfg),
    ...findInverseHeadAndShoulders(data, cfg),
    ...findDoubleTop(data, cfg),
    ...findDoubleBottom(data, cfg),
    ...findAscendingTriangle(data, cfg),
    ...findDescendingTriangle(data, cfg),
    ...findSymmetricalTriangle(data, cfg),
    ...findRisingWedge(data, cfg),
    ...findFallingWedge(data, cfg),
    ...findFlag(data, cfg),
    ...findPennant(data, cfg),
    ...findRectangle(data, cfg),
  ];

  // Remove overlapping patterns (keep highest confidence)
  const filteredPatterns = removeOverlappingPatterns(allPatterns);

  // Get all pivot points
  const pivots = findAllPivotPoints(data, cfg.pivotInterval, cfg.pivotInterval);

  // Organize by type
  const byType: Record<PatternType, PatternResult[]> = {
    head_and_shoulders: [],
    inverse_head_and_shoulders: [],
    double_top: [],
    double_bottom: [],
    triple_top: [],
    triple_bottom: [],
    ascending_triangle: [],
    descending_triangle: [],
    symmetrical_triangle: [],
    rising_wedge: [],
    falling_wedge: [],
    bull_flag: [],
    bear_flag: [],
    pennant: [],
    rectangle: [],
  };

  for (const pattern of filteredPatterns) {
    byType[pattern.type].push(pattern);
  }

  // Organize by direction
  const byDirection = {
    bullish: filteredPatterns.filter(p => p.direction === 'bullish'),
    bearish: filteredPatterns.filter(p => p.direction === 'bearish'),
    neutral: filteredPatterns.filter(p => p.direction === 'neutral'),
  };

  return {
    patterns: filteredPatterns,
    pivots,
    byType,
    byDirection,
  };
}

/**
 * Remove overlapping patterns, keeping the one with highest confidence
 */
function removeOverlappingPatterns(patterns: PatternResult[]): PatternResult[] {
  if (patterns.length === 0) return [];

  // Sort by confidence (highest first)
  const sorted = [...patterns].sort((a, b) => b.confidence - a.confidence);

  const result: PatternResult[] = [];

  for (const pattern of sorted) {
    // Check if this pattern overlaps with any already accepted pattern
    const overlaps = result.some(existing => {
      const startOverlap = Math.max(pattern.startIndex, existing.startIndex);
      const endOverlap = Math.min(pattern.endIndex, existing.endIndex);
      return startOverlap <= endOverlap;
    });

    if (!overlaps) {
      result.push(pattern);
    }
  }

  return result;
}

//=============================================================================
// Pattern Description Utility
//=============================================================================

export const PATTERN_DESCRIPTIONS: Record<PatternType, {
  name: string;
  type: 'reversal' | 'continuation';
  direction: string;
  description: string;
}> = {
  head_and_shoulders: {
    name: 'Head and Shoulders',
    type: 'reversal',
    direction: 'Bearish',
    description: 'A bearish reversal pattern with three peaks, where the middle peak (head) is higher than the two outer peaks (shoulders). Signals a potential trend reversal from bullish to bearish.',
  },
  inverse_head_and_shoulders: {
    name: 'Inverse Head and Shoulders',
    type: 'reversal',
    direction: 'Bullish',
    description: 'A bullish reversal pattern with three troughs, where the middle trough (head) is lower than the two outer troughs (shoulders). Signals a potential trend reversal from bearish to bullish.',
  },
  double_top: {
    name: 'Double Top',
    type: 'reversal',
    direction: 'Bearish',
    description: 'A bearish reversal pattern with two peaks at approximately the same price level. Signals a potential trend reversal when price breaks below the neckline.',
  },
  double_bottom: {
    name: 'Double Bottom',
    type: 'reversal',
    direction: 'Bullish',
    description: 'A bullish reversal pattern with two troughs at approximately the same price level. Signals a potential trend reversal when price breaks above the neckline.',
  },
  triple_top: {
    name: 'Triple Top',
    type: 'reversal',
    direction: 'Bearish',
    description: 'A bearish reversal pattern with three peaks at approximately the same price level. Similar to double top but with an additional peak.',
  },
  triple_bottom: {
    name: 'Triple Bottom',
    type: 'reversal',
    direction: 'Bullish',
    description: 'A bullish reversal pattern with three troughs at approximately the same price level. Similar to double bottom but with an additional trough.',
  },
  ascending_triangle: {
    name: 'Ascending Triangle',
    type: 'continuation',
    direction: 'Bullish',
    description: 'A bullish continuation pattern with a flat upper trendline and rising lower trendline. Signals potential continuation of an uptrend when price breaks above the upper trendline.',
  },
  descending_triangle: {
    name: 'Descending Triangle',
    type: 'continuation',
    direction: 'Bearish',
    description: 'A bearish continuation pattern with a falling upper trendline and flat lower trendline. Signals potential continuation of a downtrend when price breaks below the lower trendline.',
  },
  symmetrical_triangle: {
    name: 'Symmetrical Triangle',
    type: 'continuation',
    direction: 'Neutral',
    description: 'A continuation pattern with converging trendlines. The direction of the breakout determines the future trend direction.',
  },
  rising_wedge: {
    name: 'Rising Wedge',
    type: 'reversal',
    direction: 'Bearish',
    description: 'A bearish reversal pattern with both trendlines rising, but the lower trendline is steeper. Signals potential reversal when price breaks below the lower trendline.',
  },
  falling_wedge: {
    name: 'Falling Wedge',
    type: 'reversal',
    direction: 'Bullish',
    description: 'A bullish reversal pattern with both trendlines falling, but the upper trendline is steeper. Signals potential reversal when price breaks above the upper trendline.',
  },
  bull_flag: {
    name: 'Bull Flag',
    type: 'continuation',
    direction: 'Bullish',
    description: 'A bullish continuation pattern with parallel trendlines sloping downward after a strong upward move. Signals potential continuation when price breaks above the upper trendline.',
  },
  bear_flag: {
    name: 'Bear Flag',
    type: 'continuation',
    direction: 'Bearish',
    description: 'A bearish continuation pattern with parallel trendlines sloping upward after a strong downward move. Signals potential continuation when price breaks below the lower trendline.',
  },
  pennant: {
    name: 'Pennant',
    type: 'continuation',
    direction: 'Neutral',
    description: 'A short-term continuation pattern with converging trendlines forming a small triangle. The direction of the breakout determines the future trend direction.',
  },
  rectangle: {
    name: 'Rectangle',
    type: 'continuation',
    direction: 'Neutral',
    description: 'A continuation pattern with horizontal parallel trendlines forming a trading range. The direction of the breakout determines the future trend direction.',
  },
};

const chartPatterns = {
  findPivotPoint,
  findAllPivotPoints,
  linearRegression,
  findHeadAndShoulders,
  findInverseHeadAndShoulders,
  findDoubleTop,
  findDoubleBottom,
  findAscendingTriangle,
  findDescendingTriangle,
  findSymmetricalTriangle,
  findRisingWedge,
  findFallingWedge,
  findFlag,
  findPennant,
  findRectangle,
  detectAllChartPatterns,
  PATTERN_DESCRIPTIONS,
};

export default chartPatterns;
