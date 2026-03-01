/**
 * Volume Analysis Module
 * Ported from: https://github.com/harshgupta1810/volume_analysis_stockmarket
 *
 * Provides comprehensive volume analysis tools for trading:
 * - Volume Breakouts & Reversals detection
 * - Volume Divergence (bullish/bearish)
 * - Volume Patterns (spikes, accumulation)
 * - Volume Confirmation of price movements
 */

export interface VolumeData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface VolumeAnalysisResult {
  timestamp: number;
  breakout: boolean;
  reversal: boolean;
}

export interface VolumeDivergenceResult {
  timestamp: number;
  divergence: 'bullish' | 'bearish' | 'none';
}

export interface VolumePatternResult {
  timestamp: number;
  volumeChange: number;
  volumeMA: number;
  volumeSpike: boolean;
  volumeIncrease: boolean;
}

export interface VolumeConfirmationResult {
  timestamp: number;
  priceMovement: number;
  confirmation: 'positive' | 'negative' | 'none';
}

export interface ComprehensiveVolumeAnalysis {
  breakoutsReversals: VolumeAnalysisResult[];
  divergences: VolumeDivergenceResult[];
  patterns: VolumePatternResult[];
  confirmations: VolumeConfirmationResult[];
  summary: {
    totalBreakouts: number;
    totalReversals: number;
    bullishDivergences: number;
    bearishDivergences: number;
    volumeSpikes: number;
    positiveConfirmations: number;
    negativeConfirmations: number;
    currentSignal: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
  };
}

/**
 * Analyze volume for breakouts and reversals
 * Breakouts: price moves above resistance on high volume
 * Reversals: sharp price movements with volume surge
 */
export function analyzeBreakoutsReversals(
  data: VolumeData[],
  lookbackPeriod: number = 5
): VolumeAnalysisResult[] {
  if (data.length < lookbackPeriod + 1) {
    return [];
  }

  const results: VolumeAnalysisResult[] = [];

  for (let i = lookbackPeriod; i < data.length; i++) {
    // Calculate resistance level (rolling high)
    const periodData = data.slice(i - lookbackPeriod, i);
    const resistanceLevel = Math.max(...periodData.map(d => d.high));

    // Calculate price change direction
    const priceChange = data[i].close - data[i - 1].close;
    const prevPriceChange = i > lookbackPeriod
      ? data[i - 1].close - data[i - 2].close
      : 0;

    // Identify breakout: price above resistance on increasing volume
    const isBreakout =
      data[i].close > resistanceLevel &&
      data[i].volume > data[i - 1].volume;

    // Identify reversal: price direction change with volume surge
    const currentDirection = priceChange > 0 ? 1 : priceChange < 0 ? -1 : 0;
    const prevDirection = prevPriceChange > 0 ? 1 : prevPriceChange < 0 ? -1 : 0;
    const directionChanged = currentDirection !== prevDirection;

    // Calculate sharp price change (sum of last 5 changes)
    const sharpPriceChange = periodData.reduce((sum, d, idx) => {
      if (idx === 0) return 0;
      return sum + (d.close - periodData[idx - 1].close);
    }, 0);

    const isReversal =
      directionChanged &&
      data[i].volume > data[i - 1].volume &&
      Math.abs(sharpPriceChange) > 0;

    results.push({
      timestamp: data[i].timestamp,
      breakout: isBreakout,
      reversal: isReversal,
    });
  }

  return results;
}

/**
 * Calculate volume divergence
 * Bullish Divergence: price falling, volume rising (potential reversal up)
 * Bearish Divergence: price rising, volume falling (potential reversal down)
 */
export function calculateVolumeDivergence(
  data: VolumeData[]
): VolumeDivergenceResult[] {
  if (data.length < 2) {
    return [];
  }

  const results: VolumeDivergenceResult[] = [];

  for (let i = 1; i < data.length; i++) {
    const priceRising = data[i].close > data[i - 1].close;
    const priceFalling = data[i].close < data[i - 1].close;
    const volumeRising = data[i].volume > data[i - 1].volume;
    const volumeFalling = data[i].volume < data[i - 1].volume;

    let divergence: 'bullish' | 'bearish' | 'none' = 'none';

    if (priceRising && volumeFalling) {
      // Price up but volume down = bearish divergence (weak rally)
      divergence = 'bearish';
    } else if (priceFalling && volumeRising) {
      // Price down but volume up = bullish divergence (selling exhaustion)
      divergence = 'bullish';
    }

    results.push({
      timestamp: data[i].timestamp,
      divergence,
    });
  }

  return results;
}

/**
 * Calculate volume patterns
 * Identifies volume spikes and steady volume increases
 */
export function calculateVolumePatterns(
  data: VolumeData[],
  maPeriod: number = 5,
  spikeThreshold: number = 2.0
): VolumePatternResult[] {
  if (data.length < maPeriod + 1) {
    return [];
  }

  const results: VolumePatternResult[] = [];

  // Calculate volume changes
  const volumeChanges: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const prevVolume = data[i - 1].volume;
    const change = prevVolume > 0 ? (data[i].volume - prevVolume) / prevVolume : 0;
    volumeChanges.push(change);
  }

  // Calculate moving average and identify patterns
  for (let i = maPeriod; i < data.length; i++) {
    const changeIndex = i - 1;
    const volumeChange = volumeChanges[changeIndex];

    // Calculate MA of volume changes
    const maData = volumeChanges.slice(changeIndex - maPeriod + 1, changeIndex + 1);
    const volumeMA = maData.reduce((sum, v) => sum + v, 0) / maPeriod;

    // Identify volume spike (> 2x average)
    const volumeSpike = volumeChange > spikeThreshold * volumeMA;

    // Identify steady volume increase
    const prevVolumeChange = changeIndex > 0 ? volumeChanges[changeIndex - 1] : 0;
    const volumeIncrease = volumeChange > prevVolumeChange;

    results.push({
      timestamp: data[i].timestamp,
      volumeChange,
      volumeMA,
      volumeSpike,
      volumeIncrease,
    });
  }

  return results;
}

/**
 * Analyze volume confirmation
 * Positive: price up with volume up (bullish confirmation)
 * Negative: price down with volume up (bearish confirmation)
 */
export function analyzeVolumeConfirmation(
  data: VolumeData[]
): VolumeConfirmationResult[] {
  if (data.length < 2) {
    return [];
  }

  const results: VolumeConfirmationResult[] = [];

  for (let i = 1; i < data.length; i++) {
    const priceMovement = data[i].close - data[i - 1].close;
    const volumeIncreasing = data[i].volume > data[i - 1].volume;

    let confirmation: 'positive' | 'negative' | 'none' = 'none';

    if (priceMovement > 0 && volumeIncreasing) {
      // Price up, volume up = positive confirmation
      confirmation = 'positive';
    } else if (priceMovement < 0 && volumeIncreasing) {
      // Price down, volume up = negative confirmation
      confirmation = 'negative';
    }

    results.push({
      timestamp: data[i].timestamp,
      priceMovement,
      confirmation,
    });
  }

  return results;
}

/**
 * Calculate On-Balance Volume (OBV)
 * Cumulative volume indicator
 */
export function calculateOBV(data: VolumeData[]): { timestamp: number; obv: number }[] {
  if (data.length < 2) {
    return [];
  }

  const results: { timestamp: number; obv: number }[] = [];
  let obv = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      obv = data[i].volume;
    } else {
      if (data[i].close > data[i - 1].close) {
        obv += data[i].volume;
      } else if (data[i].close < data[i - 1].close) {
        obv -= data[i].volume;
      }
      // If close equals previous close, OBV unchanged
    }

    results.push({
      timestamp: data[i].timestamp,
      obv,
    });
  }

  return results;
}

/**
 * Calculate Volume Rate of Change (VROC)
 * Measures the rate of change in volume
 */
export function calculateVROC(
  data: VolumeData[],
  period: number = 14
): { timestamp: number; vroc: number }[] {
  if (data.length < period + 1) {
    return [];
  }

  const results: { timestamp: number; vroc: number }[] = [];

  for (let i = period; i < data.length; i++) {
    const currentVolume = data[i].volume;
    const pastVolume = data[i - period].volume;

    const vroc = pastVolume > 0
      ? ((currentVolume - pastVolume) / pastVolume) * 100
      : 0;

    results.push({
      timestamp: data[i].timestamp,
      vroc,
    });
  }

  return results;
}

/**
 * Identify Volume Accumulation/Distribution patterns
 * Detects institutional buying/selling pressure
 */
export function analyzeAccumulationDistribution(
  data: VolumeData[]
): { timestamp: number; ad: number; signal: 'accumulation' | 'distribution' | 'neutral' }[] {
  if (data.length < 2) {
    return [];
  }

  const results: { timestamp: number; ad: number; signal: 'accumulation' | 'distribution' | 'neutral' }[] = [];
  let ad = 0;

  for (let i = 0; i < data.length; i++) {
    const { high, low, close, volume } = data[i];
    const range = high - low;

    // Money Flow Multiplier
    let mfm = 0;
    if (range > 0) {
      mfm = ((close - low) - (high - close)) / range;
    }

    // Money Flow Volume
    const mfv = mfm * volume;

    // Accumulation/Distribution Line
    ad += mfv;

    // Determine signal based on recent AD trend
    let signal: 'accumulation' | 'distribution' | 'neutral' = 'neutral';
    if (results.length >= 3) {
      const recentAD = results.slice(-3).map(r => r.ad);
      const avgRecent = recentAD.reduce((sum, v) => sum + v, 0) / 3;

      if (ad > avgRecent * 1.05) {
        signal = 'accumulation';
      } else if (ad < avgRecent * 0.95) {
        signal = 'distribution';
      }
    }

    results.push({
      timestamp: data[i].timestamp,
      ad,
      signal,
    });
  }

  return results;
}

/**
 * Comprehensive Volume Analysis
 * Combines all volume analysis functions
 */
export function comprehensiveVolumeAnalysis(
  data: VolumeData[],
  options: {
    lookbackPeriod?: number;
    maPeriod?: number;
    spikeThreshold?: number;
  } = {}
): ComprehensiveVolumeAnalysis {
  const {
    lookbackPeriod = 5,
    maPeriod = 5,
    spikeThreshold = 2.0,
  } = options;

  const breakoutsReversals = analyzeBreakoutsReversals(data, lookbackPeriod);
  const divergences = calculateVolumeDivergence(data);
  const patterns = calculateVolumePatterns(data, maPeriod, spikeThreshold);
  const confirmations = analyzeVolumeConfirmation(data);

  // Calculate summary statistics
  const totalBreakouts = breakoutsReversals.filter(r => r.breakout).length;
  const totalReversals = breakoutsReversals.filter(r => r.reversal).length;
  const bullishDivergences = divergences.filter(d => d.divergence === 'bullish').length;
  const bearishDivergences = divergences.filter(d => d.divergence === 'bearish').length;
  const volumeSpikes = patterns.filter(p => p.volumeSpike).length;
  const positiveConfirmations = confirmations.filter(c => c.confirmation === 'positive').length;
  const negativeConfirmations = confirmations.filter(c => c.confirmation === 'negative').length;

  // Determine current signal
  let currentSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let signalScore = 0;

  // Recent signals (last 5 periods)
  const recentBreakouts = breakoutsReversals.slice(-5).filter(r => r.breakout).length;
  const recentReversals = breakoutsReversals.slice(-5).filter(r => r.reversal).length;
  const recentDivergences = divergences.slice(-5);
  const recentConfirmations = confirmations.slice(-5);
  const recentPatterns = patterns.slice(-5);

  // Score calculation
  signalScore += recentBreakouts * 2; // Breakouts are bullish
  signalScore -= recentReversals * 1; // Reversals indicate uncertainty

  // Divergences
  recentDivergences.forEach(d => {
    if (d.divergence === 'bullish') signalScore += 2;
    if (d.divergence === 'bearish') signalScore -= 2;
  });

  // Confirmations
  recentConfirmations.forEach(c => {
    if (c.confirmation === 'positive') signalScore += 1;
    if (c.confirmation === 'negative') signalScore -= 1;
  });

  // Volume spikes indicate strong moves
  signalScore += recentPatterns.filter(p => p.volumeSpike).length;

  // Determine signal
  if (signalScore > 3) {
    currentSignal = 'bullish';
  } else if (signalScore < -3) {
    currentSignal = 'bearish';
  }

  // Calculate confidence (0-100)
  const totalSignals = recentBreakouts + recentReversals +
    recentDivergences.filter(d => d.divergence !== 'none').length +
    recentConfirmations.filter(c => c.confirmation !== 'none').length +
    recentPatterns.filter(p => p.volumeSpike).length;

  const confidence = Math.min(100, Math.max(0, Math.abs(signalScore) * 10 + totalSignals * 5));

  return {
    breakoutsReversals,
    divergences,
    patterns,
    confirmations,
    summary: {
      totalBreakouts,
      totalReversals,
      bullishDivergences,
      bearishDivergences,
      volumeSpikes,
      positiveConfirmations,
      negativeConfirmations,
      currentSignal,
      confidence,
    },
  };
}

// Export all functions as default object
const volumeAnalysis = {
  analyzeBreakoutsReversals,
  calculateVolumeDivergence,
  calculateVolumePatterns,
  analyzeVolumeConfirmation,
  calculateOBV,
  calculateVROC,
  analyzeAccumulationDistribution,
  comprehensiveVolumeAnalysis,
};

export default volumeAnalysis;
