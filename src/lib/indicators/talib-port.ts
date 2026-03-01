/**
 * TA-Lib TypeScript Port for Browser
 * 
 * Ported from: https://github.com/TA-Lib/ta-lib
 * Original License: BSD-3-Clause
 * 
 * This is a TypeScript port of key TA-Lib functions for browser compatibility.
 * Not all 200+ functions are ported - only the most commonly used ones.
 * 
 * Reference: https://ta-lib.org/functions/
 */

// ==================== TYPES ====================

export interface OHLC {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
}

export interface OHLCV extends OHLC {
  volume: number[];
}

export interface MAInput {
  inReal: number[];
  period: number;
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export interface MAMAResult {
  mama: number[];
  fama: number[];
}

export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export interface StochasticResult {
  slowK: number[];
  slowD: number[];
}

export interface AroonResult {
  aroonDown: number[];
  aroonUp: number[];
}

export interface LinearRegResult {
  linearReg: number[];
  slope: number[];
  intercept: number[];
  angle: number[];
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Fill array with NaN for warm-up period
 */
function fillNaN(length: number, startIndex: number): number[] {
  return Array(Math.max(0, startIndex)).fill(NaN);
}

/**
 * Simple Moving Average calculation
 */
function sma(data: number[], period: number, startIndex: number = period - 1): number[] {
  const result: number[] = fillNaN(data.length, startIndex);
  
  for (let i = startIndex; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j];
    }
    result.push(sum / period);
  }
  
  return result;
}

/**
 * Exponential Moving Average calculation
 */
function ema(data: number[], period: number): number[] {
  const result: number[] = fillNaN(data.length, period - 1);
  const k = 2 / (period + 1);
  
  // First EMA value is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  let prevEMA = sum / period;
  result.push(prevEMA);
  
  // Calculate EMA
  for (let i = period; i < data.length; i++) {
    prevEMA = (data[i] * k) + (prevEMA * (1 - k));
    result.push(prevEMA);
  }
  
  return result;
}

/**
 * Weighted Moving Average
 */
function wma(data: number[], period: number): number[] {
  const result: number[] = fillNaN(data.length, period - 1);
  const weightSum = (period * (period + 1)) / 2;
  
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - period + 1 + j] * (j + 1);
    }
    result.push(sum / weightSum);
  }
  
  return result;
}

/**
 * Sum over period
 */
function sum(data: number[], period: number): number[] {
  const result: number[] = fillNaN(data.length, period - 1);
  
  let runningSum = 0;
  for (let i = 0; i < data.length; i++) {
    runningSum += data[i];
    if (i >= period) {
      runningSum -= data[i - period];
    }
    if (i >= period - 1) {
      result.push(runningSum);
    }
  }
  
  return result;
}

/**
 * Standard Deviation
 */
function stdDev(data: number[], period: number): number[] {
  const result: number[] = fillNaN(data.length, period - 1);
  const meanValues = sma(data, period, period - 1);
  
  for (let i = period - 1; i < data.length; i++) {
    let sumSqDiff = 0;
    const mean = meanValues[i - period + 1];
    for (let j = i - period + 1; j <= i; j++) {
      sumSqDiff += Math.pow(data[j] - mean, 2);
    }
    result.push(Math.sqrt(sumSqDiff / period));
  }
  
  return result;
}

/**
 * Highest value over period
 */
function max(data: number[], period: number): number[] {
  const result: number[] = fillNaN(data.length, period - 1);
  
  for (let i = period - 1; i < data.length; i++) {
    let maxVal = data[i - period + 1];
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] > maxVal) maxVal = data[j];
    }
    result.push(maxVal);
  }
  
  return result;
}

/**
 * Lowest value over period
 */
function min(data: number[], period: number): number[] {
  const result: number[] = fillNaN(data.length, period - 1);
  
  for (let i = period - 1; i < data.length; i++) {
    let minVal = data[i - period + 1];
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] < minVal) minVal = data[j];
    }
    result.push(minVal);
  }
  
  return result;
}

/**
 * Index of highest value
 */
function maxIndex(data: number[], period: number): number[] {
  const result: number[] = fillNaN(data.length, period - 1);
  
  for (let i = period - 1; i < data.length; i++) {
    let maxVal = data[i - period + 1];
    let maxIdx = i - period + 1;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] > maxVal) {
        maxVal = data[j];
        maxIdx = j;
      }
    }
    result.push(maxIdx);
  }
  
  return result;
}

/**
 * Index of lowest value
 */
function minIndex(data: number[], period: number): number[] {
  const result: number[] = fillNaN(data.length, period - 1);
  
  for (let i = period - 1; i < data.length; i++) {
    let minVal = data[i - period + 1];
    let minIdx = i - period + 1;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j] < minVal) {
        minVal = data[j];
        minIdx = j;
      }
    }
    result.push(minIdx);
  }
  
  return result;
}

// ==================== OVERLAP STUDIES ====================

/**
 * Double Exponential Moving Average (DEMA)
 * DEMA = 2 * EMA - EMA(EMA)
 */
export function DEMA(inReal: number[], period: number = 30): number[] {
  const ema1 = ema(inReal, period);
  const ema2 = ema(ema1.filter(v => !isNaN(v)), period);
  
  const result: number[] = fillNaN(inReal.length, (period - 1) * 2);
  
  let ema2Idx = 0;
  for (let i = (period - 1) * 2; i < inReal.length; i++) {
    const ema1Val = ema1[i];
    const ema2Val = ema2[ema2Idx++];
    result.push(2 * ema1Val - ema2Val);
  }
  
  return result;
}

/**
 * Triple Exponential Moving Average (TEMA)
 * TEMA = 3 * EMA - 3 * EMA(EMA) + EMA(EMA(EMA))
 */
export function TEMA(inReal: number[], period: number = 30): number[] {
  const ema1 = ema(inReal, period);
  const ema1Clean = ema1.filter(v => !isNaN(v));
  const ema2 = ema(ema1Clean, period);
  const ema2Clean = ema2.filter(v => !isNaN(v));
  const ema3 = ema(ema2Clean, period);
  
  const warmup = (period - 1) * 3;
  const result: number[] = fillNaN(inReal.length, warmup);
  
  let ema2Idx = 0;
  let ema3Idx = 0;
  for (let i = warmup; i < inReal.length; i++) {
    const e1 = ema1[i];
    const e2Idx = i - (period - 1);
    const e2 = ema2[e2Idx >= 0 && e2Idx < ema2.length ? e2Idx : ema2Idx++];
    const e3 = ema3[ema3Idx++];
    result.push(3 * e1 - 3 * e2 + e3);
  }
  
  return result;
}

/**
 * Triangular Moving Average (TRIMA)
 */
export function TRIMA(inReal: number[], period: number = 30): number[] {
  const n = Math.floor((period + 1) / 2);
  const sma1 = sma(inReal, n, n - 1);
  return sma(sma1.filter(v => !isNaN(v)), n, n - 1);
}

/**
 * Weighted Moving Average (WMA)
 */
export function WMA(inReal: number[], period: number = 30): number[] {
  return wma(inReal, period);
}

/**
 * Kaufman Adaptive Moving Average (KAMA)
 * Adapts to market volatility
 */
export function KAMA(inReal: number[], period: number = 10, fastPeriod: number = 2, slowPeriod: number = 30): number[] {
  const result: number[] = fillNaN(inReal.length, period);
  
  const fastSC = 2 / (fastPeriod + 1);
  const slowSC = 2 / (slowPeriod + 1);
  
  // First KAMA is the price
  let prevKAMA = inReal[period - 1];
  result.push(prevKAMA);
  
  for (let i = period; i < inReal.length; i++) {
    // Direction = Price - Price n periods ago
    const direction = inReal[i] - inReal[i - period];
    
    // Volatility = Sum of |Price - PrevPrice| over n periods
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) {
      volatility += Math.abs(inReal[j] - inReal[j - 1]);
    }
    
    // Efficiency Ratio
    const er = volatility !== 0 ? direction / volatility : 0;
    
    // Smoothing Constant
    const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
    
    // KAMA
    prevKAMA = prevKAMA + sc * (inReal[i] - prevKAMA);
    result.push(prevKAMA);
  }
  
  return result;
}

/**
 * MESA Adaptive Moving Average (MAMA)
 * Uses Hilbert Transform for cycle detection
 */
export function MAMA(inReal: number[], fastLimit: number = 0.5, slowLimit: number = 0.05): MAMAResult {
  const mama: number[] = [];
  const fama: number[] = [];
  
  // Initialize
  let price = 0;
  let smoothPeriod = 0;
  let detrender = 0;
  let q1 = 0;
  let i1 = 0;
  let jI = 0;
  let jQ = 0;
  let i2 = 0;
  let q2 = 0;
  let re = 0;
  let im = 0;
  let period = 0;
  let smooth = 0;
  let prevMAMA = inReal[0];
  let prevFAMA = inReal[0];
  
  for (let i = 0; i < inReal.length; i++) {
    price = inReal[i];
    
    if (i >= 6) {
      // Detrender
      detrender = (0.0962 * inReal[i] + 0.5769 * inReal[i - 2] - 0.5769 * inReal[i - 4] - 0.0962 * inReal[i - 6]) * (0.075 * period + 0.54);
      
      // Quadrature and InPhase components
      q1 = (0.0962 * inReal[i] + 0.5769 * inReal[i - 2] - 0.5769 * inReal[i - 4] - 0.0962 * inReal[i - 6]) * (0.075 * period + 0.54);
      i1 = inReal[i - 3];
      
      // Advance phase
      jI = (0.0962 * i1 + 0.5769 * inReal[i - 5] - 0.5769 * inReal[i - 7] - 0.0962 * inReal[i - 9]) * (0.075 * period + 0.54);
      jQ = (0.0962 * q1 + 0.5769 * inReal[i - 4] - 0.5769 * inReal[i - 6] - 0.0962 * inReal[i - 8]) * (0.075 * period + 0.54);
      
      // Phasor addition
      i2 = i1 - jQ;
      q2 = q1 + jI;
      i2 = 0.2 * i2 + 0.8 * (i2 || 0);
      q2 = 0.2 * q2 + 0.8 * (q2 || 0);
      
      // Period calculation
      re = 0.2 * i2 * i2 + 0.8 * (re || 0);
      im = 0.2 * i2 * q2 + 0.8 * (im || 0);
      
      if (im !== 0 && re !== 0) {
        period = 360 / (Math.atan(im / re) * 180 / Math.PI);
      }
      
      // Smooth period
      smoothPeriod = 0.2 * period + 0.8 * (smoothPeriod || period);
      
      // Adaptive alpha
      let alpha = fastLimit / slowLimit;
      if (smoothPeriod !== 0) {
        alpha = fastLimit / (slowLimit + smoothPeriod);
      }
      alpha = Math.min(Math.max(alpha, slowLimit), fastLimit);
      
      // MAMA and FAMA
      prevMAMA = alpha * price + (1 - alpha) * prevMAMA;
      prevFAMA = 0.5 * alpha * prevMAMA + (1 - 0.5 * alpha) * prevFAMA;
    }
    
    mama.push(prevMAMA);
    fama.push(prevFAMA);
  }
  
  return { mama, fama };
}

/**
 * Triple Exponential Moving Average T3 (TILLSON T3)
 */
export function T3(inReal: number[], period: number = 5, vFactor: number = 0.7): number[] {
  const k = 2 / (period + 1);
  const t3Factor = vFactor;
  
  // GD = EMA(EMA(EMA(x, n), n), n)
  // T3 = GD(GD(GD(x)))
  
  const ema1 = ema(inReal, period);
  const ema2 = ema(ema1.filter(v => !isNaN(v)), period);
  const ema3 = ema(ema2, period);
  const ema4 = ema(ema3, period);
  const ema5 = ema(ema4, period);
  const ema6 = ema(ema5, period);
  
  const result: number[] = fillNaN(inReal.length, (period - 1) * 6);
  
  const c1 = -t3Factor * t3Factor * t3Factor;
  const c2 = 3 * t3Factor * t3Factor + 3 * t3Factor * t3Factor * t3Factor;
  const c3 = -6 * t3Factor * t3Factor - 3 * t3Factor - 3 * t3Factor * t3Factor * t3Factor;
  const c4 = 1 + 3 * t3Factor + t3Factor * t3Factor * t3Factor + 3 * t3Factor * t3Factor;
  
  let idx6 = 0;
  for (let i = (period - 1) * 6; i < inReal.length && idx6 < ema6.length; i++) {
    const e1 = ema1[i];
    const e2Idx = i - (period - 1);
    const e2 = ema2[e2Idx >= 0 && e2Idx < ema2.length ? e2Idx : 0];
    const e3Idx = e2Idx - (period - 1);
    const e3 = ema3[e3Idx >= 0 && e3Idx < ema3.length ? e3Idx : 0];
    const e4Idx = e3Idx - (period - 1);
    const e4 = ema4[e4Idx >= 0 && e4Idx < ema4.length ? e4Idx : 0];
    const e5Idx = e4Idx - (period - 1);
    const e5 = ema5[e5Idx >= 0 && e5Idx < ema5.length ? e5Idx : 0];
    const e6 = ema6[idx6++];
    
    result.push(c1 * e6 + c2 * e5 + c3 * e4 + c4 * e3);
  }
  
  return result;
}

// ==================== MOMENTUM INDICATORS ====================

/**
 * Momentum
 * MOM = Price - Price n periods ago
 */
export function MOM(inReal: number[], period: number = 10): number[] {
  const result: number[] = fillNaN(inReal.length, period);
  
  for (let i = period; i < inReal.length; i++) {
    result.push(inReal[i] - inReal[i - period]);
  }
  
  return result;
}

/**
 * Rate of Change
 * ROC = ((Price / Price n periods ago) - 1) * 100
 */
export function ROC(inReal: number[], period: number = 10): number[] {
  const result: number[] = fillNaN(inReal.length, period);
  
  for (let i = period; i < inReal.length; i++) {
    result.push(((inReal[i] / inReal[i - period]) - 1) * 100);
  }
  
  return result;
}

/**
 * Rate of Change Percentage
 * ROCP = (Price - Price n periods ago) / Price n periods ago
 */
export function ROCP(inReal: number[], period: number = 10): number[] {
  const result: number[] = fillNaN(inReal.length, period);
  
  for (let i = period; i < inReal.length; i++) {
    const prevPrice = inReal[i - period];
    result.push(prevPrice !== 0 ? (inReal[i] - prevPrice) / prevPrice : 0);
  }
  
  return result;
}

/**
 * Rate of Change Ratio
 * ROCR = Price / Price n periods ago
 */
export function ROCR(inReal: number[], period: number = 10): number[] {
  const result: number[] = fillNaN(inReal.length, period);
  
  for (let i = period; i < inReal.length; i++) {
    const prevPrice = inReal[i - period];
    result.push(prevPrice !== 0 ? inReal[i] / prevPrice : 1);
  }
  
  return result;
}

/**
 * Rate of Change Ratio 100 scale
 * ROCR100 = (Price / Price n periods ago) * 100
 */
export function ROCR100(inReal: number[], period: number = 10): number[] {
  const result: number[] = fillNaN(inReal.length, period);
  
  for (let i = period; i < inReal.length; i++) {
    const prevPrice = inReal[i - period];
    result.push(prevPrice !== 0 ? (inReal[i] / prevPrice) * 100 : 100);
  }
  
  return result;
}

/**
 * Chande Momentum Oscillator (CMO)
 * CMO = 100 * (SumUp - SumDown) / (SumUp + SumDown)
 */
export function CMO(inReal: number[], period: number = 14): number[] {
  const result: number[] = fillNaN(inReal.length, period);
  
  for (let i = period; i < inReal.length; i++) {
    let sumUp = 0;
    let sumDown = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const diff = inReal[j] - inReal[j - 1];
      if (diff > 0) {
        sumUp += diff;
      } else {
        sumDown += Math.abs(diff);
      }
    }
    
    const total = sumUp + sumDown;
    result.push(total !== 0 ? 100 * (sumUp - sumDown) / total : 0);
  }
  
  return result;
}

/**
 * Williams %R
 * %R = (Highest High - Close) / (Highest High - Lowest Low) * -100
 */
export function WILLR(high: number[], low: number[], close: number[], period: number = 14): number[] {
  const result: number[] = fillNaN(close.length, period - 1);
  const highestHigh = max(high, period);
  const lowestLow = min(low, period);
  
  let hhIdx = 0;
  let llIdx = 0;
  
  for (let i = period - 1; i < close.length; i++) {
    const hh = highestHigh[hhIdx++];
    const ll = lowestLow[llIdx++];
    const range = hh - ll;
    
    result.push(range !== 0 ? ((hh - close[i]) / range) * -100 : 0);
  }
  
  return result;
}

/**
 * Money Flow Index (MFI)
 * Uses price and volume to measure buying and selling pressure
 */
export function MFI(high: number[], low: number[], close: number[], volume: number[], period: number = 14): number[] {
  const result: number[] = fillNaN(close.length, period);
  
  // Calculate typical price
  const typicalPrice: number[] = [];
  for (let i = 0; i < close.length; i++) {
    typicalPrice.push((high[i] + low[i] + close[i]) / 3);
  }
  
  // Calculate money flow
  const rawMoneyFlow: number[] = [];
  for (let i = 0; i < typicalPrice.length; i++) {
    rawMoneyFlow.push(typicalPrice[i] * volume[i]);
  }
  
  for (let i = period; i < close.length; i++) {
    let positiveFlow = 0;
    let negativeFlow = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (typicalPrice[j] > typicalPrice[j - 1]) {
        positiveFlow += rawMoneyFlow[j];
      } else {
        negativeFlow += rawMoneyFlow[j];
      }
    }
    
    const moneyRatio = negativeFlow !== 0 ? positiveFlow / negativeFlow : 0;
    result.push(100 - (100 / (1 + moneyRatio)));
  }
  
  return result;
}

/**
 * Ultimate Oscillator
 * Combines 3 timeframes to reduce false signals
 */
export function ULTOSC(high: number[], low: number[], close: number[], period1: number = 7, period2: number = 14, period3: number = 28): number[] {
  const result: number[] = fillNaN(close.length, period3);
  
  // Calculate Buying Pressure
  const bp: number[] = [];
  for (let i = 0; i < close.length; i++) {
    const prevClose = i > 0 ? close[i - 1] : close[i];
    const trueLow = Math.min(low[i], prevClose);
    bp.push(close[i] - trueLow);
  }
  
  // Calculate True Range
  const tr: number[] = [];
  for (let i = 0; i < close.length; i++) {
    const prevClose = i > 0 ? close[i - 1] : close[i];
    tr.push(Math.max(high[i] - low[i], Math.abs(high[i] - prevClose), Math.abs(low[i] - prevClose)));
  }
  
  for (let i = period3; i < close.length; i++) {
    // Sum BP and TR for each period
    let sumBP1 = 0, sumTR1 = 0;
    let sumBP2 = 0, sumTR2 = 0;
    let sumBP3 = 0, sumTR3 = 0;
    
    for (let j = i - period1 + 1; j <= i; j++) {
      sumBP1 += bp[j];
      sumTR1 += tr[j];
    }
    
    for (let j = i - period2 + 1; j <= i; j++) {
      sumBP2 += bp[j];
      sumTR2 += tr[j];
    }
    
    for (let j = i - period3 + 1; j <= i; j++) {
      sumBP3 += bp[j];
      sumTR3 += tr[j];
    }
    
    const avg1 = sumTR1 !== 0 ? sumBP1 / sumTR1 : 0;
    const avg2 = sumTR2 !== 0 ? sumBP2 / sumTR2 : 0;
    const avg3 = sumTR3 !== 0 ? sumBP3 / sumTR3 : 0;
    
    result.push(100 * ((4 * avg1 + 2 * avg2 + avg3) / 7));
  }
  
  return result;
}

/**
 * Absolute Price Oscillator (APO)
 * APO = FastEMA - SlowEMA
 */
export function APO(inReal: number[], fastPeriod: number = 12, slowPeriod: number = 26): number[] {
  const fastEMA = ema(inReal, fastPeriod);
  const slowEMA = ema(inReal, slowPeriod);
  
  const result: number[] = fillNaN(inReal.length, slowPeriod - 1);
  
  for (let i = slowPeriod - 1; i < inReal.length; i++) {
    result.push(fastEMA[i] - slowEMA[i]);
  }
  
  return result;
}

/**
 * Percentage Price Oscillator (PPO)
 * PPO = ((FastEMA - SlowEMA) / SlowEMA) * 100
 */
export function PPO(inReal: number[], fastPeriod: number = 12, slowPeriod: number = 26): number[] {
  const fastEMA = ema(inReal, fastPeriod);
  const slowEMA = ema(inReal, slowPeriod);
  
  const result: number[] = fillNaN(inReal.length, slowPeriod - 1);
  
  for (let i = slowPeriod - 1; i < inReal.length; i++) {
    result.push(slowEMA[i] !== 0 ? ((fastEMA[i] - slowEMA[i]) / slowEMA[i]) * 100 : 0);
  }
  
  return result;
}

// ==================== VOLUME INDICATORS ====================

/**
 * On Balance Volume (OBV)
 * Cumulative volume based on price direction
 */
export function OBV(close: number[], volume: number[]): number[] {
  const result: number[] = [volume[0]];
  
  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) {
      result.push(result[i - 1] + volume[i]);
    } else if (close[i] < close[i - 1]) {
      result.push(result[i - 1] - volume[i]);
    } else {
      result.push(result[i - 1]);
    }
  }
  
  return result;
}

/**
 * Chaikin A/D Line
 * Accumulation/Distribution based on price position in range
 */
export function AD(high: number[], low: number[], close: number[], volume: number[]): number[] {
  const result: number[] = [];
  let runningAD = 0;
  
  for (let i = 0; i < close.length; i++) {
    const range = high[i] - low[i];
    const mf = range !== 0 ? ((close[i] - low[i]) - (high[i] - close[i])) / range : 0;
    runningAD += mf * volume[i];
    result.push(runningAD);
  }
  
  return result;
}

/**
 * Chaikin A/D Oscillator
 * ADOSC = EMA(AD, fast) - EMA(AD, slow)
 */
export function ADOSC(high: number[], low: number[], close: number[], volume: number[], fastPeriod: number = 3, slowPeriod: number = 10): number[] {
  const ad = AD(high, low, close, volume);
  const fastEMA = ema(ad, fastPeriod);
  const slowEMA = ema(ad, slowPeriod);
  
  const result: number[] = fillNaN(close.length, slowPeriod - 1);
  
  for (let i = slowPeriod - 1; i < close.length; i++) {
    result.push(fastEMA[i] - slowEMA[i]);
  }
  
  return result;
}

// ==================== VOLATILITY INDICATORS ====================

/**
 * Normalized Average True Range (NATR)
 * NATR = (ATR / Close) * 100
 */
export function NATR(high: number[], low: number[], close: number[], period: number = 14): number[] {
  const atrValues = ATR(high, low, close, period);
  
  const result: number[] = fillNaN(close.length, period);
  
  for (let i = period; i < close.length; i++) {
    result.push(close[i] !== 0 ? (atrValues[i - period + 1] / close[i]) * 100 : 0);
  }
  
  return result;
}

/**
 * Average True Range (ATR)
 */
export function ATR(high: number[], low: number[], close: number[], period: number = 14): number[] {
  const trueRange: number[] = [];
  
  for (let i = 0; i < close.length; i++) {
    const prevClose = i > 0 ? close[i - 1] : close[i];
    const tr = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - prevClose),
      Math.abs(low[i] - prevClose)
    );
    trueRange.push(tr);
  }
  
  return sma(trueRange, period, period - 1);
}

/**
 * True Range
 */
export function TRANGE(high: number[], low: number[], close: number[]): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < close.length; i++) {
    const prevClose = i > 0 ? close[i - 1] : close[i];
    result.push(Math.max(
      high[i] - low[i],
      Math.abs(high[i] - prevClose),
      Math.abs(low[i] - prevClose)
    ));
  }
  
  return result;
}

// ==================== TREND INDICATORS ====================

/**
 * Parabolic SAR
 */
export function SAR(high: number[], low: number[], acceleration: number = 0.02, maximum: number = 0.2): number[] {
  const result: number[] = [];
  
  let isLong = true;
  let ep = low[0];
  let sar = high[0];
  let af = acceleration;
  
  result.push(sar);
  
  for (let i = 1; i < high.length; i++) {
    // Update SAR
    sar = sar + af * (ep - sar);
    
    // Constrain SAR
    if (isLong) {
      sar = Math.min(sar, low[i - 1], i > 1 ? low[i - 2] : low[i - 1]);
    } else {
      sar = Math.max(sar, high[i - 1], i > 1 ? high[i - 2] : high[i - 1]);
    }
    
    // Check for reversal
    if (isLong) {
      if (low[i] < sar) {
        isLong = false;
        sar = ep;
        ep = low[i];
        af = acceleration;
        sar = Math.max(sar, high[i], high[i - 1]);
      } else {
        if (high[i] > ep) {
          ep = high[i];
          af = Math.min(af + acceleration, maximum);
        }
      }
    } else {
      if (high[i] > sar) {
        isLong = true;
        sar = ep;
        ep = high[i];
        af = acceleration;
        sar = Math.min(sar, low[i], low[i - 1]);
      } else {
        if (low[i] < ep) {
          ep = low[i];
          af = Math.min(af + acceleration, maximum);
        }
      }
    }
    
    result.push(sar);
  }
  
  return result;
}

/**
 * Aroon
 */
export function AROON(high: number[], low: number[], period: number = 14): AroonResult {
  const aroonDown: number[] = fillNaN(high.length, period);
  const aroonUp: number[] = fillNaN(high.length, period);
  
  for (let i = period; i < high.length; i++) {
    const windowHigh = high.slice(i - period, i + 1);
    const windowLow = low.slice(i - period, i + 1);
    
    // Find index of highest and lowest
    let highestIdx = 0;
    let lowestIdx = 0;
    for (let j = 1; j < windowHigh.length; j++) {
      if (windowHigh[j] >= windowHigh[highestIdx]) highestIdx = j;
      if (windowLow[j] <= windowLow[lowestIdx]) lowestIdx = j;
    }
    
    aroonUp.push((highestIdx / period) * 100);
    aroonDown.push((lowestIdx / period) * 100);
  }
  
  return { aroonDown, aroonUp };
}

/**
 * Aroon Oscillator
 */
export function AROONOSC(high: number[], low: number[], period: number = 14): number[] {
  const { aroonDown, aroonUp } = AROON(high, low, period);
  
  const result: number[] = [];
  for (let i = 0; i < aroonUp.length; i++) {
    result.push(aroonUp[i] - aroonDown[i]);
  }
  
  return result;
}

/**
 * Average Directional Movement Index Rating (ADXR)
 */
export function ADXR(high: number[], low: number[], close: number[], period: number = 14): number[] {
  const adxValues = ADX(high, low, close, period);
  
  const result: number[] = fillNaN(close.length, period * 2 - 1);
  
  for (let i = period; i < adxValues.length; i++) {
    result.push((adxValues[i] + adxValues[i - period]) / 2);
  }
  
  return result;
}

/**
 * Average Directional Movement Index (ADX)
 */
export function ADX(high: number[], low: number[], close: number[], period: number = 14): number[] {
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [];
  
  for (let i = 1; i < high.length; i++) {
    const upMove = high[i] - high[i - 1];
    const downMove = low[i - 1] - low[i];
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    
    const prevClose = close[i - 1];
    tr.push(Math.max(
      high[i] - low[i],
      Math.abs(high[i] - prevClose),
      Math.abs(low[i] - prevClose)
    ));
  }
  tr.push(tr[tr.length - 1]); // Add one more to match length
  
  // Smooth DM and TR
  const smoothedPlusDM = ema(plusDM, period);
  const smoothedMinusDM = ema(minusDM, period);
  const smoothedTR = ema(tr, period);
  
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];
  
  for (let i = 0; i < high.length; i++) {
    plusDI.push(smoothedTR[i] !== 0 ? (smoothedPlusDM[i] / smoothedTR[i]) * 100 : 0);
    minusDI.push(smoothedTR[i] !== 0 ? (smoothedMinusDM[i] / smoothedTR[i]) * 100 : 0);
    
    const diSum = plusDI[i] + minusDI[i];
    dx.push(diSum !== 0 ? (Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100 : 0);
  }
  
  return ema(dx, period);
}

// ==================== PRICE TRANSFORM ====================

/**
 * Average Price
 */
export function AVGPRICE(open: number[], high: number[], low: number[], close: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < close.length; i++) {
    result.push((open[i] + high[i] + low[i] + close[i]) / 4);
  }
  return result;
}

/**
 * Median Price
 */
export function MEDPRICE(high: number[], low: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < high.length; i++) {
    result.push((high[i] + low[i]) / 2);
  }
  return result;
}

/**
 * Typical Price
 */
export function TYPPRICE(high: number[], low: number[], close: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < close.length; i++) {
    result.push((high[i] + low[i] + close[i]) / 3);
  }
  return result;
}

/**
 * Weighted Close Price
 */
export function WCLPRICE(high: number[], low: number[], close: number[]): number[] {
  const result: number[] = [];
  for (let i = 0; i < close.length; i++) {
    result.push((high[i] + low[i] + 2 * close[i]) / 4);
  }
  return result;
}

// ==================== STATISTIC FUNCTIONS ====================

/**
 * Pearson's Correlation Coefficient (r)
 */
export function CORREL(x: number[], y: number[], period: number): number[] {
  const result: number[] = fillNaN(x.length, period - 1);
  
  for (let i = period - 1; i < x.length; i++) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      sumX += x[j];
      sumY += y[j];
      sumXY += x[j] * y[j];
      sumX2 += x[j] * x[j];
      sumY2 += y[j] * y[j];
    }
    
    const n = period;
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    result.push(denominator !== 0 ? numerator / denominator : 0);
  }
  
  return result;
}

/**
 * Beta Coefficient
 */
export function BETA(market: number[], asset: number[], period: number): number[] {
  const result: number[] = fillNaN(market.length, period - 1);
  
  for (let i = period - 1; i < market.length; i++) {
    let sumMarket = 0, sumAsset = 0, sumMarketAsset = 0, sumMarket2 = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      sumMarket += market[j];
      sumAsset += asset[j];
      sumMarketAsset += market[j] * asset[j];
      sumMarket2 += market[j] * market[j];
    }
    
    const n = period;
    const numerator = n * sumMarketAsset - sumMarket * sumAsset;
    const denominator = n * sumMarket2 - sumMarket * sumMarket;
    
    result.push(denominator !== 0 ? numerator / denominator : 0);
  }
  
  return result;
}

/**
 * Linear Regression
 */
export function LINEARREG(inReal: number[], period: number): number[] {
  const result: number[] = fillNaN(inReal.length, period - 1);
  
  for (let i = period - 1; i < inReal.length; i++) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let j = 0; j < period; j++) {
      const x = j;
      const y = inReal[i - period + 1 + j];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    
    const n = period;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predicted value at the end of period
    result.push(intercept + slope * (period - 1));
  }
  
  return result;
}

/**
 * Linear Regression Slope
 */
export function LINEARREG_SLOPE(inReal: number[], period: number): number[] {
  const result: number[] = fillNaN(inReal.length, period - 1);
  
  for (let i = period - 1; i < inReal.length; i++) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let j = 0; j < period; j++) {
      const x = j;
      const y = inReal[i - period + 1 + j];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    
    const n = period;
    result.push((n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX));
  }
  
  return result;
}

/**
 * Linear Regression Intercept
 */
export function LINEARREG_INTERCEPT(inReal: number[], period: number): number[] {
  const result: number[] = fillNaN(inReal.length, period - 1);
  
  for (let i = period - 1; i < inReal.length; i++) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (let j = 0; j < period; j++) {
      const x = j;
      const y = inReal[i - period + 1 + j];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }
    
    const n = period;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    result.push((sumY - slope * sumX) / n);
  }
  
  return result;
}

/**
 * Linear Regression Angle (in degrees)
 */
export function LINEARREG_ANGLE(inReal: number[], period: number): number[] {
  const slopes = LINEARREG_SLOPE(inReal, period);
  
  return slopes.map(slope => Math.atan(slope) * 180 / Math.PI);
}

/**
 * Standard Deviation
 */
export function STDDEV(inReal: number[], period: number, nbDev: number = 1): number[] {
  return stdDev(inReal, period).map(v => v * nbDev);
}

/**
 * Variance
 */
export function VAR(inReal: number[], period: number): number[] {
  const result: number[] = fillNaN(inReal.length, period - 1);
  const meanValues = sma(inReal, period, period - 1);
  
  for (let i = period - 1; i < inReal.length; i++) {
    let sumSqDiff = 0;
    const mean = meanValues[i - period + 1];
    for (let j = i - period + 1; j <= i; j++) {
      sumSqDiff += Math.pow(inReal[j] - mean, 2);
    }
    result.push(sumSqDiff / period);
  }
  
  return result;
}

// ==================== CYCLE INDICATORS ====================

/**
 * Hilbert Transform - Dominant Cycle Period
 */
export function HT_DCPERIOD(inReal: number[]): number[] {
  const result: number[] = [];
  
  let smoothPeriod = 0;
  let detrender = 0;
  let q1 = 0;
  let i1 = 0;
  let jI = 0;
  let jQ = 0;
  let i2 = 0;
  let q2 = 0;
  let re = 0;
  let im = 0;
  let period = 0;
  
  for (let i = 0; i < inReal.length; i++) {
    if (i >= 6) {
      detrender = (0.0962 * inReal[i] + 0.5769 * inReal[i - 2] - 0.5769 * inReal[i - 4] - 0.0962 * inReal[i - 6]) * (0.075 * period + 0.54);
      
      q1 = (0.0962 * inReal[i] + 0.5769 * inReal[i - 2] - 0.5769 * inReal[i - 4] - 0.0962 * inReal[i - 6]) * (0.075 * period + 0.54);
      i1 = inReal[i - 3];
      
      jI = (0.0962 * i1 + 0.5769 * inReal[i - 5] - 0.5769 * inReal[i - 7] - 0.0962 * inReal[i - 9]) * (0.075 * period + 0.54);
      jQ = (0.0962 * q1 + 0.5769 * inReal[i - 4] - 0.5769 * inReal[i - 6] - 0.0962 * inReal[i - 8]) * (0.075 * period + 0.54);
      
      i2 = i1 - jQ;
      q2 = q1 + jI;
      i2 = 0.2 * i2 + 0.8 * (i2 || 0);
      q2 = 0.2 * q2 + 0.8 * (q2 || 0);
      
      re = 0.2 * i2 * i2 + 0.8 * (re || 0);
      im = 0.2 * i2 * q2 + 0.8 * (im || 0);
      
      if (im !== 0 && re !== 0) {
        period = 360 / (Math.atan(im / re) * 180 / Math.PI);
      }
      
      smoothPeriod = 0.2 * period + 0.8 * (smoothPeriod || period);
    }
    
    result.push(smoothPeriod || 0);
  }
  
  return result;
}

/**
 * Hilbert Transform - Trend vs Cycle Mode
 * Returns 1 for trend mode, 0 for cycle mode
 */
export function HT_TRENDMODE(inReal: number[]): number[] {
  const dcPeriod = HT_DCPERIOD(inReal);
  const result: number[] = [];
  
  for (let i = 0; i < inReal.length; i++) {
    const period = dcPeriod[i] || 0;
    
    // Calculate average price over dominant cycle period
    if (i >= period && period > 0) {
      let sum = 0;
      for (let j = i - Math.floor(period) + 1; j <= i; j++) {
        sum += inReal[j];
      }
      const avg = sum / Math.floor(period);
      
      // Trend mode if price is significantly above/below average
      const deviation = Math.abs(inReal[i] - avg) / avg;
      result.push(deviation > 0.02 ? 1 : 0);
    } else {
      result.push(0);
    }
  }
  
  return result;
}

// ==================== HELPER: Get All Available Functions ====================

export const TALIB_FUNCTIONS = {
  // Overlap Studies
  'SMA': { name: 'Simple Moving Average', category: 'overlap', inputs: ['inReal', 'period'] },
  'EMA': { name: 'Exponential Moving Average', category: 'overlap', inputs: ['inReal', 'period'] },
  'WMA': { name: 'Weighted Moving Average', category: 'overlap', inputs: ['inReal', 'period'] },
  'DEMA': { name: 'Double Exponential Moving Average', category: 'overlap', inputs: ['inReal', 'period'] },
  'TEMA': { name: 'Triple Exponential Moving Average', category: 'overlap', inputs: ['inReal', 'period'] },
  'TRIMA': { name: 'Triangular Moving Average', category: 'overlap', inputs: ['inReal', 'period'] },
  'KAMA': { name: 'Kaufman Adaptive Moving Average', category: 'overlap', inputs: ['inReal', 'period', 'fastPeriod', 'slowPeriod'] },
  'MAMA': { name: 'MESA Adaptive Moving Average', category: 'overlap', inputs: ['inReal', 'fastLimit', 'slowLimit'] },
  'T3': { name: 'Triple Exponential Moving Average T3', category: 'overlap', inputs: ['inReal', 'period', 'vFactor'] },
  
  // Momentum Indicators
  'MOM': { name: 'Momentum', category: 'momentum', inputs: ['inReal', 'period'] },
  'ROC': { name: 'Rate of Change', category: 'momentum', inputs: ['inReal', 'period'] },
  'ROCP': { name: 'Rate of Change Percentage', category: 'momentum', inputs: ['inReal', 'period'] },
  'ROCR': { name: 'Rate of Change Ratio', category: 'momentum', inputs: ['inReal', 'period'] },
  'ROCR100': { name: 'Rate of Change Ratio 100', category: 'momentum', inputs: ['inReal', 'period'] },
  'CMO': { name: 'Chande Momentum Oscillator', category: 'momentum', inputs: ['inReal', 'period'] },
  'WILLR': { name: "Williams' %R", category: 'momentum', inputs: ['high', 'low', 'close', 'period'] },
  'MFI': { name: 'Money Flow Index', category: 'momentum', inputs: ['high', 'low', 'close', 'volume', 'period'] },
  'ULTOSC': { name: 'Ultimate Oscillator', category: 'momentum', inputs: ['high', 'low', 'close', 'period1', 'period2', 'period3'] },
  'APO': { name: 'Absolute Price Oscillator', category: 'momentum', inputs: ['inReal', 'fastPeriod', 'slowPeriod'] },
  'PPO': { name: 'Percentage Price Oscillator', category: 'momentum', inputs: ['inReal', 'fastPeriod', 'slowPeriod'] },
  
  // Volume Indicators
  'OBV': { name: 'On Balance Volume', category: 'volume', inputs: ['close', 'volume'] },
  'AD': { name: 'Chaikin A/D Line', category: 'volume', inputs: ['high', 'low', 'close', 'volume'] },
  'ADOSC': { name: 'Chaikin A/D Oscillator', category: 'volume', inputs: ['high', 'low', 'close', 'volume', 'fastPeriod', 'slowPeriod'] },
  
  // Volatility Indicators
  'ATR': { name: 'Average True Range', category: 'volatility', inputs: ['high', 'low', 'close', 'period'] },
  'NATR': { name: 'Normalized Average True Range', category: 'volatility', inputs: ['high', 'low', 'close', 'period'] },
  'TRANGE': { name: 'True Range', category: 'volatility', inputs: ['high', 'low', 'close'] },
  
  // Trend Indicators
  'SAR': { name: 'Parabolic SAR', category: 'trend', inputs: ['high', 'low', 'acceleration', 'maximum'] },
  'AROON': { name: 'Aroon', category: 'trend', inputs: ['high', 'low', 'period'] },
  'AROONOSC': { name: 'Aroon Oscillator', category: 'trend', inputs: ['high', 'low', 'period'] },
  'ADX': { name: 'Average Directional Movement Index', category: 'trend', inputs: ['high', 'low', 'close', 'period'] },
  'ADXR': { name: 'Average Directional Movement Index Rating', category: 'trend', inputs: ['high', 'low', 'close', 'period'] },
  
  // Price Transform
  'AVGPRICE': { name: 'Average Price', category: 'price', inputs: ['open', 'high', 'low', 'close'] },
  'MEDPRICE': { name: 'Median Price', category: 'price', inputs: ['high', 'low'] },
  'TYPPRICE': { name: 'Typical Price', category: 'price', inputs: ['high', 'low', 'close'] },
  'WCLPRICE': { name: 'Weighted Close Price', category: 'price', inputs: ['high', 'low', 'close'] },
  
  // Statistic Functions
  'CORREL': { name: "Pearson's Correlation Coefficient", category: 'statistic', inputs: ['x', 'y', 'period'] },
  'BETA': { name: 'Beta Coefficient', category: 'statistic', inputs: ['market', 'asset', 'period'] },
  'LINEARREG': { name: 'Linear Regression', category: 'statistic', inputs: ['inReal', 'period'] },
  'LINEARREG_SLOPE': { name: 'Linear Regression Slope', category: 'statistic', inputs: ['inReal', 'period'] },
  'LINEARREG_INTERCEPT': { name: 'Linear Regression Intercept', category: 'statistic', inputs: ['inReal', 'period'] },
  'LINEARREG_ANGLE': { name: 'Linear Regression Angle', category: 'statistic', inputs: ['inReal', 'period'] },
  'STDDEV': { name: 'Standard Deviation', category: 'statistic', inputs: ['inReal', 'period', 'nbDev'] },
  'VAR': { name: 'Variance', category: 'statistic', inputs: ['inReal', 'period'] },
  
  // Cycle Indicators
  'HT_DCPERIOD': { name: 'Hilbert Transform - Dominant Cycle Period', category: 'cycle', inputs: ['inReal'] },
  'HT_TRENDMODE': { name: 'Hilbert Transform - Trend vs Cycle Mode', category: 'cycle', inputs: ['inReal'] },
} as const;

export type TalibFunctionName = keyof typeof TALIB_FUNCTIONS;
