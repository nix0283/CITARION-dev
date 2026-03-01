/**
 * Indicator Calculator
 * 
 * Computes indicator values from OHLCV data for chart rendering.
 * Imports calculations from WolfBot, Jesse, and custom implementations.
 */

import type { Time, LineData, HistogramData, WhitespaceData } from "lightweight-charts";
import type { BuiltInIndicator } from "./builtin";
import {
  calculatePivotPoints,
  type PivotType,
  type PivotConfig,
} from "./pivot";
import {
  calculateIchimoku,
  type IchimokuConfig,
} from "./ichimoku";
import {
  calculateFractals,
  type FractalsConfig,
} from "./fractals";
import {
  calculateSuperTrend,
  calculateVWAP as calculateVWAPTA4J,
  calculateKeltnerChannel as calculateKeltnerChannelTA4J,
  calculateMassIndex as calculateMassIndexTA4J,
} from "./ta4j-port";
import {
  calculateStochastic,
  calculateADX,
} from "./quantclub-port";
import {
  calculateHeikinAshi,
} from "./heikin-ashi";
import {
  calculateRenko,
} from "./renko";
import {
  calculateFibonacciLevels,
  calculateExtensions,
} from "./fibonacci";

// ============================================================================
// TYPES
// ============================================================================

export interface Candle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorResult {
  id: string;
  overlay: boolean;
  lines: Array<{
    name: string;
    data: (LineData<Time> | WhitespaceData<Time>)[];
    color: string;
  }>;
  histograms: Array<{
    name: string;
    data: (HistogramData<Time> | WhitespaceData<Time>)[];
    color: string;
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    result[i] = sum / period;
  }
  return result;
}

function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const multiplier = 2 / (period + 1);
  
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  
  if (data.length >= period) {
    result[period - 1] = sum / period;
    let prevEma = result[period - 1] as number;
    for (let i = period; i < data.length; i++) {
      const currentEma = (data[i] - prevEma) * multiplier + prevEma;
      result[i] = currentEma;
      prevEma = currentEma;
    }
  }
  return result;
}

function wma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const weightSum = (period * (period + 1)) / 2;
  
  for (let i = period - 1; i < data.length; i++) {
    let weightedSum = 0;
    for (let j = 0; j < period; j++) {
      weightedSum += data[i - period + 1 + j] * (j + 1);
    }
    result[i] = weightedSum / weightSum;
  }
  return result;
}

function hma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const halfPeriod = Math.floor(period / 2);
  const sqrtPeriod = Math.floor(Math.sqrt(period));
  
  const wmaHalf = wma(data, halfPeriod);
  const wmaFull = wma(data, period);
  
  const rawHMA: (number | null)[] = data.map((_, i) => {
    if (wmaHalf[i] === null || wmaFull[i] === null) return null;
    return 2 * wmaHalf[i]! - wmaFull[i]!;
  });
  
  // Apply WMA to raw HMA
  const wmaRaw = wma(rawHMA.filter((v): v is number => v !== null), sqrtPeriod);
  
  let rawIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (rawHMA[i] !== null) {
      if (rawIdx < wmaRaw.length && wmaRaw[rawIdx] !== null) {
        result[i] = wmaRaw[rawIdx];
      }
      rawIdx++;
    }
  }
  return result;
}

function vwma(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  
  for (let i = period - 1; i < candles.length; i++) {
    let sumPV = 0;
    let sumV = 0;
    for (let j = 0; j < period; j++) {
      sumPV += candles[i - j].close * candles[i - j].volume;
      sumV += candles[i - j].volume;
    }
    result[i] = sumV > 0 ? sumPV / sumV : null;
  }
  return result;
}

function smma(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  
  // First value is SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  
  if (data.length >= period) {
    result[period - 1] = sum / period;
    
    // Smoothed values
    let prevSmma = result[period - 1] as number;
    for (let i = period; i < data.length; i++) {
      const currentSmma = (prevSmma * (period - 1) + data[i]) / period;
      result[i] = currentSmma;
      prevSmma = currentSmma;
    }
  }
  return result;
}

function dema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const ema1 = ema(data, period);
  
  // Get EMA values without nulls
  const ema1Values = ema1.filter((v): v is number => v !== null);
  const ema2 = ema(ema1Values, period);
  
  let ema2Idx = 0;
  for (let i = 0; i < data.length; i++) {
    if (ema1[i] !== null) {
      if (ema2Idx < ema2.length && ema2[ema2Idx] !== null) {
        result[i] = 2 * ema1[i]! - ema2[ema2Idx]!;
      }
      ema2Idx++;
    }
  }
  return result;
}

function tema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  const ema1 = ema(data, period);
  const ema1Values = ema1.filter((v): v is number => v !== null);
  const ema2 = ema(ema1Values, period);
  const ema2Values = ema2.filter((v): v is number => v !== null);
  const ema3 = ema(ema2Values, period);
  
  let ema2Idx = 0;
  let ema3Idx = 0;
  for (let i = 0; i < data.length; i++) {
    if (ema1[i] !== null) {
      const e2 = ema2Idx < ema2.length ? ema2[ema2Idx] : null;
      const e3 = ema3Idx < ema3.length ? ema3[ema3Idx] : null;
      
      if (e2 !== null && e3 !== null) {
        result[i] = 3 * ema1[i]! - 3 * e2 + e3;
      } else if (e2 !== null) {
        result[i] = 2 * ema1[i]! - e2;
      }
      ema2Idx++;
      if (e2 !== null) ema3Idx++;
    }
  }
  return result;
}

function kama(data: number[], period: number, fast: number = 2, slow: number = 30): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  
  if (data.length < period + 1) return result;
  
  // Efficiency Ratio
  const fastSC = 2 / (fast + 1);
  const slowSC = 2 / (slow + 1);
  
  result[period] = data[period];
  
  for (let i = period + 1; i < data.length; i++) {
    // Calculate ER
    const direction = Math.abs(data[i] - data[i - period]);
    let volatility = 0;
    for (let j = 0; j < period; j++) {
      volatility += Math.abs(data[i - j] - data[i - j - 1]);
    }
    const er = volatility > 0 ? direction / volatility : 0;
    
    // Smoothing Constant
    const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
    
    result[i] = result[i - 1]! + sc * (data[i] - result[i - 1]!);
  }
  return result;
}

function vidya(data: number[], period: number, cmoPeriod: number = 10): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  
  if (data.length < period) return result;
  
  result[period - 1] = data[period - 1];
  
  for (let i = period; i < data.length; i++) {
    // Calculate CMO
    let sumUp = 0;
    let sumDown = 0;
    for (let j = 0; j < cmoPeriod; j++) {
      const change = data[i - j] - data[i - j - 1];
      if (change > 0) sumUp += change;
      else sumDown += Math.abs(change);
    }
    const cmo = (sumUp + sumDown) > 0 ? (sumUp - sumDown) / (sumUp + sumDown) : 0;
    
    const a = Math.abs(cmo);
    const alpha = 2 / (period + 1);
    result[i] = (1 - a * alpha) * result[i - 1]! + a * alpha * data[i];
  }
  return result;
}

function mcginley(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  
  if (data.length < 1) return result;
  
  result[0] = data[0];
  
  for (let i = 1; i < data.length; i++) {
    if (result[i - 1] !== null && result[i - 1] !== 0) {
      result[i] = result[i - 1]! + (data[i] - result[i - 1]!) / 
        (period * Math.pow(data[i] / result[i - 1]!, 4));
    } else {
      result[i] = data[i];
    }
  }
  return result;
}

function rsi(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  
  if (closes.length < period + 1) return result;
  
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  
  avgGain /= period;
  avgLoss /= period;
  
  if (avgLoss === 0) result[period] = 100;
  else result[period] = 100 - (100 / (1 + avgGain / avgLoss));
  
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
    
    if (avgLoss === 0) result[i] = 100;
    else result[i] = 100 - (100 / (1 + avgGain / avgLoss));
  }
  return result;
}

function stdev(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    result[i] = Math.sqrt(variance);
  }
  return result;
}

function atr(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const trValues: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trValues.push(candles[i].high - candles[i].low);
    } else {
      trValues.push(Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      ));
    }
  }
  
  if (trValues.length >= period) {
    let sum = 0;
    for (let i = 0; i < period; i++) sum += trValues[i];
    result[period - 1] = sum / period;
    
    for (let i = period; i < trValues.length; i++) {
      result[i] = (result[i - 1]! * (period - 1) + trValues[i]) / period;
    }
  }
  return result;
}

function trueRange(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      result.push(candles[i].high - candles[i].low);
    } else {
      result.push(Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close)
      ));
    }
  }
  return result;
}

function cci(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  
  for (let i = period - 1; i < candles.length; i++) {
    const tp: number[] = [];
    for (let j = 0; j < period; j++) {
      tp.push((candles[i - j].high + candles[i - j].low + candles[i - j].close) / 3);
    }
    const smaTP = tp.reduce((a, b) => a + b, 0) / period;
    const meanDev = tp.reduce((sum, val) => sum + Math.abs(val - smaTP), 0) / period;
    
    result[i] = meanDev > 0 ? (tp[0] - smaTP) / (0.015 * meanDev) : 0;
  }
  return result;
}

function williamsR(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const highestHigh = Math.max(...slice.map(c => c.high));
    const lowestLow = Math.min(...slice.map(c => c.low));
    
    if (highestHigh === lowestLow) result[i] = -50;
    else result[i] = ((highestHigh - candles[i].close) / (highestHigh - lowestLow)) * -100;
  }
  return result;
}

function mfi(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  
  if (candles.length < period + 1) return result;
  
  const positiveMF: number[] = [0];
  const negativeMF: number[] = [0];
  
  for (let i = 1; i < candles.length; i++) {
    const prevTP = (candles[i - 1].high + candles[i - 1].low + candles[i - 1].close) / 3;
    const currTP = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const mf = currTP * candles[i].volume;
    
    if (currTP > prevTP) positiveMF.push(mf);
    else if (currTP < prevTP) negativeMF.push(mf);
    else { positiveMF.push(0); negativeMF.push(0); }
  }
  
  for (let i = period; i < candles.length; i++) {
    const posSum = positiveMF.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const negSum = negativeMF.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    
    if (negSum === 0) result[i] = 100;
    else result[i] = 100 - (100 / (1 + posSum / negSum));
  }
  return result;
}

function roc(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  
  for (let i = period; i < data.length; i++) {
    if (data[i - period] !== 0) {
      result[i] = ((data[i] - data[i - period]) / data[i - period]) * 100;
    }
  }
  return result;
}

function momentum(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] - data[i - period];
  }
  return result;
}

function cmo(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  
  for (let i = period; i < data.length; i++) {
    let sumUp = 0;
    let sumDown = 0;
    
    for (let j = 0; j < period; j++) {
      const change = data[i - j] - data[i - j - 1];
      if (change > 0) sumUp += change;
      else sumDown += Math.abs(change);
    }
    
    if (sumUp + sumDown === 0) result[i] = 0;
    else result[i] = 100 * (sumUp - sumDown) / (sumUp + sumDown);
  }
  return result;
}

function awesomeOscillator(candles: Candle[], fastPeriod: number, slowPeriod: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const hl2 = candles.map(c => (c.high + c.low) / 2);
  const fastSMA = sma(hl2, fastPeriod);
  const slowSMA = sma(hl2, slowPeriod);
  
  for (let i = slowPeriod - 1; i < candles.length; i++) {
    if (fastSMA[i] !== null && slowSMA[i] !== null) {
      result[i] = fastSMA[i]! - slowSMA[i]!;
    }
  }
  return result;
}

function tsi(closes: number[], longPeriod: number, shortPeriod: number): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  const changes: number[] = [0];
  
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }
  
  const absChanges = changes.map(Math.abs);
  const emaChanges = ema(changes, longPeriod);
  const emaAbsChanges = ema(absChanges, longPeriod);
  const emaChangesValues = emaChanges.filter((v): v is number => v !== null);
  const emaAbsChangesValues = emaAbsChanges.filter((v): v is number => v !== null);
  const emaChanges2 = ema(emaChangesValues, shortPeriod);
  const emaAbsChanges2 = ema(emaAbsChangesValues, shortPeriod);
  
  let idx2 = 0;
  for (let i = longPeriod; i < closes.length; i++) {
    if (emaChanges[i] !== null && idx2 < emaChanges2.length && idx2 < emaAbsChanges2.length) {
      if (emaAbsChanges2[idx2] !== 0 && emaAbsChanges2[idx2] !== null) {
        result[i] = 100 * (emaChanges2[idx2]! / emaAbsChanges2[idx2]!);
      }
      idx2++;
    }
  }
  return result;
}

function obv(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  let obvValue = 0;
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      obvValue = candles[i].volume;
    } else {
      if (candles[i].close > candles[i - 1].close) obvValue += candles[i].volume;
      else if (candles[i].close < candles[i - 1].close) obvValue -= candles[i].volume;
    }
    result.push(obvValue);
  }
  return result;
}

function cmf(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  
  for (let i = period - 1; i < candles.length; i++) {
    let sumMFV = 0;
    let sumVolume = 0;
    
    for (let j = 0; j < period; j++) {
      const { high, low, close, volume } = candles[i - j];
      const range = high - low;
      const mfMultiplier = range > 0 ? ((close - low) - (high - close)) / range : 0;
      sumMFV += mfMultiplier * volume;
      sumVolume += volume;
    }
    
    result[i] = sumVolume > 0 ? sumMFV / sumVolume : 0;
  }
  return result;
}

function adl(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = [];
  let adlValue = 0;
  
  for (const candle of candles) {
    const range = candle.high - candle.low;
    const mfMultiplier = range > 0 
      ? ((candle.close - candle.low) - (candle.high - candle.close)) / range 
      : 0;
    adlValue += mfMultiplier * candle.volume;
    result.push(adlValue);
  }
  return result;
}

function volumeOscillator(candles: Candle[], fastPeriod: number, slowPeriod: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const volumes = candles.map(c => c.volume);
  const fastSMA = sma(volumes, fastPeriod);
  const slowSMA = sma(volumes, slowPeriod);
  
  for (let i = slowPeriod - 1; i < candles.length; i++) {
    if (fastSMA[i] !== null && slowSMA[i] !== null && slowSMA[i] !== 0) {
      result[i] = ((fastSMA[i]! - slowSMA[i]!) / slowSMA[i]!) * 100;
    }
  }
  return result;
}

function emv(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const emvValues: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const distance = ((candles[i].high + candles[i].low) / 2) - 
                     ((candles[i - 1].high + candles[i - 1].low) / 2);
    const boxRatio = candles[i].volume / 10000 / (candles[i].high - candles[i].low);
    
    emvValues.push(boxRatio > 0 ? distance / boxRatio : 0);
  }
  
  const emvSMA = sma(emvValues, period);
  for (let i = period; i < candles.length; i++) {
    result[i] = emvSMA[i - 1];
  }
  return result;
}

function rollingVWAP(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  
  for (let i = period - 1; i < candles.length; i++) {
    let sumTPV = 0;
    let sumVolume = 0;
    
    for (let j = 0; j < period; j++) {
      const tp = (candles[i - j].high + candles[i - j].low + candles[i - j].close) / 3;
      sumTPV += tp * candles[i - j].volume;
      sumVolume += candles[i - j].volume;
    }
    
    result[i] = sumVolume > 0 ? sumTPV / sumVolume : null;
  }
  return result;
}

function donchianChannels(candles: Candle[], period: number): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const middle: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);
  
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    upper[i] = Math.max(...slice.map(c => c.high));
    lower[i] = Math.min(...slice.map(c => c.low));
    middle[i] = (upper[i]! + lower[i]!) / 2;
  }
  return { upper, middle, lower };
}

function historicalVolatility(closes: number[], period: number, annualize: boolean): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  const returns: number[] = [];
  
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }
  
  for (let i = period; i < returns.length; i++) {
    const slice = returns.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (period - 1);
    const std = Math.sqrt(variance);
    
    result[i + 1] = annualize ? std * Math.sqrt(365 * 24) * 100 : std * 100;
  }
  return result;
}

function parabolicSAR(candles: Candle[], start: number, increment: number, maximum: number): (number | null)[] {
  const result: (number | null)[] = [];
  
  let af = start;
  let trend: 'bullish' | 'bearish' = 'bullish';
  let ep = candles[0].low;
  let sar = candles[0].high;
  
  result.push(sar);
  
  for (let i = 1; i < candles.length; i++) {
    sar = sar + af * (ep - sar);
    
    if (trend === 'bullish') {
      sar = Math.min(sar, candles[i - 1].low, i > 1 ? candles[i - 2].low : candles[i - 1].low);
      
      if (candles[i].low < sar) {
        trend = 'bearish';
        sar = ep;
        ep = candles[i].low;
        af = start;
      } else if (candles[i].high > ep) {
        ep = candles[i].high;
        af = Math.min(af + increment, maximum);
      }
    } else {
      sar = Math.max(sar, candles[i - 1].high, i > 1 ? candles[i - 2].high : candles[i - 1].high);
      
      if (candles[i].high > sar) {
        trend = 'bullish';
        sar = ep;
        ep = candles[i].high;
        af = start;
      } else if (candles[i].low < ep) {
        ep = candles[i].low;
        af = Math.min(af + increment, maximum);
      }
    }
    
    result.push(sar);
  }
  return result;
}

function aroon(candles: Candle[], period: number): {
  up: (number | null)[];
  down: (number | null)[];
  oscillator: (number | null)[];
} {
  const up: (number | null)[] = new Array(candles.length).fill(null);
  const down: (number | null)[] = new Array(candles.length).fill(null);
  const oscillator: (number | null)[] = new Array(candles.length).fill(null);
  
  for (let i = period; i < candles.length; i++) {
    const slice = candles.slice(i - period, i + 1);
    
    let highestIdx = 0;
    let lowestIdx = 0;
    
    for (let j = 1; j <= period; j++) {
      if (slice[j].high > slice[highestIdx].high) highestIdx = j;
      if (slice[j].low < slice[lowestIdx].low) lowestIdx = j;
    }
    
    up[i] = ((period - (period - highestIdx)) / period) * 100;
    down[i] = ((period - (period - lowestIdx)) / period) * 100;
    oscillator[i] = up[i]! - down[i]!;
  }
  return { up, down, oscillator };
}

function vortex(candles: Candle[], period: number): {
  plusVI: (number | null)[];
  minusVI: (number | null)[];
} {
  const plusVI: (number | null)[] = new Array(candles.length).fill(null);
  const minusVI: (number | null)[] = new Array(candles.length).fill(null);
  
  const plusVM: number[] = [];
  const minusVM: number[] = [];
  const trValues: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    plusVM.push(Math.abs(candles[i].high - candles[i - 1].low));
    minusVM.push(Math.abs(candles[i].low - candles[i - 1].high));
    trValues.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    ));
  }
  
  for (let i = period; i < candles.length; i++) {
    const sumPlusVM = plusVM.slice(i - period, i).reduce((a, b) => a + b, 0);
    const sumMinusVM = minusVM.slice(i - period, i).reduce((a, b) => a + b, 0);
    const sumTR = trValues.slice(i - period, i).reduce((a, b) => a + b, 0);
    
    plusVI[i] = sumTR > 0 ? sumPlusVM / sumTR : null;
    minusVI[i] = sumTR > 0 ? sumMinusVM / sumTR : null;
  }
  return { plusVI, minusVI };
}

function dmi(candles: Candle[], period: number): {
  plusDI: (number | null)[];
  minusDI: (number | null)[];
} {
  const plusDI: (number | null)[] = new Array(candles.length).fill(null);
  const minusDI: (number | null)[] = new Array(candles.length).fill(null);
  
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trValues: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trValues.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    ));
  }
  
  // Smoothed values using Wilder's smoothing
  const smoothTR = smma(trValues, period);
  const smoothPlusDM = smma(plusDM, period);
  const smoothMinusDM = smma(minusDM, period);
  
  for (let i = period; i < candles.length; i++) {
    const trIdx = i - 1;
    if (smoothTR[trIdx] !== null && smoothTR[trIdx] !== 0) {
      plusDI[i] = smoothPlusDM[trIdx] !== null ? (smoothPlusDM[trIdx]! / smoothTR[trIdx]!) * 100 : null;
      minusDI[i] = smoothMinusDM[trIdx] !== null ? (smoothMinusDM[trIdx]! / smoothTR[trIdx]!) * 100 : null;
    }
  }
  return { plusDI, minusDI };
}

function stochastic(candles: Candle[], kPeriod: number, dPeriod: number, smoothK: number): {
  k: (number | null)[];
  d: (number | null)[];
} {
  const k: (number | null)[] = new Array(candles.length).fill(null);
  
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const highestHigh = Math.max(...slice.map(c => c.high));
    const lowestLow = Math.min(...slice.map(c => c.low));
    
    if (highestHigh === lowestLow) k[i] = 50;
    else k[i] = ((candles[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
  }
  
  const smoothedK = smoothK > 1 ? sma(k.filter((v): v is number => v !== null), smoothK) : k;
  const d = sma(k.filter((v): v is number => v !== null), dPeriod);
  
  // Align d values
  const dAligned: (number | null)[] = new Array(candles.length).fill(null);
  let dIdx = 0;
  for (let i = 0; i < candles.length; i++) {
    if (k[i] !== null && dIdx < d.length) {
      dAligned[i] = d[dIdx];
      dIdx++;
    }
  }
  
  return { k: smoothedK, d: dAligned };
}

function stochRSI(closes: number[], rsiPeriod: number, stochPeriod: number, kPeriod: number, dPeriod: number): {
  k: (number | null)[];
  d: (number | null)[];
} {
  const rsiValues = rsi(closes, rsiPeriod);
  const k: (number | null)[] = new Array(closes.length).fill(null);
  
  for (let i = stochPeriod; i < closes.length; i++) {
    const rsiSlice = rsiValues.slice(i - stochPeriod + 1, i + 1).filter((v): v is number => v !== null);
    
    if (rsiSlice.length === stochPeriod) {
      const maxRSI = Math.max(...rsiSlice);
      const minRSI = Math.min(...rsiSlice);
      const currentRSI = rsiSlice[rsiSlice.length - 1];
      
      if (maxRSI === minRSI) k[i] = 100;
      else k[i] = ((currentRSI - minRSI) / (maxRSI - minRSI)) * 100;
    }
  }
  
  const smoothedK = sma(k.filter((v): v is number => v !== null), kPeriod);
  const d = sma(smoothedK.filter((v): v is number => v !== null), dPeriod);
  
  // Align values
  const kAligned: (number | null)[] = new Array(closes.length).fill(null);
  const dAligned: (number | null)[] = new Array(closes.length).fill(null);
  
  let skIdx = 0;
  let dIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (k[i] !== null && skIdx < smoothedK.length) {
      kAligned[i] = smoothedK[skIdx];
      skIdx++;
      if (dIdx < d.length) {
        dAligned[i] = d[dIdx];
        dIdx++;
      }
    }
  }
  
  return { k: kAligned, d: dAligned };
}

function ultosc(candles: Candle[], period1: number, period2: number, period3: number): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const bp: number[] = [];
  const tr: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    const trueLow = Math.min(candles[i].low, i > 0 ? candles[i - 1].close : candles[i].low);
    bp.push(candles[i].close - trueLow);
    tr.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - (i > 0 ? candles[i - 1].close : candles[i].close)),
      Math.abs(candles[i].low - (i > 0 ? candles[i - 1].close : candles[i].close))
    ));
  }
  
  const maxPeriod = Math.max(period1, period2, period3);
  
  for (let i = maxPeriod; i < candles.length; i++) {
    const sumBP1 = bp.slice(i - period1 + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR1 = tr.slice(i - period1 + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumBP2 = bp.slice(i - period2 + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR2 = tr.slice(i - period2 + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumBP3 = bp.slice(i - period3 + 1, i + 1).reduce((a, b) => a + b, 0);
    const sumTR3 = tr.slice(i - period3 + 1, i + 1).reduce((a, b) => a + b, 0);
    
    const avg1 = sumTR1 > 0 ? sumBP1 / sumTR1 : 0;
    const avg2 = sumTR2 > 0 ? sumBP2 / sumTR2 : 0;
    const avg3 = sumTR3 > 0 ? sumBP3 / sumTR3 : 0;
    
    result[i] = 100 * ((4 * avg1 + 2 * avg2 + avg3) / 7);
  }
  return result;
}

function calculatePPOValues(closes: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number): {
  ppo: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEMA = ema(closes, fastPeriod);
  const slowEMA = ema(closes, slowPeriod);
  
  const ppoLine: (number | null)[] = closes.map((_, i) => {
    if (fastEMA[i] === null || slowEMA[i] === null || slowEMA[i] === 0) return null;
    return ((fastEMA[i]! - slowEMA[i]!) / slowEMA[i]!) * 100;
  });
  
  const ppoValues = ppoLine.filter((v): v is number => v !== null);
  const signalLine = ema(ppoValues, signalPeriod);
  
  const histogram: (number | null)[] = closes.map((_, i) => {
    if (ppoLine[i] === null) return null;
    // Find corresponding signal
    const ppoIdx = ppoLine.slice(0, i + 1).filter(v => v !== null).length - 1;
    if (ppoIdx >= 0 && ppoIdx < signalLine.length && signalLine[ppoIdx] !== null) {
      return ppoLine[i]! - signalLine[ppoIdx]!;
    }
    return null;
  });
  
  // Align signal
  const signalAligned: (number | null)[] = new Array(closes.length).fill(null);
  let sigIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (ppoLine[i] !== null && sigIdx < signalLine.length) {
      signalAligned[i] = signalLine[sigIdx];
      sigIdx++;
    }
  }
  
  return { ppo: ppoLine, signal: signalAligned, histogram };
}

function bbWidth(closes: number[], period: number, mult: number): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  const smaValues = sma(closes, period);
  const stdevValues = stdev(closes, period);
  
  for (let i = period - 1; i < closes.length; i++) {
    if (smaValues[i] !== null && stdevValues[i] !== null && smaValues[i] !== 0) {
      const upper = smaValues[i]! + mult * stdevValues[i]!;
      const lower = smaValues[i]! - mult * stdevValues[i]!;
      result[i] = ((upper - lower) / smaValues[i]!) * 100;
    }
  }
  return result;
}

// ============================================================================
// SAFE DATA BUILDERS
// ============================================================================

function buildLineData(
  candles: Candle[],
  values: (number | null)[]
): (LineData<Time> | WhitespaceData<Time>)[] {
  const result: (LineData<Time> | WhitespaceData<Time>)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const value = values[i];
    const time = candles[i].time;

    if (value !== null && !isNaN(value) && isFinite(value)) {
      result.push({ time, value });
    } else {
      result.push({ time });
    }
  }

  return result;
}

function buildHistogramData(
  candles: Candle[],
  values: (number | null)[],
  colorUp: string,
  colorDown: string
): (HistogramData<Time> | WhitespaceData<Time>)[] {
  const result: (HistogramData<Time> | WhitespaceData<Time>)[] = [];
  for (let i = 0; i < candles.length; i++) {
    const value = values[i];
    const time = candles[i].time;
    if (value !== null && !isNaN(value) && isFinite(value)) {
      result.push({
        time,
        value,
        color: value >= 0 ? colorUp : colorDown,
      });
    } else {
      result.push({ time });
    }
  }
  return result;
}

// ============================================================================
// INDICATOR CALCULATORS
// ============================================================================

// Helper to get closes from candles
const getCloses = (candles: Candle[]) => candles.map(c => c.close);
const getHighs = (candles: Candle[]) => candles.map(c => c.high);
const getLows = (candles: Candle[]) => candles.map(c => c.low);
const getVolumes = (candles: Candle[]) => candles.map(c => c.volume);

// ==================== MOVING AVERAGES ====================

function calculateSMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const smaValues = sma(getCloses(candles), length);
  
  return {
    id: 'sma',
    overlay: true,
    lines: [{ name: 'sma', data: buildLineData(candles, smaValues), color: '#2962FF' }],
    histograms: [],
  };
}

function calculateEMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const emaValues = ema(getCloses(candles), length);
  
  return {
    id: 'ema',
    overlay: true,
    lines: [{ name: 'ema', data: buildLineData(candles, emaValues), color: '#00C853' }],
    histograms: [],
  };
}

function calculateWMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const wmaValues = wma(getCloses(candles), length);
  
  return {
    id: 'wma',
    overlay: true,
    lines: [{ name: 'wma', data: buildLineData(candles, wmaValues), color: '#7C4DFF' }],
    histograms: [],
  };
}

function calculateHMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const hmaValues = hma(getCloses(candles), length);
  
  return {
    id: 'hma',
    overlay: true,
    lines: [{ name: 'hma', data: buildLineData(candles, hmaValues), color: '#FF6D00' }],
    histograms: [],
  };
}

function calculateVWMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const vwmaValues = vwma(candles, length);
  
  return {
    id: 'vwma',
    overlay: true,
    lines: [{ name: 'vwma', data: buildLineData(candles, vwmaValues), color: '#00BCD4' }],
    histograms: [],
  };
}

function calculateSMMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const smmaValues = smma(getCloses(candles), length);
  
  return {
    id: 'smma',
    overlay: true,
    lines: [{ name: 'smma', data: buildLineData(candles, smmaValues), color: '#607D8B' }],
    histograms: [],
  };
}

function calculateDEMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const demaValues = dema(getCloses(candles), length);
  
  return {
    id: 'dema',
    overlay: true,
    lines: [{ name: 'dema', data: buildLineData(candles, demaValues), color: '#E91E63' }],
    histograms: [],
  };
}

function calculateTEMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const temaValues = tema(getCloses(candles), length);
  
  return {
    id: 'tema',
    overlay: true,
    lines: [{ name: 'tema', data: buildLineData(candles, temaValues), color: '#9C27B0' }],
    histograms: [],
  };
}

function calculateKAMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const fast = inputs.fast as number ?? 2;
  const slow = inputs.slow as number ?? 30;
  const kamaValues = kama(getCloses(candles), length, fast, slow);
  
  return {
    id: 'kama',
    overlay: true,
    lines: [{ name: 'kama', data: buildLineData(candles, kamaValues), color: '#FF5722' }],
    histograms: [],
  };
}

function calculateVIDYA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const cmoPeriod = inputs.cmoPeriod as number ?? 10;
  const vidyaValues = vidya(getCloses(candles), length, cmoPeriod);
  
  return {
    id: 'vidya',
    overlay: true,
    lines: [{ name: 'vidya', data: buildLineData(candles, vidyaValues), color: '#795548' }],
    histograms: [],
  };
}

function calculateMcGinley(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const mcginleyValues = mcginley(getCloses(candles), length);
  
  return {
    id: 'mcginley',
    overlay: true,
    lines: [{ name: 'mcginley', data: buildLineData(candles, mcginleyValues), color: '#8BC34A' }],
    histograms: [],
  };
}

function calculateEMACross(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const fastLength = inputs.fastLength as number;
  const slowLength = inputs.slowLength as number;
  const closes = getCloses(candles);
  
  const fastEma = ema(closes, fastLength);
  const slowEma = ema(closes, slowLength);
  
  return {
    id: 'ema_cross',
    overlay: true,
    lines: [
      { name: 'fast', data: buildLineData(candles, fastEma), color: '#00C853' },
      { name: 'slow', data: buildLineData(candles, slowEma), color: '#F6465D' },
    ],
    histograms: [],
  };
}

function calculateRollingVWAP(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const vwapValues = rollingVWAP(candles, length);
  
  return {
    id: 'rolling_vwap',
    overlay: true,
    lines: [{ name: 'rolling_vwap', data: buildLineData(candles, vwapValues), color: '#3F51B5' }],
    histograms: [],
  };
}

// ==================== OSCILLATORS ====================

function calculateRSI(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const rsiValues = rsi(getCloses(candles), length);
  
  return {
    id: 'rsi',
    overlay: false,
    lines: [{ name: 'rsi', data: buildLineData(candles, rsiValues), color: '#D500F9' }],
    histograms: [],
  };
}

function calculateMACD(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const fastLength = inputs.fastLength as number;
  const slowLength = inputs.slowLength as number;
  const signalLength = inputs.signalLength as number;
  const closes = getCloses(candles);
  
  const fastEma = ema(closes, fastLength);
  const slowEma = ema(closes, slowLength);
  
  const macdLine: (number | null)[] = closes.map((_, i) => {
    if (fastEma[i] === null || slowEma[i] === null) return null;
    return fastEma[i]! - slowEma[i]!;
  });
  
  const macdValues = macdLine.filter(v => v !== null) as number[];
  const signalEma = ema(macdValues, signalLength);
  
  const signalLine: (number | null)[] = new Array(candles.length).fill(null);
  let macdIdx = 0;
  for (let i = 0; i < candles.length; i++) {
    if (macdLine[i] !== null) {
      signalLine[i] = signalEma[macdIdx] ?? null;
      macdIdx++;
    }
  }
  
  const histogramValues: (number | null)[] = candles.map((_, i) => {
    const macd = macdLine[i];
    const signal = signalLine[i];
    if (macd === null || signal === null) return null;
    return macd - signal;
  });
  
  return {
    id: 'macd',
    overlay: false,
    lines: [
      { name: 'macd', data: buildLineData(candles, macdLine), color: '#2962FF' },
      { name: 'signal', data: buildLineData(candles, signalLine), color: '#FF6D00' },
    ],
    histograms: [{ name: 'histogram', data: buildHistogramData(candles, histogramValues, '#26a69a', '#ef5350'), color: '#26a69a' }],
  };
}

function calculatePPO(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const fastLength = inputs.fastLength as number;
  const slowLength = inputs.slowLength as number;
  const signalLength = inputs.signalLength as number;
  const closes = getCloses(candles);
  
  const { ppo: ppoLine, signal, histogram } = calculatePPOValues(closes, fastLength, slowLength, signalLength);
  
  return {
    id: 'ppo',
    overlay: false,
    lines: [
      { name: 'ppo', data: buildLineData(candles, ppoLine), color: '#2196F3' },
      { name: 'signal', data: buildLineData(candles, signal), color: '#FF9800' },
    ],
    histograms: [{ name: 'histogram', data: buildHistogramData(candles, histogram, '#4CAF50', '#F44336'), color: '#4CAF50' }],
  };
}

function calculateStochasticIndicator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const kPeriod = inputs.kPeriod as number;
  const dPeriod = inputs.dPeriod as number;
  const smoothK = inputs.smoothK as number;
  
  const { k, d } = stochastic(candles, kPeriod, dPeriod, smoothK);
  
  return {
    id: 'stochastic',
    overlay: false,
    lines: [
      { name: 'k', data: buildLineData(candles, k), color: '#2962FF' },
      { name: 'd', data: buildLineData(candles, d), color: '#FF6D00' },
    ],
    histograms: [],
  };
}

function calculateStochRSI(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const rsiPeriod = inputs.rsiPeriod as number;
  const stochPeriod = inputs.stochPeriod as number;
  const kPeriod = inputs.kPeriod as number;
  const dPeriod = inputs.dPeriod as number;
  
  const { k, d } = stochRSI(getCloses(candles), rsiPeriod, stochPeriod, kPeriod, dPeriod);
  
  return {
    id: 'stochrsi',
    overlay: false,
    lines: [
      { name: 'k', data: buildLineData(candles, k), color: '#9C27B0' },
      { name: 'd', data: buildLineData(candles, d), color: '#E91E63' },
    ],
    histograms: [],
  };
}

function calculateWilliamsR(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const wrValues = williamsR(candles, length);
  
  return {
    id: 'williams_r',
    overlay: false,
    lines: [{ name: 'williams_r', data: buildLineData(candles, wrValues), color: '#FF5722' }],
    histograms: [],
  };
}

function calculateCCI(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const cciValues = cci(candles, length);
  
  return {
    id: 'cci',
    overlay: false,
    lines: [{ name: 'cci', data: buildLineData(candles, cciValues), color: '#00BCD4' }],
    histograms: [],
  };
}

function calculateMFI(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const mfiValues = mfi(candles, length);
  
  return {
    id: 'mfi',
    overlay: false,
    lines: [{ name: 'mfi', data: buildLineData(candles, mfiValues), color: '#FF9800' }],
    histograms: [],
  };
}

function calculateROC(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const rocValues = roc(getCloses(candles), length);
  
  return {
    id: 'roc',
    overlay: false,
    lines: [{ name: 'roc', data: buildLineData(candles, rocValues), color: '#4CAF50' }],
    histograms: [],
  };
}

function calculateMomentum(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const momValues = momentum(getCloses(candles), length);
  
  return {
    id: 'momentum',
    overlay: false,
    lines: [{ name: 'momentum', data: buildLineData(candles, momValues), color: '#2196F3' }],
    histograms: [],
  };
}

function calculateCMO(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const cmoValues = cmo(getCloses(candles), length);
  
  return {
    id: 'cmo',
    overlay: false,
    lines: [{ name: 'cmo', data: buildLineData(candles, cmoValues), color: '#9C27B0' }],
    histograms: [],
  };
}

function calculateUltimateOscillator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const period1 = inputs.period1 as number;
  const period2 = inputs.period2 as number;
  const period3 = inputs.period3 as number;
  const ultValues = ultosc(candles, period1, period2, period3);
  
  return {
    id: 'ultimate_oscillator',
    overlay: false,
    lines: [{ name: 'ultosc', data: buildLineData(candles, ultValues), color: '#673AB7' }],
    histograms: [],
  };
}

function calculateAO(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const fastLength = inputs.fastLength as number;
  const slowLength = inputs.slowLength as number;
  const aoValues = awesomeOscillator(candles, fastLength, slowLength);
  
  return {
    id: 'awesome_oscillator',
    overlay: false,
    lines: [],
    histograms: [{ name: 'ao', data: buildHistogramData(candles, aoValues, '#26A69A', '#EF5350'), color: '#26A69A' }],
  };
}

function calculateTSI(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const longLength = inputs.longLength as number;
  const shortLength = inputs.shortLength as number;
  const tsiValues = tsi(getCloses(candles), longLength, shortLength);
  
  return {
    id: 'tsi',
    overlay: false,
    lines: [{ name: 'tsi', data: buildLineData(candles, tsiValues), color: '#795548' }],
    histograms: [],
  };
}

function calculateVortexIndicator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const { plusVI, minusVI } = vortex(candles, length);
  
  return {
    id: 'vortex',
    overlay: false,
    lines: [
      { name: 'plusVI', data: buildLineData(candles, plusVI), color: '#26A69A' },
      { name: 'minusVI', data: buildLineData(candles, minusVI), color: '#EF5350' },
    ],
    histograms: [],
  };
}

function calculateMassIndex(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const emaPeriod = inputs.emaPeriod as number;
  const sumPeriod = inputs.sumPeriod as number;
  
  return calculateMassIndexTA4J(candles, { emaPeriod, sumPeriod });
}

function calculateADXIndicator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const period = inputs.period as number;
  return calculateADX(candles, { period });
}

// ==================== VOLATILITY ====================

function calculateBB(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const mult = inputs.mult as number;
  const closes = getCloses(candles);
  
  const smaValues = sma(closes, length);
  const stdevValues = stdev(closes, length);
  
  const upperValues: (number | null)[] = closes.map((_, i) => {
    if (smaValues[i] === null || stdevValues[i] === null) return null;
    return smaValues[i]! + stdevValues[i]! * mult;
  });
  
  const lowerValues: (number | null)[] = closes.map((_, i) => {
    if (smaValues[i] === null || stdevValues[i] === null) return null;
    return smaValues[i]! - stdevValues[i]! * mult;
  });
  
  return {
    id: 'bb',
    overlay: true,
    lines: [
      { name: 'upper', data: buildLineData(candles, upperValues), color: '#2962FF' },
      { name: 'middle', data: buildLineData(candles, smaValues), color: '#FF6D00' },
      { name: 'lower', data: buildLineData(candles, lowerValues), color: '#2962FF' },
    ],
    histograms: [],
  };
}

function calculateBBWidth(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const mult = inputs.mult as number;
  const bbwValues = bbWidth(getCloses(candles), length, mult);
  
  return {
    id: 'bb_width',
    overlay: false,
    lines: [{ name: 'bb_width', data: buildLineData(candles, bbwValues), color: '#9C27B0' }],
    histograms: [],
  };
}

function calculateATR(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const atrValues = atr(candles, length);
  
  return {
    id: 'atr',
    overlay: false,
    lines: [{ name: 'atr', data: buildLineData(candles, atrValues), color: '#FF6D00' }],
    histograms: [],
  };
}

function calculateNATR(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const atrValues = atr(candles, length);
  const closes = getCloses(candles);
  
  const natrValues: (number | null)[] = candles.map((_, i) => {
    if (atrValues[i] === null || closes[i] === 0) return null;
    return (atrValues[i]! / closes[i]) * 100;
  });
  
  return {
    id: 'natr',
    overlay: false,
    lines: [{ name: 'natr', data: buildLineData(candles, natrValues), color: '#FF9800' }],
    histograms: [],
  };
}

function calculateTrueRange(candles: Candle[], _inputs: Record<string, number | string | boolean>): IndicatorResult {
  const trValues = trueRange(candles);
  
  return {
    id: 'true_range',
    overlay: false,
    lines: [],
    histograms: [{ name: 'tr', data: buildHistogramData(candles, trValues, '#607D8B', '#607D8B'), color: '#607D8B' }],
  };
}

function calculateKeltnerChannelCalc(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const period = inputs.emaPeriod as number ?? 20;
  const atrPeriod = inputs.atrPeriod as number ?? 10;
  const multiplier = inputs.multiplier as number ?? 2;
  
  return calculateKeltnerChannelTA4J(candles, { period, atrPeriod, multiplier });
}

function calculateDonchianChannel(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const { upper, middle, lower } = donchianChannels(candles, length);
  
  return {
    id: 'donchian_channel',
    overlay: true,
    lines: [
      { name: 'upper', data: buildLineData(candles, upper), color: '#7C4DFF' },
      { name: 'middle', data: buildLineData(candles, middle), color: '#FF6D00' },
      { name: 'lower', data: buildLineData(candles, lower), color: '#7C4DFF' },
    ],
    histograms: [],
  };
}

function calculateStdDev(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const stddevValues = stdev(getCloses(candles), length);
  
  return {
    id: 'stddev',
    overlay: false,
    lines: [{ name: 'stddev', data: buildLineData(candles, stddevValues), color: '#8BC34A' }],
    histograms: [],
  };
}

function calculateHistoricalVolatility(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const annualize = inputs.annualize as boolean ?? true;
  const hvValues = historicalVolatility(getCloses(candles), length, annualize);
  
  return {
    id: 'historical_volatility',
    overlay: false,
    lines: [{ name: 'hv', data: buildLineData(candles, hvValues), color: '#CDDC39' }],
    histograms: [],
  };
}

function calculateSuperTrendIndicator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const period = inputs.period as number;
  const multiplier = inputs.multiplier as number;
  return calculateSuperTrend(candles, { period, multiplier });
}

function calculateParabolicSAR(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const start = inputs.start as number;
  const increment = inputs.increment as number;
  const maximum = inputs.maximum as number;
  const sarValues = parabolicSAR(candles, start, increment, maximum);
  
  return {
    id: 'parabolic_sar',
    overlay: true,
    lines: [{ name: 'sar', data: buildLineData(candles, sarValues), color: '#FF5722' }],
    histograms: [],
  };
}

function calculateIchimokuIndicator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const config: Partial<IchimokuConfig> = {
    tenkanPeriod: (inputs.tenkanPeriod as number) ?? 9,
    kijunPeriod: (inputs.kijunPeriod as number) ?? 26,
    senkouBPeriod: (inputs.senkouBPeriod as number) ?? 52,
    displacement: (inputs.displacement as number) ?? 26,
  };
  return calculateIchimoku(candles, config);
}

// ==================== VOLUME ====================

function calculateOBV(candles: Candle[], _inputs: Record<string, number | string | boolean>): IndicatorResult {
  const obvValues = obv(candles);
  
  return {
    id: 'obv',
    overlay: false,
    lines: [{ name: 'obv', data: buildLineData(candles, obvValues), color: '#2196F3' }],
    histograms: [],
  };
}

function calculateCMF(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const cmfValues = cmf(candles, length);
  
  return {
    id: 'cmf',
    overlay: false,
    lines: [{ name: 'cmf', data: buildLineData(candles, cmfValues), color: '#9C27B0' }],
    histograms: [],
  };
}

function calculateADL(candles: Candle[], _inputs: Record<string, number | string | boolean>): IndicatorResult {
  const adlValues = adl(candles);
  
  return {
    id: 'adl',
    overlay: false,
    lines: [{ name: 'adl', data: buildLineData(candles, adlValues), color: '#FF9800' }],
    histograms: [],
  };
}

function calculateVolumeOscillator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const fastLength = inputs.fastLength as number;
  const slowLength = inputs.slowLength as number;
  const voValues = volumeOscillator(candles, fastLength, slowLength);
  
  return {
    id: 'volume_oscillator',
    overlay: false,
    lines: [],
    histograms: [{ name: 'vol_osc', data: buildHistogramData(candles, voValues, '#26A69A', '#EF5350'), color: '#26A69A' }],
  };
}

function calculateEMV(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const emvValues = emv(candles, length);
  
  return {
    id: 'emv',
    overlay: false,
    lines: [{ name: 'emv', data: buildLineData(candles, emvValues), color: '#795548' }],
    histograms: [],
  };
}

function calculateVolumeSMA(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const volumes = getVolumes(candles);
  const smaValues = sma(volumes, length);

  const volumeData: (HistogramData<Time> | WhitespaceData<Time>)[] = candles.map((c) => ({
    time: c.time,
    value: c.volume,
    color: '#2962FF80',
  }));

  return {
    id: 'vol_sma',
    overlay: false,
    lines: [{ name: 'volSMA', data: buildLineData(candles, smaValues), color: '#FF6D00' }],
    histograms: [{ name: 'volume', data: volumeData, color: '#2962FF80' }],
  };
}

function calculateVWAPIndicator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const stddevPeriod = inputs.stddevBands as number ?? 1;
  return calculateVWAPTA4J(candles, { stddevPeriod });
}

// ==================== TREND ====================

function calculateAroon(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const { up, down, oscillator } = aroon(candles, length);
  
  return {
    id: 'aroon',
    overlay: false,
    lines: [
      { name: 'aroon_up', data: buildLineData(candles, up), color: '#26A69A' },
      { name: 'aroon_down', data: buildLineData(candles, down), color: '#EF5350' },
    ],
    histograms: [{ name: 'oscillator', data: buildHistogramData(candles, oscillator, '#2196F3', '#F44336'), color: '#2196F3' }],
  };
}

function calculateDMI(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const length = inputs.length as number;
  const { plusDI, minusDI } = dmi(candles, length);
  
  return {
    id: 'dmi',
    overlay: false,
    lines: [
      { name: 'plusDI', data: buildLineData(candles, plusDI), color: '#26A69A' },
      { name: 'minusDI', data: buildLineData(candles, minusDI), color: '#EF5350' },
    ],
    histograms: [],
  };
}

// ==================== PIVOT POINTS ====================

function calculatePivotIndicator(
  candles: Candle[],
  inputs: Record<string, number | string | boolean>,
  type: PivotType
): IndicatorResult {
  const useWeekly = inputs.useWeekly as boolean || false;
  const useMonthly = inputs.useMonthly as boolean || false;
  const config: PivotConfig = { type, useWeekly, useMonthly };
  return calculatePivotPoints(candles, config);
}

function calculatePivotStandard(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  return calculatePivotIndicator(candles, inputs, 'standard');
}

function calculatePivotFibonacci(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  return calculatePivotIndicator(candles, inputs, 'fibonacci');
}

function calculatePivotCamarilla(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  return calculatePivotIndicator(candles, inputs, 'camarilla');
}

function calculatePivotWoodie(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  return calculatePivotIndicator(candles, inputs, 'woodie');
}

function calculatePivotDemark(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  return calculatePivotIndicator(candles, inputs, 'demark');
}

// ==================== FIBONACCI ====================

function calculateFibonacciRetracement(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const showLevels = inputs.showLevels as boolean ?? true;
  
  // Find highest high and lowest low in the range
  const highestHigh = Math.max(...candles.map(c => c.high));
  const lowestLow = Math.min(...candles.map(c => c.low));
  const diff = highestHigh - lowestLow;
  
  const levels = {
    level0: highestHigh,
    level236: highestHigh - 0.236 * diff,
    level382: highestHigh - 0.382 * diff,
    level500: highestHigh - 0.5 * diff,
    level618: highestHigh - 0.618 * diff,
    level786: highestHigh - 0.786 * diff,
    level1000: lowestLow,
  };
  
  // Create horizontal lines
  const createHorizontalLine = (value: number) => candles.map(c => ({ time: c.time, value }));
  
  if (!showLevels) {
    return { id: 'fibonacci_retracement', overlay: true, lines: [], histograms: [] };
  }
  
  return {
    id: 'fibonacci_retracement',
    overlay: true,
    lines: [
      { name: 'level0', data: createHorizontalLine(levels.level0), color: '#F44336' },
      { name: 'level236', data: createHorizontalLine(levels.level236), color: '#E91E63' },
      { name: 'level382', data: createHorizontalLine(levels.level382), color: '#9C27B0' },
      { name: 'level500', data: createHorizontalLine(levels.level500), color: '#673AB7' },
      { name: 'level618', data: createHorizontalLine(levels.level618), color: '#3F51B5' },
      { name: 'level786', data: createHorizontalLine(levels.level786), color: '#2196F3' },
      { name: 'level1000', data: createHorizontalLine(levels.level1000), color: '#00BCD4' },
    ],
    histograms: [],
  };
}

function calculateFibonacciExtension(candles: Candle[], _inputs: Record<string, number | string | boolean>): IndicatorResult {
  // Simplified - using last swing
  const highestHigh = Math.max(...candles.slice(-50).map(c => c.high));
  const lowestLow = Math.min(...candles.slice(-50).map(c => c.low));
  const close = candles[candles.length - 1].close;
  const diff = highestHigh - lowestLow;
  
  const levels = {
    level1272: close + 0.272 * diff,
    level1618: close + 0.618 * diff,
    level2000: close + 1.0 * diff,
    level2618: close + 1.618 * diff,
  };
  
  const createHorizontalLine = (value: number) => candles.map(c => ({ time: c.time, value }));
  
  return {
    id: 'fibonacci_extension',
    overlay: true,
    lines: [
      { name: 'level1272', data: createHorizontalLine(levels.level1272), color: '#8BC34A' },
      { name: 'level1618', data: createHorizontalLine(levels.level1618), color: '#CDDC39' },
      { name: 'level2000', data: createHorizontalLine(levels.level2000), color: '#FFEB3B' },
      { name: 'level2618', data: createHorizontalLine(levels.level2618), color: '#FFC107' },
    ],
    histograms: [],
  };
}

function calculateFibonacciLevelsIndicator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const lookback = inputs.lookback as number ?? 100;
  const slice = candles.slice(-lookback);
  
  const highestHigh = Math.max(...slice.map(c => c.high));
  const lowestLow = Math.min(...slice.map(c => c.low));
  const diff = highestHigh - lowestLow;
  
  const levels = {
    level0: highestHigh,
    level236: highestHigh - 0.236 * diff,
    level382: highestHigh - 0.382 * diff,
    level500: highestHigh - 0.5 * diff,
    level618: highestHigh - 0.618 * diff,
    level786: highestHigh - 0.786 * diff,
    level1000: lowestLow,
  };
  
  const createHorizontalLine = (value: number) => candles.map(c => ({ time: c.time, value }));
  
  return {
    id: 'fibonacci_levels',
    overlay: true,
    lines: [
      { name: 'level0', data: createHorizontalLine(levels.level0), color: '#F44336' },
      { name: 'level236', data: createHorizontalLine(levels.level236), color: '#E91E63' },
      { name: 'level382', data: createHorizontalLine(levels.level382), color: '#9C27B0' },
      { name: 'level500', data: createHorizontalLine(levels.level500), color: '#673AB7' },
      { name: 'level618', data: createHorizontalLine(levels.level618), color: '#3F51B5' },
      { name: 'level786', data: createHorizontalLine(levels.level786), color: '#2196F3' },
      { name: 'level1000', data: createHorizontalLine(levels.level1000), color: '#00BCD4' },
    ],
    histograms: [],
  };
}

// ==================== TRANSFORMS ====================

function calculateHeikinAshiCalc(candles: Candle[], _inputs: Record<string, number | string | boolean>): IndicatorResult {
  return calculateHeikinAshi(candles);
}

function calculateRenkoCalc(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  return calculateRenko(candles, {
    brickSize: (inputs.brickSize as number) ?? 0,
    useATR: (inputs.useAtr as boolean) ?? true,
    atrPeriod: (inputs.atrPeriod as number) ?? 14,
  });
}

// ==================== FRACTALS ====================

function calculateFractalsIndicator(candles: Candle[], inputs: Record<string, number | string | boolean>): IndicatorResult {
  const config: Partial<FractalsConfig> = {
    period: (inputs.period as number) ?? 2,
    showBullish: (inputs.showBullish as boolean) ?? true,
    showBearish: (inputs.showBearish as boolean) ?? true,
  };
  return calculateFractals(candles, config);
}

// ============================================================================
// MAIN CALCULATOR REGISTRY
// ============================================================================

const indicatorCalculators: Record<string, (
  candles: Candle[],
  inputs: Record<string, number | string | boolean>
) => IndicatorResult> = {
  // Moving Averages
  sma: calculateSMA,
  ema: calculateEMA,
  wma: calculateWMA,
  hma: calculateHMA,
  vwma: calculateVWMA,
  smma: calculateSMMA,
  dema: calculateDEMA,
  tema: calculateTEMA,
  kama: calculateKAMA,
  vidya: calculateVIDYA,
  mcginley: calculateMcGinley,
  ema_cross: calculateEMACross,
  vwap: calculateVWAPIndicator,
  rolling_vwap: calculateRollingVWAP,
  
  // Oscillators
  rsi: calculateRSI,
  macd: calculateMACD,
  ppo: calculatePPO,
  stochastic: calculateStochasticIndicator,
  stochrsi: calculateStochRSI,
  williams_r: calculateWilliamsR,
  cci: calculateCCI,
  mfi: calculateMFI,
  mfi_volume: calculateMFI,
  roc: calculateROC,
  momentum: calculateMomentum,
  cmo: calculateCMO,
  ultimate_oscillator: calculateUltimateOscillator,
  awesome_oscillator: calculateAO,
  tsi: calculateTSI,
  vortex: calculateVortexIndicator,
  vortex_trend: calculateVortexIndicator,
  mass_index: calculateMassIndexTA4J,
  adx: calculateADXIndicator,
  adx_trend: calculateADXIndicator,
  
  // Volatility
  bb: calculateBB,
  bb_width: calculateBBWidth,
  atr: calculateATR,
  natr: calculateNATR,
  true_range: calculateTrueRange,
  keltner_channel: calculateKeltnerChannelCalc,
  donchian_channel: calculateDonchianChannel,
  stddev: calculateStdDev,
  historical_volatility: calculateHistoricalVolatility,
  supertrend: calculateSuperTrendIndicator,
  supertrend_trend: calculateSuperTrendIndicator,
  parabolic_sar: calculateParabolicSAR,
  sar_trend: calculateParabolicSAR,
  ichimoku: calculateIchimokuIndicator,
  ichimoku_trend: calculateIchimokuIndicator,
  
  // Volume
  obv: calculateOBV,
  cmf: calculateCMF,
  adl: calculateADL,
  volume_oscillator: calculateVolumeOscillator,
  emv: calculateEMV,
  vol_sma: calculateVolumeSMA,
  vwap_volume: calculateVWAPIndicator,
  rolling_vwap_vol: calculateRollingVWAP,
  
  // Trend
  dmi: calculateDMI,
  kama_trend: calculateKAMA,
  
  // Pivot Points
  pivot_standard: calculatePivotStandard,
  pivot_fibonacci: calculatePivotFibonacci,
  pivot_camarilla: calculatePivotCamarilla,
  pivot_woodie: calculatePivotWoodie,
  pivot_demark: calculatePivotDemark,
  
  // Fibonacci
  fibonacci_retracement: calculateFibonacciRetracement,
  fibonacci_extension: calculateFibonacciExtension,
  fibonacci_levels: calculateFibonacciLevelsIndicator,
  
  // Transforms
  heikin_ashi: calculateHeikinAshiCalc,
  renko: calculateRenkoCalc,
  
  // Fractals
  fractals: calculateFractalsIndicator,
};

export function calculateIndicator(
  indicator: BuiltInIndicator,
  candles: Candle[],
  inputs: Record<string, number | string | boolean>
): IndicatorResult | null {
  const calculator = indicatorCalculators[indicator.id];
  
  if (!calculator) {
    console.warn(`No calculator implemented for indicator: ${indicator.id}`);
    return null;
  }
  
  return calculator(candles, inputs);
}

export function isOverlayIndicator(indicator: BuiltInIndicator): boolean {
  return indicator.overlay;
}

export function getAvailableIndicators(): string[] {
  return Object.keys(indicatorCalculators);
}
