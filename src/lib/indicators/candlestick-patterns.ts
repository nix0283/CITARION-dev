/**
 * Candlestick Pattern Recognition Library
 * 
 * Ported from: https://github.com/ruejo2013/Machine-Learning-Candlestick-Recognition-Trading-Strategy-
 * Original Author: Patrick R (ruejo2013) - Columbia University FinTech BootCamp
 * 
 * This module identifies 10 classic candlestick patterns:
 * - Bullish Harami, Bearish Harami
 * - Green Hammer, Red Hammer
 * - Bull Kicker, Bear Kicker
 * - Morning Star, Evening Star
 * - Green Shooting Star, Red Shooting Star
 * 
 * Reference: https://github.com/aliisoli/candlesticks_study
 */

export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CandlestickPattern {
  id: string;
  code: string;
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  description: string;
  reliability: 'high' | 'medium' | 'low';
  confirmedAt?: number; // timestamp where pattern was confirmed
  candlesRequired: number; // number of candles needed to form pattern
}

export interface PatternResult {
  pattern: CandlestickPattern;
  timestamp: number;
  price: number;
  confidence: number;
}

// Pattern definitions
export const CANDLESTICK_PATTERNS: Record<string, CandlestickPattern> = {
  BLLHRM: {
    id: 'bullish_harami',
    code: 'BLLHRM',
    name: 'Bullish Harami',
    type: 'bullish',
    description: 'Бычий харами - маленькая зелёная свеча внутри большой красной. Сигнал разворота нисходящего тренда.',
    reliability: 'medium',
    candlesRequired: 2,
  },
  BERHRM: {
    id: 'bearish_harami',
    code: 'BERHRM',
    name: 'Bearish Harami',
    type: 'bearish',
    description: 'Медвежий харами - маленькая красная свеча внутри большой зелёной. Сигнал разворота восходящего тренда.',
    reliability: 'medium',
    candlesRequired: 2,
  },
  GRNHM: {
    id: 'green_hammer',
    code: 'GRNHM',
    name: 'Green Hammer',
    type: 'bullish',
    description: 'Зелёный молот - маленькое тело с длинной нижней тенью. Сигнал разворота нисходящего тренда.',
    reliability: 'medium',
    candlesRequired: 1,
  },
  RDHM: {
    id: 'red_hammer',
    code: 'RDHM',
    name: 'Red Hammer',
    type: 'bullish',
    description: 'Красный молот - медвежий молот с длинной нижней тенью. Сигнал разворота при нисходящем тренде.',
    reliability: 'medium',
    candlesRequired: 1,
  },
  BLLKCK: {
    id: 'bull_kicker',
    code: 'BLLKCK',
    name: 'Bull Kicker',
    type: 'bullish',
    description: 'Бычий кикер - две свечи открываются на одном уровне, вторая зелёная и закрывается выше. Сильный бычий сигнал.',
    reliability: 'high',
    candlesRequired: 2,
  },
  BERKCK: {
    id: 'bear_kicker',
    code: 'BERKCK',
    name: 'Bear Kicker',
    type: 'bearish',
    description: 'Медвежий кикер - две свечи открываются на одном уровне, вторая красная и закрывается ниже. Сильный медвежий сигнал.',
    reliability: 'high',
    candlesRequired: 2,
  },
  MRNSTR: {
    id: 'morning_star',
    code: 'MRNSTR',
    name: 'Morning Star',
    type: 'bullish',
    description: 'Утренняя звезда - три свечи: большая красная, маленькая доджи, большая зелёная. Сильный сигнал разворота вниз.',
    reliability: 'high',
    candlesRequired: 3,
  },
  EVNSTR: {
    id: 'evening_star',
    code: 'EVNSTR',
    name: 'Evening Star',
    type: 'bearish',
    description: 'Вечерняя звезда - три свечи: большая зелёная, маленькая доджи, большая красная. Сильный сигнал разворота вверх.',
    reliability: 'high',
    candlesRequired: 3,
  },
  GRNSSTR: {
    id: 'green_shooting_star',
    code: 'GRNSSTR',
    name: 'Green Shooting Star',
    type: 'bearish',
    description: 'Зелёная падающая звезда - длинная верхняя тень, маленькое тело. Сигнал разворота при восходящем тренде.',
    reliability: 'medium',
    candlesRequired: 1,
  },
  RDSSTR: {
    id: 'red_shooting_star',
    code: 'RDSSTR',
    name: 'Red Shooting Star',
    type: 'bearish',
    description: 'Красная падающая звезда - более надёжный медвежий сигнал разворота.',
    reliability: 'medium',
    candlesRequired: 1,
  },
};

/**
 * Helper function to calculate SMA trend
 */
function calculateTrend(candles: OHLCVCandle[], period: number, index: number): boolean | null {
  if (index < period) return null;
  
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    sum += candles[i].close;
  }
  const currentSMA = sum / period;
  
  let prevSum = 0;
  for (let i = index - period; i < index; i++) {
    prevSum += candles[i].close;
  }
  const prevSMA = prevSum / period;
  
  return currentSMA > prevSMA;
}

/**
 * Get candle by index with safety check
 */
function getCandle(candles: OHLCVCandle[], index: number): OHLCVCandle | null {
  if (index < 0 || index >= candles.length) return null;
  return candles[index];
}

// ==================== SINGLE CANDLE PATTERNS ====================

/**
 * Detect Green Hammer pattern
 * - Lower shadow at least twice as long as body
 * - Upper shadow very small (less than 1/10 of body)
 * - Candle is green (close > open)
 * - Appears in downtrend
 */
export function findGreenHammer(candles: OHLCVCandle[], index: number, trend?: boolean): boolean {
  const candle = getCandle(candles, index);
  if (!candle) return false;
  
  const { open, high, low, close } = candle;
  
  // Lower shadow at least twice as long as body
  const condition1 = (open - low) > 2 * (close - open);
  
  // Upper shadow shorter than a tenth of the body
  const condition2 = (close - open) > 10 * (high - close);
  
  // Candle should be green
  const condition3 = close > open;
  
  // Downtrend (if trend info available)
  const condition4 = trend === undefined || trend === false;
  
  return condition1 && condition2 && condition3 && condition4;
}

/**
 * Detect Red Hammer pattern
 * - Lower shadow at least twice as long as body
 * - Upper shadow very small
 * - Candle is red (open > close)
 * - Appears in downtrend
 */
export function findRedHammer(candles: OHLCVCandle[], index: number, trend?: boolean): boolean {
  const candle = getCandle(candles, index);
  if (!candle) return false;
  
  const { open, high, low, close } = candle;
  
  // Lower shadow at least twice as long as body
  const condition1 = (close - low) > 2 * (open - close);
  
  // Upper shadow very small
  const condition2 = (open - close) > 10 * (high - open);
  
  // Candle should be red
  const condition3 = open > close;
  
  // Downtrend
  const condition4 = trend === undefined || trend === false;
  
  return condition1 && condition2 && condition3 && condition4;
}

/**
 * Detect Green Shooting Star pattern
 * - Upper shadow at least twice as long as body
 * - Lower shadow very small
 * - Candle is green
 * - Appears in uptrend
 */
export function findGreenShootingStar(candles: OHLCVCandle[], index: number, trend?: boolean): boolean {
  const candle = getCandle(candles, index);
  if (!candle) return false;
  
  const { open, high, low, close } = candle;
  
  // Upper shadow at least twice as long as body
  const condition1 = (high - close) > 2 * (close - open);
  
  // Lower shadow very small
  const condition2 = (close - open) > 10 * (open - low);
  
  // Candle is green
  const condition3 = close > open;
  
  // Uptrend
  const condition4 = trend === undefined || trend === true;
  
  return condition1 && condition2 && condition3 && condition4;
}

/**
 * Detect Red Shooting Star pattern
 * - Upper shadow at least twice as long as body
 * - Lower shadow very small
 * - Candle is red
 * - Appears in uptrend
 */
export function findRedShootingStar(candles: OHLCVCandle[], index: number, trend?: boolean): boolean {
  const candle = getCandle(candles, index);
  if (!candle) return false;
  
  const { open, high, low, close } = candle;
  
  // Upper shadow at least twice as long as body
  const condition1 = (high - open) > 2 * (open - close);
  
  // Lower shadow very small
  const condition2 = (open - close) > 10 * (close - low);
  
  // Candle is red
  const condition3 = open > close;
  
  // Uptrend
  const condition4 = trend === undefined || trend === true;
  
  return condition1 && condition2 && condition3 && condition4;
}

// ==================== TWO CANDLE PATTERNS ====================

/**
 * Detect Bullish Harami pattern
 * - First candle is red (bearish)
 * - Second candle is green (bullish) and completely inside first candle
 * - Appears in downtrend
 */
export function findBullishHarami(candles: OHLCVCandle[], index: number, trend?: boolean): boolean {
  const candle = getCandle(candles, index);
  const prevCandle = getCandle(candles, index - 1);
  if (!candle || !prevCandle) return false;
  
  // Opened higher than previous close
  const condition1 = candle.open > prevCandle.close;
  
  // Closed lower than previous open
  const condition2 = candle.close < prevCandle.open;
  
  // Previous candle is red
  const condition3 = prevCandle.open > prevCandle.close;
  
  // Current candle is green
  const condition4 = candle.close > candle.open;
  
  // Downtrend
  const condition5 = trend === undefined || trend === false;
  
  return condition1 && condition2 && condition3 && condition4 && condition5;
}

/**
 * Detect Bearish Harami pattern
 * - First candle is green (bullish)
 * - Second candle is red (bearish) and completely inside first candle
 * - Appears in uptrend
 */
export function findBearishHarami(candles: OHLCVCandle[], index: number, trend?: boolean): boolean {
  const candle = getCandle(candles, index);
  const prevCandle = getCandle(candles, index - 1);
  if (!candle || !prevCandle) return false;
  
  // Previous close higher than current open
  const condition1 = prevCandle.close > candle.open;
  
  // Current close higher than previous open
  const condition2 = candle.close > prevCandle.open;
  
  // Previous candle is green
  const condition3 = prevCandle.close > prevCandle.open;
  
  // Current candle is red
  const condition4 = candle.open > candle.close;
  
  // Uptrend
  const condition5 = trend === undefined || trend === true;
  
  return condition1 && condition2 && condition3 && condition4 && condition5;
}

/**
 * Detect Bull Kicker pattern
 * - Two candles open at the same level (within small tolerance)
 * - Previous candle is red
 * - Current candle is green and closes higher
 * - Gap up with strong buying
 */
export function findBullKicker(candles: OHLCVCandle[], index: number): boolean {
  const candle = getCandle(candles, index);
  const prevCandle = getCandle(candles, index - 1);
  if (!candle || !prevCandle) return false;
  
  // Two candles open at the same level (within 0.2% tolerance)
  const tolerance = 0.002 * candle.open;
  const condition1 = Math.abs(prevCandle.open - candle.open) < tolerance;
  
  // Previous candle is red
  const condition2 = prevCandle.open > prevCandle.close;
  
  // Current candle is green
  const condition3 = candle.close > candle.open;
  
  // Low is higher than previous open (gap up)
  const condition4 = candle.low > prevCandle.open;
  
  return condition1 && condition2 && condition3 && condition4;
}

/**
 * Detect Bear Kicker pattern
 * - Two candles open at the same level (within small tolerance)
 * - Previous candle is green
 * - Current candle is red and closes lower
 * - Gap down with strong selling
 */
export function findBearKicker(candles: OHLCVCandle[], index: number): boolean {
  const candle = getCandle(candles, index);
  const prevCandle = getCandle(candles, index - 1);
  if (!candle || !prevCandle) return false;
  
  // Two candles open at the same level (within 0.2% tolerance)
  const tolerance = 0.002 * candle.open;
  const condition1 = Math.abs(prevCandle.open - candle.open) < tolerance;
  
  // Previous candle is green
  const condition2 = prevCandle.close > prevCandle.open;
  
  // Current candle is red
  const condition3 = candle.open > candle.close;
  
  // Previous open is higher than current high (gap down)
  const condition4 = prevCandle.open > candle.high;
  
  return condition1 && condition2 && condition3 && condition4;
}

// ==================== THREE CANDLE PATTERNS ====================

/**
 * Detect Morning Star pattern (Method 2 - more precise)
 * - First candle: large red body
 * - Second candle: small body (doji-like), below first candle
 * - Third candle: large green body that engulfs first candle's open
 * - Second candle body < 1/3 of first and third candle bodies
 */
export function findMorningStar(candles: OHLCVCandle[], index: number): boolean {
  const candle = getCandle(candles, index);
  const prevCandle = getCandle(candles, index - 1);
  const prevPrevCandle = getCandle(candles, index - 2);
  if (!candle || !prevCandle || !prevPrevCandle) return false;
  
  // First candle is red
  const condition1 = prevPrevCandle.close < prevPrevCandle.open;
  
  // Third candle is green
  const condition2 = candle.open < candle.close;
  
  // Second candle body < one third the size of FIRST candle body
  const firstBody = prevPrevCandle.open - prevPrevCandle.close;
  const secondBody = Math.abs(prevCandle.close - prevCandle.open);
  const condition3 = firstBody / 3 > secondBody;
  
  // Second candle body < one third the size of LAST candle body
  const thirdBody = candle.close - candle.open;
  const condition4 = thirdBody / 3 > secondBody;
  
  // Second candle close < first candle open
  const condition5 = prevCandle.close < prevPrevCandle.open;
  
  // Third candle engulfs first candle open
  const condition6 = candle.close > prevPrevCandle.open;
  
  return condition1 && condition2 && condition3 && condition4 && condition5 && condition6;
}

/**
 * Detect Evening Star pattern (Method 2 - more precise)
 * - First candle: large green body
 * - Second candle: small body (doji-like), above first candle
 * - Third candle: large red body that engulfs first candle's open
 * - Second candle body < 1/3 of first and third candle bodies
 */
export function findEveningStar(candles: OHLCVCandle[], index: number): boolean {
  const candle = getCandle(candles, index);
  const prevCandle = getCandle(candles, index - 1);
  const prevPrevCandle = getCandle(candles, index - 2);
  if (!candle || !prevCandle || !prevPrevCandle) return false;
  
  // First candle is green
  const condition1 = prevPrevCandle.close > prevPrevCandle.open;
  
  // Third candle is red
  const condition2 = candle.open > candle.close;
  
  // Second candle body < one third the size of FIRST candle body
  const firstBody = prevPrevCandle.close - prevPrevCandle.open;
  const secondBody = Math.abs(prevCandle.close - prevCandle.open);
  const condition3 = firstBody / 3 > secondBody;
  
  // Second candle body < one third the size of LAST candle body
  const thirdBody = candle.open - candle.close;
  const condition4 = thirdBody / 3 > secondBody;
  
  // Second candle close > first candle open
  const condition5 = prevCandle.close > prevPrevCandle.open;
  
  // Third candle engulfs first candle open (closes below)
  const condition6 = candle.close < prevPrevCandle.open;
  
  return condition1 && condition2 && condition3 && condition4 && condition5 && condition6;
}

/**
 * Alternative Morning Star detection with trend consideration
 */
export function findMorningStarWithTrend(candles: OHLCVCandle[], index: number, trend: boolean): boolean {
  if (trend) return false; // Morning star should appear in downtrend
  return findMorningStar(candles, index);
}

/**
 * Alternative Evening Star detection with trend consideration
 */
export function findEveningStarWithTrend(candles: OHLCVCandle[], index: number, trend: boolean): boolean {
  if (!trend) return false; // Evening star should appear in uptrend
  return findEveningStar(candles, index);
}

// ==================== MAIN DETECTION FUNCTION ====================

export interface PatternDetectionOptions {
  smaPeriod?: number; // Period for trend detection (default: 3)
  patterns?: string[]; // Specific patterns to detect (default: all)
}

/**
 * Detect all candlestick patterns for a given candle
 * Returns the detected pattern code or null if no pattern found
 */
export function detectPattern(
  candles: OHLCVCandle[],
  index: number,
  options: PatternDetectionOptions = {}
): string | null {
  const { smaPeriod = 3 } = options;
  
  if (index < 0 || index >= candles.length) return null;
  
  // Calculate trend
  const trend = calculateTrend(candles, smaPeriod, index);
  
  // Check patterns in order of reliability (most reliable first)
  
  // Three-candle patterns (most reliable)
  if (findMorningStar(candles, index)) return 'MRNSTR';
  if (findEveningStar(candles, index)) return 'EVNSTR';
  
  // Two-candle patterns
  if (findBullKicker(candles, index)) return 'BLLKCK';
  if (findBearKicker(candles, index)) return 'BERKCK';
  if (findBullishHarami(candles, index, trend ?? undefined)) return 'BLLHRM';
  if (findBearishHarami(candles, index, trend ?? undefined)) return 'BERHRM';
  
  // Single-candle patterns
  if (findGreenHammer(candles, index, trend ?? undefined)) return 'GRNHM';
  if (findRedHammer(candles, index, trend ?? undefined)) return 'RDHM';
  if (findGreenShootingStar(candles, index, trend ?? undefined)) return 'GRNSSTR';
  if (findRedShootingStar(candles, index, trend ?? undefined)) return 'RDSSTR';
  
  return null;
}

/**
 * Scan all candles and return detected patterns
 */
export function scanPatterns(
  candles: OHLCVCandle[],
  options: PatternDetectionOptions = {}
): PatternResult[] {
  const results: PatternResult[] = [];
  
  for (let i = 2; i < candles.length; i++) {
    const patternCode = detectPattern(candles, i, options);
    if (patternCode) {
      const pattern = CANDLESTICK_PATTERNS[patternCode];
      results.push({
        pattern,
        timestamp: candles[i].time,
        price: candles[i].close,
        confidence: pattern.reliability === 'high' ? 0.9 : pattern.reliability === 'medium' ? 0.7 : 0.5,
      });
    }
  }
  
  return results;
}

/**
 * Get pattern statistics for a dataset
 */
export function getPatternStatistics(results: PatternResult[]): Record<string, number> {
  const stats: Record<string, number> = {};
  
  for (const result of results) {
    const code = result.pattern.code;
    stats[code] = (stats[code] || 0) + 1;
  }
  
  return stats;
}

/**
 * Filter patterns by type
 */
export function filterByType(results: PatternResult[], type: 'bullish' | 'bearish'): PatternResult[] {
  return results.filter(r => r.pattern.type === type);
}

/**
 * Get last N patterns
 */
export function getLastPatterns(results: PatternResult[], count: number): PatternResult[] {
  return results.slice(-count);
}

/**
 * Find patterns within a time range
 */
export function findPatternsInRange(
  results: PatternResult[],
  startTime: number,
  endTime: number
): PatternResult[] {
  return results.filter(r => r.timestamp >= startTime && r.timestamp <= endTime);
}

// ==================== SIGNAL GENERATION ====================

export interface PatternSignal {
  type: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'moderate' | 'weak';
  pattern: PatternResult;
  reason: string;
}

/**
 * Generate trading signal from pattern
 */
export function generateSignal(result: PatternResult): PatternSignal {
  const { pattern } = result;
  
  if (pattern.type === 'bullish') {
    return {
      type: 'buy',
      strength: pattern.reliability === 'high' ? 'strong' : pattern.reliability === 'medium' ? 'moderate' : 'weak',
      pattern: result,
      reason: `${pattern.name} detected at ${result.price}`,
    };
  }
  
  if (pattern.type === 'bearish') {
    return {
      type: 'sell',
      strength: pattern.reliability === 'high' ? 'strong' : pattern.reliability === 'medium' ? 'moderate' : 'weak',
      pattern: result,
      reason: `${pattern.name} detected at ${result.price}`,
    };
  }
  
  return {
    type: 'hold',
    strength: 'weak',
    pattern: result,
    reason: 'Neutral pattern detected',
  };
}

/**
 * Get latest trading signal from pattern results
 */
export function getLatestSignal(results: PatternResult[]): PatternSignal | null {
  if (results.length === 0) return null;
  
  const lastPattern = results[results.length - 1];
  return generateSignal(lastPattern);
}

// Export all pattern codes
export const PATTERN_CODES = {
  BLLHRM: 'Bullish Harami',
  BERHRM: 'Bearish Harami',
  GRNHM: 'Green Hammer',
  RDHM: 'Red Hammer',
  BLLKCK: 'Bull Kicker',
  BERKCK: 'Bear Kicker',
  MRNSTR: 'Morning Star',
  EVNSTR: 'Evening Star',
  GRNSSTR: 'Green Shooting Star',
  RDSSTR: 'Red Shooting Star',
} as const;
