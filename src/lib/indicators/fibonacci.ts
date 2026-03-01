/**
 * Fibonacci Retracement Detection Module
 *
 * Ported from Python Forex-Fibonacci library by white07S
 * https://github.com/white07S/Forex-Fibonacci
 *
 * This module provides algorithmic detection of Fibonacci retracement levels
 * for technical analysis without AI/ML.
 *
 * @author CITARION Team (TypeScript port)
 * @original Preetam Sharma (white07S)
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

export interface FibonacciLevel {
  level: number;
  value: number;
  name: string;
  type: 'retracement' | 'extension';
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
}

export interface FibonacciRetracement {
  swingHigh: SwingPoint;
  swingLow: SwingPoint;
  direction: 'bullish' | 'bearish';
  levels: FibonacciLevel[];
  priceRange: {
    high: number;
    low: number;
    range: number;
  };
  currentLevel: number | null;
  nearestSupport: number | null;
  nearestResistance: number | null;
  goldenRatio: number; // 0.618 level
}

export interface SwingPoint {
  index: number;
  value: number;
  type: 'high' | 'low';
  timestamp?: number;
}

export interface FibonacciConfig {
  /** Minimum price movement percentage to consider as swing */
  swingThreshold: number;
  /** Minimum drawdown to trigger Fibonacci analysis */
  drawdownCriteria: number;
  /** Recovery threshold percentage */
  recoveryCriteria: number;
  /** Include extension levels (beyond 1.0) */
  includeExtensions: boolean;
  /** Number of candles to look for swing points */
  lookback: number;
}

const DEFAULT_CONFIG: FibonacciConfig = {
  swingThreshold: 0.03, // 3% minimum swing
  drawdownCriteria: 0.15, // 15% drawdown triggers analysis
  recoveryCriteria: 0.02, // 2% recovery threshold
  includeExtensions: true,
  lookback: 100,
};

//=============================================================================
// Fibonacci Levels
//=============================================================================

/**
 * Standard Fibonacci levels for retracement and extension
 */
export const FIBONACCI_LEVELS = {
  // Retracement levels (within the range)
  retracement: [
    { level: 0, name: 'Start', strength: 'very_strong' as const },
    { level: 0.236, name: '23.6%', strength: 'weak' as const },
    { level: 0.382, name: '38.2%', strength: 'moderate' as const },
    { level: 0.5, name: '50%', strength: 'moderate' as const },
    { level: 0.618, name: '61.8% (Golden)', strength: 'strong' as const },
    { level: 0.786, name: '78.6%', strength: 'strong' as const },
    { level: 1, name: 'End', strength: 'very_strong' as const },
  ],
  // Extension levels (beyond the range)
  extension: [
    { level: 1.272, name: '127.2%', strength: 'moderate' as const },
    { level: 1.414, name: '141.4%', strength: 'moderate' as const },
    { level: 1.618, name: '161.8%', strength: 'strong' as const },
    { level: 2.0, name: '200%', strength: 'moderate' as const },
    { level: 2.618, name: '261.8%', strength: 'strong' as const },
    { level: 4.236, name: '423.6%', strength: 'weak' as const },
  ],
};

/**
 * Calculate Fibonacci levels between a high and low price
 */
export function calculateFibonacciLevels(
  high: number,
  low: number,
  includeExtensions: boolean = true
): FibonacciLevel[] {
  const range = high - low;
  const levels: FibonacciLevel[] = [];

  // Add retracement levels
  for (const fib of FIBONACCI_LEVELS.retracement) {
    const value = high - range * fib.level;
    levels.push({
      level: fib.level,
      value,
      name: fib.name,
      type: 'retracement',
      strength: fib.strength,
    });
  }

  // Add extension levels
  if (includeExtensions) {
    for (const fib of FIBONACCI_LEVELS.extension) {
      const value = high - range * fib.level;
      levels.push({
        level: fib.level,
        value,
        name: fib.name,
        type: 'extension',
        strength: fib.strength,
      });
    }
  }

  return levels;
}

//=============================================================================
// Swing Point Detection
//=============================================================================

/**
 * Find swing high points (local maxima)
 */
export function findSwingHighs(
  data: OHLC[],
  leftBars: number = 3,
  rightBars: number = 3
): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = leftBars; i < data.length - rightBars; i++) {
    const currentHigh = data[i].high;
    let isSwingHigh = true;

    // Check left bars
    for (let j = i - leftBars; j < i; j++) {
      if (data[j].high >= currentHigh) {
        isSwingHigh = false;
        break;
      }
    }

    if (!isSwingHigh) continue;

    // Check right bars
    for (let j = i + 1; j <= i + rightBars; j++) {
      if (data[j].high >= currentHigh) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      swings.push({
        index: i,
        value: currentHigh,
        type: 'high',
        timestamp: data[i].time,
      });
    }
  }

  return swings;
}

/**
 * Find swing low points (local minima)
 */
export function findSwingLows(
  data: OHLC[],
  leftBars: number = 3,
  rightBars: number = 3
): SwingPoint[] {
  const swings: SwingPoint[] = [];

  for (let i = leftBars; i < data.length - rightBars; i++) {
    const currentLow = data[i].low;
    let isSwingLow = true;

    // Check left bars
    for (let j = i - leftBars; j < i; j++) {
      if (data[j].low <= currentLow) {
        isSwingLow = false;
        break;
      }
    }

    if (!isSwingLow) continue;

    // Check right bars
    for (let j = i + 1; j <= i + rightBars; j++) {
      if (data[j].low <= currentLow) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      swings.push({
        index: i,
        value: currentLow,
        type: 'low',
        timestamp: data[i].time,
      });
    }
  }

  return swings;
}

/**
 * Find all swing points combined and sorted by index
 */
export function findAllSwingPoints(
  data: OHLC[],
  leftBars: number = 3,
  rightBars: number = 3
): SwingPoint[] {
  const highs = findSwingHighs(data, leftBars, rightBars);
  const lows = findSwingLows(data, leftBars, rightBars);

  return [...highs, ...lows].sort((a, b) => a.index - b.index);
}

//=============================================================================
// Drawdown Detection
//=============================================================================

export interface DrawdownPeriod {
  startIndex: number;
  endIndex: number;
  peakValue: number;
  troughValue: number;
  drawdownPercent: number;
  recovered: boolean;
  recoveryIndex?: number;
}

/**
 * Calculate drawdown percentage
 */
export function calculateDrawdownPercent(peak: number, trough: number): number {
  return (peak - trough) / peak;
}

/**
 * Find significant drawdown periods in data
 */
export function findDrawdownPeriods(
  data: OHLC[],
  drawdownCriteria: number = 0.15,
  recoveryCriteria: number = 0.02
): DrawdownPeriod[] {
  const periods: DrawdownPeriod[] = [];
  let cumulativeHigh = data[0].high;
  let peakIndex = 0;
  let inDrawdown = false;
  let troughValue = data[0].low;
  let troughIndex = 0;

  for (let i = 1; i < data.length; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;

    // Update cumulative high
    if (currentHigh > cumulativeHigh) {
      cumulativeHigh = currentHigh;
      peakIndex = i;
      troughValue = currentLow;
      troughIndex = i;
    }

    // Update trough
    if (currentLow < troughValue) {
      troughValue = currentLow;
      troughIndex = i;
    }

    // Calculate current drawdown
    const drawdown = calculateDrawdownPercent(cumulativeHigh, troughValue);

    // Check if entering drawdown
    if (!inDrawdown && drawdown >= drawdownCriteria) {
      inDrawdown = true;
    }

    // Check if recovering from drawdown
    if (inDrawdown) {
      const recovery = (cumulativeHigh - currentHigh) / cumulativeHigh;

      if (recovery <= recoveryCriteria) {
        // Drawdown recovered
        periods.push({
          startIndex: peakIndex,
          endIndex: i,
          peakValue: cumulativeHigh,
          troughValue,
          drawdownPercent: drawdown,
          recovered: true,
          recoveryIndex: i,
        });

        inDrawdown = false;
        cumulativeHigh = currentHigh;
        peakIndex = i;
      }
    }
  }

  // If still in drawdown at end of data
  if (inDrawdown) {
    periods.push({
      startIndex: peakIndex,
      endIndex: data.length - 1,
      peakValue: cumulativeHigh,
      troughValue,
      drawdownPercent: calculateDrawdownPercent(cumulativeHigh, troughValue),
      recovered: false,
    });
  }

  return periods;
}

//=============================================================================
// Fibonacci Retracement Detection
//=============================================================================

/**
 * Find the most recent significant swing for Fibonacci analysis
 */
export function findSignificantSwing(
  data: OHLC[],
  lookback: number = 100,
  minSwingPercent: number = 0.05
): { swingHigh: SwingPoint | null; swingLow: SwingPoint | null } {
  const startIdx = Math.max(0, data.length - lookback);
  const relevantData = data.slice(startIdx);

  const highs = findSwingHighs(relevantData, 5, 5);
  const lows = findSwingLows(relevantData, 5, 5);

  if (highs.length === 0 || lows.length === 0) {
    return { swingHigh: null, swingLow: null };
  }

  // Find the most significant high and low
  const highestSwing = highs.reduce((max, h) =>
    h.value > max.value ? h : max
  , highs[0]);

  const lowestSwing = lows.reduce((min, l) =>
    l.value < min.value ? l : min
  , lows[0]);

  // Adjust indices to original data
  const swingHigh = {
    ...highestSwing,
    index: highestSwing.index + startIdx,
  };

  const swingLow = {
    ...lowestSwing,
    index: lowestSwing.index + startIdx,
  };

  // Verify the swing is significant enough
  const swingPercent = Math.abs(swingHigh.value - swingLow.value) / swingLow.value;
  if (swingPercent < minSwingPercent) {
    return { swingHigh: null, swingLow: null };
  }

  return { swingHigh, swingLow };
}

/**
 * Detect Fibonacci retracement from recent price data
 */
export function detectFibonacciRetracement(
  data: OHLC[],
  config: Partial<FibonacciConfig> = {}
): FibonacciRetracement | null {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (data.length < 20) {
    return null;
  }

  // Find significant swing points
  const { swingHigh, swingLow } = findSignificantSwing(
    data,
    cfg.lookback,
    cfg.swingThreshold
  );

  if (!swingHigh || !swingLow) {
    return null;
  }

  // Determine direction
  const direction = swingHigh.index > swingLow.index ? 'bearish' : 'bullish';

  // Calculate Fibonacci levels
  const levels = calculateFibonacciLevels(
    swingHigh.value,
    swingLow.value,
    cfg.includeExtensions
  );

  // Find current price level relative to Fibonacci
  const currentPrice = data[data.length - 1].close;
  let currentLevel: number | null = null;

  for (let i = 0; i < levels.length - 1; i++) {
    const upper = Math.max(levels[i].value, levels[i + 1].value);
    const lower = Math.min(levels[i].value, levels[i + 1].value);

    if (currentPrice >= lower && currentPrice <= upper) {
      // Calculate exact level
      const range = swingHigh.value - swingLow.value;
      currentLevel = (swingHigh.value - currentPrice) / range;
      break;
    }
  }

  // Find nearest support and resistance
  const sortedLevels = [...levels].sort((a, b) => b.value - a.value);
  let nearestSupport: number | null = null;
  let nearestResistance: number | null = null;

  for (const level of sortedLevels) {
    if (level.value < currentPrice) {
      nearestSupport = level.value;
    } else if (level.value > currentPrice && nearestResistance === null) {
      nearestResistance = level.value;
    }
  }

  // Get golden ratio level (0.618)
  const goldenLevel = levels.find(l => l.level === 0.618);

  return {
    swingHigh,
    swingLow,
    direction,
    levels,
    priceRange: {
      high: swingHigh.value,
      low: swingLow.value,
      range: swingHigh.value - swingLow.value,
    },
    currentLevel,
    nearestSupport,
    nearestResistance,
    goldenRatio: goldenLevel?.value ?? swingHigh.value - (swingHigh.value - swingLow.value) * 0.618,
  };
}

//=============================================================================
// Multi-Level Fibonacci Analysis
//=============================================================================

export interface FibonacciZone {
  upperLevel: FibonacciLevel;
  lowerLevel: FibonacciLevel;
  zoneWidth: number;
  priceInZone: boolean;
  zoneName: string;
}

/**
 * Get Fibonacci zones (confluence areas between levels)
 */
export function getFibonacciZones(
  retracement: FibonacciRetracement,
  currentPrice: number
): FibonacciZone[] {
  const zones: FibonacciZone[] = [];
  const sortedLevels = [...retracement.levels]
    .filter(l => l.type === 'retracement')
    .sort((a, b) => b.value - a.value);

  for (let i = 0; i < sortedLevels.length - 1; i++) {
    const upper = sortedLevels[i];
    const lower = sortedLevels[i + 1];

    const upperVal = Math.max(upper.value, lower.value);
    const lowerVal = Math.min(upper.value, lower.value);

    zones.push({
      upperLevel: upper,
      lowerLevel: lower,
      zoneWidth: upperVal - lowerVal,
      priceInZone: currentPrice >= lowerVal && currentPrice <= upperVal,
      zoneName: `${upper.name} - ${lower.name}`,
    });
  }

  return zones;
}

//=============================================================================
// Fibonacci Signals
//=============================================================================

export interface FibonacciSignal {
  type: 'support' | 'resistance' | 'golden_cross' | 'extension_target';
  level: FibonacciLevel;
  price: number;
  distance: number;
  distancePercent: number;
  strength: 'weak' | 'moderate' | 'strong' | 'very_strong';
  description: string;
}

/**
 * Generate trading signals based on Fibonacci levels
 */
export function generateFibonacciSignals(
  retracement: FibonacciRetracement,
  currentPrice: number
): FibonacciSignal[] {
  const signals: FibonacciSignal[] = [];

  // Check proximity to each level
  for (const level of retracement.levels) {
    const distance = Math.abs(currentPrice - level.value);
    const distancePercent = distance / currentPrice;

    // Only consider levels within 2% of current price
    if (distancePercent > 0.02) continue;

    const isAbove = currentPrice > level.value;

    signals.push({
      type: isAbove ? 'support' : 'resistance',
      level,
      price: level.value,
      distance,
      distancePercent,
      strength: level.strength,
      description: isAbove
        ? `Support at ${level.name} (${level.value.toFixed(4)})`
        : `Resistance at ${level.name} (${level.value.toFixed(4)})`,
    });
  }

  // Check for golden ratio significance
  const goldenLevel = retracement.levels.find(l => l.level === 0.618);
  if (goldenLevel) {
    const goldenDistance = Math.abs(currentPrice - goldenLevel.value) / currentPrice;

    if (goldenDistance < 0.01) {
      signals.push({
        type: 'golden_cross',
        level: goldenLevel,
        price: goldenLevel.value,
        distance: Math.abs(currentPrice - goldenLevel.value),
        distancePercent: goldenDistance,
        strength: 'very_strong',
        description: `Golden Ratio (61.8%) zone - strong reversal area`,
      });
    }
  }

  // Check extension targets
  if (retracement.direction === 'bullish') {
    const extensionTargets = retracement.levels.filter(
      l => l.type === 'extension' && l.value > retracement.priceRange.high
    );

    for (const ext of extensionTargets.slice(0, 2)) {
      const distance = ext.value - currentPrice;
      const distancePercent = distance / currentPrice;

      if (distancePercent > 0 && distancePercent < 0.1) {
        signals.push({
          type: 'extension_target',
          level: ext,
          price: ext.value,
          distance,
          distancePercent,
          strength: ext.strength,
          description: `Extension target ${ext.name} at ${ext.value.toFixed(4)}`,
        });
      }
    }
  }

  return signals.sort((a, b) => a.distancePercent - b.distancePercent);
}

//=============================================================================
// Complete Analysis Function
//=============================================================================

export interface FibonacciAnalysis {
  retracement: FibonacciRetracement | null;
  zones: FibonacciZone[];
  signals: FibonacciSignal[];
  drawdowns: DrawdownPeriod[];
  swingPoints: {
    highs: SwingPoint[];
    lows: SwingPoint[];
  };
  summary: {
    trend: 'bullish' | 'bearish' | 'neutral';
    currentLevel: string;
    nearestSupport: number | null;
    nearestResistance: number | null;
    signalCount: number;
  };
}

/**
 * Perform complete Fibonacci analysis on price data
 */
export function analyzeFibonacci(
  data: OHLC[],
  config: Partial<FibonacciConfig> = {}
): FibonacciAnalysis {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Detect retracement
  const retracement = detectFibonacciRetracement(data, cfg);

  // Find swing points
  const highs = findSwingHighs(data, 5, 5);
  const lows = findSwingLows(data, 5, 5);

  // Find drawdown periods
  const drawdowns = findDrawdownPeriods(
    data,
    cfg.drawdownCriteria,
    cfg.recoveryCriteria
  );

  // Default values
  let zones: FibonacciZone[] = [];
  let signals: FibonacciSignal[] = [];
  let summary = {
    trend: 'neutral' as const,
    currentLevel: 'N/A',
    nearestSupport: null as number | null,
    nearestResistance: null as number | null,
    signalCount: 0,
  };

  if (retracement) {
    const currentPrice = data[data.length - 1].close;

    // Get zones
    zones = getFibonacciZones(retracement, currentPrice);

    // Generate signals
    signals = generateFibonacciSignals(retracement, currentPrice);

    // Build summary
    summary = {
      trend: retracement.direction as 'bullish' | 'bearish' | 'neutral',
      currentLevel: retracement.currentLevel !== null
        ? `${(retracement.currentLevel * 100).toFixed(1)}%`
        : 'N/A',
      nearestSupport: retracement.nearestSupport,
      nearestResistance: retracement.nearestResistance,
      signalCount: signals.length,
    };
  }

  return {
    retracement,
    zones,
    signals,
    drawdowns,
    swingPoints: { highs, lows },
    summary,
  };
}

//=============================================================================
// Utility Functions
//=============================================================================

/**
 * Get price at a specific Fibonacci level
 */
export function getPriceAtFibLevel(
  high: number,
  low: number,
  fibLevel: number
): number {
  return high - (high - low) * fibLevel;
}

/**
 * Find which Fibonacci level a price is closest to
 */
export function findClosestFibLevel(
  price: number,
  high: number,
  low: number
): { level: number; distance: number } {
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  let closestLevel = 0.5;
  let minDistance = Infinity;

  for (const level of levels) {
    const levelPrice = getPriceAtFibLevel(high, low, level);
    const distance = Math.abs(price - levelPrice);

    if (distance < minDistance) {
      minDistance = distance;
      closestLevel = level;
    }
  }

  return { level: closestLevel, distance: minDistance };
}

/**
 * Calculate Fibonacci extension targets
 */
export function calculateExtensions(
  swingHigh: number,
  swingLow: number,
  direction: 'bullish' | 'bearish'
): FibonacciLevel[] {
  const range = Math.abs(swingHigh - swingLow);
  const extensions: FibonacciLevel[] = [];

  const extensionLevels = [
    { level: 1.272, name: '127.2%', strength: 'moderate' as const },
    { level: 1.414, name: '141.4%', strength: 'moderate' as const },
    { level: 1.618, name: '161.8%', strength: 'strong' as const },
    { level: 2.0, name: '200%', strength: 'moderate' as const },
    { level: 2.618, name: '261.8%', strength: 'strong' as const },
  ];

  for (const ext of extensionLevels) {
    let value: number;

    if (direction === 'bullish') {
      // For bullish move, extensions are above the swing high
      value = swingHigh + range * (ext.level - 1);
    } else {
      // For bearish move, extensions are below the swing low
      value = swingLow - range * (ext.level - 1);
    }

    extensions.push({
      level: ext.level,
      value,
      name: ext.name,
      type: 'extension',
      strength: ext.strength,
    });
  }

  return extensions;
}

const fibonacciModule = {
  calculateFibonacciLevels,
  findSwingHighs,
  findSwingLows,
  findAllSwingPoints,
  findDrawdownPeriods,
  detectFibonacciRetracement,
  getFibonacciZones,
  generateFibonacciSignals,
  analyzeFibonacci,
  getPriceAtFibLevel,
  findClosestFibLevel,
  calculateExtensions,
  FIBONACCI_LEVELS,
};

export default fibonacciModule;
