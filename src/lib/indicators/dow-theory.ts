/**
 * Dow Theory Analysis Module
 * Ported from: https://github.com/harshgupta1810/DowTheory_in_stockmarket
 *
 * Implements Dow Theory principles for trend analysis:
 * - Primary trend identification (bull/bear markets)
 * - Secondary reactions (corrections within primary trend)
 * - Peak and Trough analysis
 * - Volume confirmation
 * - Trend reversal signals
 *
 * Dow Theory Core Principles:
 * 1. The market discounts everything
 * 2. Three trends: primary (1+ years), secondary (weeks/months), minor (days)
 * 3. Primary trend has 3 phases: accumulation, public participation, distribution
 * 4. Averages must confirm each other
 * 5. Volume confirms trend
 * 6. Trend remains in effect until clear reversal signals
 */

export interface DowTheoryData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PeakTrough {
  timestamp: number;
  type: 'peak' | 'trough';
  price: number;
  index: number;
}

export interface TrendPhase {
  startTimestamp: number;
  endTimestamp: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100
  confirmed: boolean;
}

export interface DowTheorySignal {
  timestamp: number;
  signal: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'moderate' | 'weak';
  reason: string;
  price: number;
}

export interface DowTheoryResult {
  primaryTrend: 'bullish' | 'bearish' | 'neutral';
  secondaryTrend: 'correction' | 'rally' | 'none';
  trendPhase: 'accumulation' | 'participation' | 'distribution' | 'unknown';
  peaksTroughs: PeakTrough[];
  trendPhases: TrendPhase[];
  signals: DowTheorySignal[];
  volumeConfirmation: boolean;
  currentSignal: {
    signal: 'buy' | 'sell' | 'hold';
    strength: number;
    reason: string;
  };
  confidence: number;
}

/**
 * Calculate Simple Moving Average
 */
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }

  return result;
}

/**
 * Identify Peaks and Troughs
 * A peak is a high point surrounded by lower highs
 * A trough is a low point surrounded by higher lows
 */
export function identifyPeaksTroughs(
  data: DowTheoryData[],
  lookback: number = 3
): PeakTrough[] {
  if (data.length < lookback * 2 + 1) {
    return [];
  }

  const peaksTroughs: PeakTrough[] = [];

  for (let i = lookback; i < data.length - lookback; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;

    // Check for peak
    let isPeak = true;
    for (let j = i - lookback; j < i; j++) {
      if (data[j].high >= currentHigh) {
        isPeak = false;
        break;
      }
    }
    if (isPeak) {
      for (let j = i + 1; j <= i + lookback; j++) {
        if (data[j].high >= currentHigh) {
          isPeak = false;
          break;
        }
      }
    }

    if (isPeak) {
      peaksTroughs.push({
        timestamp: data[i].timestamp,
        type: 'peak',
        price: currentHigh,
        index: i,
      });
      continue;
    }

    // Check for trough
    let isTrough = true;
    for (let j = i - lookback; j < i; j++) {
      if (data[j].low <= currentLow) {
        isTrough = false;
        break;
      }
    }
    if (isTrough) {
      for (let j = i + 1; j <= i + lookback; j++) {
        if (data[j].low <= currentLow) {
          isTrough = false;
          break;
        }
      }
    }

    if (isTrough) {
      peaksTroughs.push({
        timestamp: data[i].timestamp,
        type: 'trough',
        price: currentLow,
        index: i,
      });
    }
  }

  return peaksTroughs;
}

/**
 * Determine Primary Trend using Dow Theory
 * Higher peaks and higher troughs = Bullish
 * Lower peaks and lower troughs = Bearish
 */
export function determinePrimaryTrend(
  peaksTroughs: PeakTrough[]
): { trend: 'bullish' | 'bearish' | 'neutral'; strength: number } {
  if (peaksTroughs.length < 4) {
    return { trend: 'neutral', strength: 0 };
  }

  // Get last 4 peaks/troughs for analysis
  const recentPT = peaksTroughs.slice(-4);

  let higherHighs = 0;
  let higherLows = 0;
  let lowerHighs = 0;
  let lowerLows = 0;

  // Analyze peaks
  const peaks = recentPT.filter(pt => pt.type === 'peak');
  const troughs = recentPT.filter(pt => pt.type === 'trough');

  // Check peak sequence
  for (let i = 1; i < peaks.length; i++) {
    if (peaks[i].price > peaks[i - 1].price) {
      higherHighs++;
    } else {
      lowerHighs++;
    }
  }

  // Check trough sequence
  for (let i = 1; i < troughs.length; i++) {
    if (troughs[i].price > troughs[i - 1].price) {
      higherLows++;
    } else {
      lowerLows++;
    }
  }

  // Determine trend
  const bullishSignals = higherHighs + higherLows;
  const bearishSignals = lowerHighs + lowerLows;

  if (bullishSignals > bearishSignals && bullishSignals >= 2) {
    return {
      trend: 'bullish',
      strength: Math.min(100, (bullishSignals / (bullishSignals + bearishSignals)) * 100),
    };
  } else if (bearishSignals > bullishSignals && bearishSignals >= 2) {
    return {
      trend: 'bearish',
      strength: Math.min(100, (bearishSignals / (bullishSignals + bearishSignals)) * 100),
    };
  }

  return { trend: 'neutral', strength: 50 };
}

/**
 * Identify Secondary Trend (reactions against primary trend)
 * Typically lasts weeks to months
 */
export function identifySecondaryTrend(
  data: DowTheoryData[],
  primaryTrend: 'bullish' | 'bearish' | 'neutral',
  smaPeriod: number = 50
): { trend: 'correction' | 'rally' | 'none'; strength: number } {
  if (data.length < smaPeriod) {
    return { trend: 'none', strength: 0 };
  }

  const closes = data.map(d => d.close);
  const sma = calculateSMA(closes, smaPeriod);

  const lastClose = closes[closes.length - 1];
  const lastSMA = sma[sma.length - 1];

  if (isNaN(lastSMA)) {
    return { trend: 'none', strength: 0 };
  }

  // Calculate deviation from SMA
  const deviation = ((lastClose - lastSMA) / lastSMA) * 100;

  if (primaryTrend === 'bullish') {
    // In bull market, secondary trend is correction (price below SMA)
    if (lastClose < lastSMA && deviation < -3) {
      return { trend: 'correction', strength: Math.min(100, Math.abs(deviation) * 10) };
    }
  } else if (primaryTrend === 'bearish') {
    // In bear market, secondary trend is rally (price above SMA)
    if (lastClose > lastSMA && deviation > 3) {
      return { trend: 'rally', strength: Math.min(100, deviation * 10) };
    }
  }

  return { trend: 'none', strength: 0 };
}

/**
 * Identify Trend Phase (accumulation, participation, distribution)
 */
export function identifyTrendPhase(
  data: DowTheoryData[],
  peaksTroughs: PeakTrough[],
  primaryTrend: 'bullish' | 'bearish' | 'neutral'
): 'accumulation' | 'participation' | 'distribution' | 'unknown' {
  if (data.length < 50 || peaksTroughs.length < 3) {
    return 'unknown';
  }

  // Calculate recent price change rate
  const recentData = data.slice(-50);
  const priceChange = (recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close;
  const avgVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / recentData.length;

  // Calculate earlier volume for comparison
  const earlierData = data.slice(-100, -50);
  const earlierAvgVolume = earlierData.length > 0
    ? earlierData.reduce((sum, d) => sum + d.volume, 0) / earlierData.length
    : avgVolume;

  const volumeRatio = avgVolume / earlierAvgVolume;

  if (primaryTrend === 'bullish') {
    // Accumulation: early stage, low but increasing volume, small price gains
    if (priceChange < 0.05 && volumeRatio > 1.2) {
      return 'accumulation';
    }
    // Participation: middle stage, high volume, strong price gains
    if (priceChange > 0.1 && volumeRatio > 1.5) {
      return 'participation';
    }
    // Distribution: late stage, declining volume, price plateau
    if (priceChange > 0.05 && priceChange < 0.15 && volumeRatio < 0.9) {
      return 'distribution';
    }
  } else if (primaryTrend === 'bearish') {
    // In bear market, reverse the interpretation
    if (Math.abs(priceChange) < 0.05 && volumeRatio > 1.2) {
      return 'distribution';
    }
    if (Math.abs(priceChange) > 0.1 && volumeRatio > 1.5) {
      return 'participation';
    }
    if (Math.abs(priceChange) > 0.05 && volumeRatio < 0.9) {
      return 'accumulation';
    }
  }

  return 'unknown';
}

/**
 * Generate Dow Theory Signals
 * Buy signal: Higher trough in bull market, breaking above previous peak
 * Sell signal: Lower peak in bear market, breaking below previous trough
 */
export function generateDowSignals(
  data: DowTheoryData[],
  peaksTroughs: PeakTrough[],
  primaryTrend: 'bullish' | 'bearish' | 'neutral'
): DowTheorySignal[] {
  if (peaksTroughs.length < 3) {
    return [];
  }

  const signals: DowTheorySignal[] = [];

  for (let i = 2; i < peaksTroughs.length; i++) {
    const current = peaksTroughs[i];
    const previous = peaksTroughs[i - 1];
    const previous2 = peaksTroughs[i - 2];

    if (current.type === 'trough' && previous.type === 'peak' && previous2.type === 'trough') {
      // We have a trough-peak-trough pattern
      if (current.price > previous2.price) {
        // Higher trough - bullish signal
        const strength = current.price > previous.price ? 'strong' : 'moderate';

        signals.push({
          timestamp: current.timestamp,
          signal: 'buy',
          strength,
          reason: 'Higher trough formed - bullish continuation signal',
          price: current.price,
        });
      } else if (current.price < previous2.price && primaryTrend === 'bullish') {
        // Lower trough in bull market - potential reversal warning
        signals.push({
          timestamp: current.timestamp,
          signal: 'sell',
          strength: 'moderate',
          reason: 'Lower trough in bull market - trend weakening',
          price: current.price,
        });
      }
    }

    if (current.type === 'peak' && previous.type === 'trough' && previous2.type === 'peak') {
      // We have a peak-trough-peak pattern
      if (current.price < previous2.price) {
        // Lower peak - bearish signal
        const strength = current.price < previous.price ? 'strong' : 'moderate';

        signals.push({
          timestamp: current.timestamp,
          signal: 'sell',
          strength,
          reason: 'Lower peak formed - bearish continuation signal',
          price: current.price,
        });
      } else if (current.price > previous2.price && primaryTrend === 'bearish') {
        // Higher peak in bear market - potential reversal warning
        signals.push({
          timestamp: current.timestamp,
          signal: 'buy',
          strength: 'moderate',
          reason: 'Higher peak in bear market - trend weakening',
          price: current.price,
        });
      }
    }
  }

  return signals;
}

/**
 * Check Volume Confirmation
 * Volume should increase in direction of primary trend
 */
export function checkVolumeConfirmation(
  data: DowTheoryData[],
  primaryTrend: 'bullish' | 'bearish' | 'neutral',
  lookback: number = 10
): { confirmed: boolean; strength: number } {
  if (data.length < lookback + 1) {
    return { confirmed: false, strength: 0 };
  }

  const recentData = data.slice(-lookback);
  let confirmingDays = 0;

  for (let i = 1; i < recentData.length; i++) {
    const priceUp = recentData[i].close > recentData[i - 1].close;
    const volumeUp = recentData[i].volume > recentData[i - 1].volume;

    if (primaryTrend === 'bullish') {
      // In bull market, volume should increase on up days
      if (priceUp && volumeUp) {
        confirmingDays++;
      }
    } else if (primaryTrend === 'bearish') {
      // In bear market, volume should increase on down days
      if (!priceUp && volumeUp) {
        confirmingDays++;
      }
    }
  }

  const strength = (confirmingDays / (lookback - 1)) * 100;
  const confirmed = strength > 50;

  return { confirmed, strength };
}

/**
 * Comprehensive Dow Theory Analysis
 */
export function analyzeDowTheory(
  data: DowTheoryData[],
  indexData?: DowTheoryData[],
  options: {
    smaPeriod?: number;
    peakTroughLookback?: number;
    volumeLookback?: number;
  } = {}
): DowTheoryResult {
  const {
    smaPeriod = 50,
    peakTroughLookback = 3,
    volumeLookback = 10,
  } = options;

  // Identify peaks and troughs
  const peaksTroughs = identifyPeaksTroughs(data, peakTroughLookback);

  // Determine primary trend
  const primaryTrendResult = determinePrimaryTrend(peaksTroughs);
  const primaryTrend = primaryTrendResult.trend;

  // Identify secondary trend
  const secondaryTrendResult = identifySecondaryTrend(data, primaryTrend, smaPeriod);

  // Identify trend phase
  const trendPhase = identifyTrendPhase(data, peaksTroughs, primaryTrend);

  // Generate signals
  const signals = generateDowSignals(data, peaksTroughs, primaryTrend);

  // Check volume confirmation
  const volumeConfirmation = checkVolumeConfirmation(data, primaryTrend, volumeLookback);

  // Calculate trend phases over time
  const trendPhases: TrendPhase[] = [];
  const segmentSize = Math.max(50, Math.floor(data.length / 10));

  for (let i = segmentSize; i < data.length; i += segmentSize) {
    const segmentData = data.slice(0, i);
    const segmentPT = identifyPeaksTroughs(segmentData, peakTroughLookback);
    const segmentTrend = determinePrimaryTrend(segmentPT);

    trendPhases.push({
      startTimestamp: data[Math.max(0, i - segmentSize)].timestamp,
      endTimestamp: data[i - 1].timestamp,
      trend: segmentTrend.trend,
      strength: segmentTrend.strength,
      confirmed: true,
    });
  }

  // Determine current signal
  let currentSignal: 'buy' | 'sell' | 'hold' = 'hold';
  let signalStrength = 50;
  let reason = 'No clear signal';

  if (signals.length > 0) {
    const lastSignal = signals[signals.length - 1];
    currentSignal = lastSignal.signal;
    signalStrength = lastSignal.strength === 'strong' ? 80 : lastSignal.strength === 'moderate' ? 60 : 40;
    reason = lastSignal.reason;
  }

  // Adjust based on trend phase
  if (trendPhase === 'accumulation' && primaryTrend === 'bullish') {
    currentSignal = 'buy';
    signalStrength = 70;
    reason = 'Accumulation phase detected - potential entry opportunity';
  } else if (trendPhase === 'distribution' && primaryTrend === 'bullish') {
    currentSignal = 'hold';
    signalStrength = 40;
    reason = 'Distribution phase detected - consider taking profits';
  }

  // Adjust based on volume confirmation
  if (!volumeConfirmation.confirmed && currentSignal !== 'hold') {
    signalStrength -= 15;
    reason += ' (volume not confirming)';
  }

  // Calculate overall confidence
  const confidence = Math.min(100, Math.max(0,
    primaryTrendResult.strength * 0.3 +
    (volumeConfirmation.confirmed ? 30 : 10) +
    signalStrength * 0.4
  ));

  return {
    primaryTrend,
    secondaryTrend: secondaryTrendResult.trend,
    trendPhase,
    peaksTroughs,
    trendPhases,
    signals,
    volumeConfirmation: volumeConfirmation.confirmed,
    currentSignal: {
      signal: currentSignal,
      strength: signalStrength,
      reason,
    },
    confidence,
  };
}

// Export all functions as default object
const dowTheory = {
  identifyPeaksTroughs,
  determinePrimaryTrend,
  identifySecondaryTrend,
  identifyTrendPhase,
  generateDowSignals,
  checkVolumeConfirmation,
  analyzeDowTheory,
};

export default dowTheory;
