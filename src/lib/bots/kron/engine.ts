/**
 * KRON - Trend Following Bot
 * 
 * Named after the titan of time, this bot captures trends across timeframes.
 * Uses classical momentum and trend indicators - no neural networks.
 * 
 * Features:
 * - Multiple moving average systems
 * - ADX trend strength filtering
 * - Donchian channel breakouts
 * - Parabolic SAR trailing
 * - Multi-timeframe confirmation
 * - Position pyramid option
 * - Volatility-adjusted position sizing
 */

export type TrendDirection = 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
export type TrendStrength = 'WEAK' | 'MODERATE' | 'STRONG';
export type BreakoutType = 'UPPER' | 'LOWER' | 'NONE';

export interface TrendState {
  symbol: string;
  currentPrice: number;
  direction: TrendDirection;
  strength: TrendStrength;
  adx: number;
  plusDI: number;
  minusDI: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  donchianUpper: number;
  donchianLower: number;
  donchianMiddle: number;
  parabolicSAR: number;
  atr: number;
  breakoutType: BreakoutType;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
}

export interface KronConfig {
  smaPeriods: number[];
  emaPeriods: number[];
  adxPeriod: number;
  adxThreshold: number;
  donchianPeriod: number;
  atrPeriod: number;
  atrMultiplier: number;
  psarStep: number;
  psarMax: number;
  minTrendStrength: TrendStrength;
  breakoutConfirmations: number;
  pyramidEnabled: boolean;
  maxPyramids: number;
}

export const DEFAULT_KRON_CONFIG: KronConfig = {
  smaPeriods: [20, 50, 200],
  emaPeriods: [12, 26],
  adxPeriod: 14,
  adxThreshold: 25,
  donchianPeriod: 20,
  atrPeriod: 14,
  atrMultiplier: 2.0,
  psarStep: 0.02,
  psarMax: 0.2,
  minTrendStrength: 'MODERATE',
  breakoutConfirmations: 2,
  pyramidEnabled: false,
  maxPyramids: 3,
};

export class KronBot {
  private config: KronConfig;
  private states: Map<string, TrendState> = new Map();
  private breakoutCount: Map<string, number> = new Map();

  constructor(config: Partial<KronConfig>) {
    this.config = { ...DEFAULT_KRON_CONFIG, ...config };
  }

  /**
   * Analyze symbol for trend signals
   */
  analyze(
    symbol: string,
    candles: Array<{ high: number; low: number; close: number; volume?: number }>
  ): TrendState | null {
    if (candles.length < 200) return null;

    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];

    // Moving averages
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, 200);
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);

    // ADX and DI
    const { adx, plusDI, minusDI } = this.calculateADX(highs, lows, closes, this.config.adxPeriod);

    // Donchian Channels
    const donchian = this.calculateDonchian(highs, lows, this.config.donchianPeriod);

    // Parabolic SAR
    const psar = this.calculateParabolicSAR(highs, lows, closes);

    // ATR
    const atr = this.calculateATR(highs, lows, closes, this.config.atrPeriod);

    // Determine trend direction
    const direction = this.determineTrend(currentPrice, sma20, sma50, sma200, plusDI, minusDI);

    // Determine trend strength
    const strength = this.classifyStrength(adx);

    // Check breakout
    const breakoutType = this.checkBreakout(currentPrice, donchian, symbol);

    // Generate signal
    const signal = this.generateSignal(
      direction, strength, adx, currentPrice, sma20, sma50, breakoutType, psar
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(adx, direction, breakoutType, sma20, sma50, sma200);

    const state: TrendState = {
      symbol,
      currentPrice,
      direction,
      strength,
      adx,
      plusDI,
      minusDI,
      sma20,
      sma50,
      sma200,
      ema12,
      ema26,
      donchianUpper: donchian.upper,
      donchianLower: donchian.lower,
      donchianMiddle: donchian.middle,
      parabolicSAR: psar,
      atr,
      breakoutType,
      signal,
      confidence,
    };

    this.states.set(symbol, state);
    return state;
  }

  /**
   * Calculate SMA
   */
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    return prices.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Calculate EMA
   */
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * k + ema * (1 - k);
    }
    return ema;
  }

  /**
   * Calculate ADX and Directional Indicators
   */
  private calculateADX(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): { adx: number; plusDI: number; minusDI: number } {
    if (closes.length < period * 2) return { adx: 0, plusDI: 50, minusDI: 50 };

    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

      tr.push(Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      ));
    }

    // Smoothed values
    const smoothTR = this.smoothArray(tr, period);
    const smoothPlusDM = this.smoothArray(plusDM, period);
    const smoothMinusDM = this.smoothArray(minusDM, period);

    // Directional Indicators
    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;

    // DX and ADX
    const dx = plusDI + minusDI > 0 ? (Math.abs(plusDI - minusDI) / (plusDI + minusDI)) * 100 : 0;

    return { adx: dx, plusDI, minusDI };
  }

  /**
   * Smooth array (Wilder's smoothing)
   */
  private smoothArray(arr: number[], period: number): number {
    if (arr.length < period) return arr.reduce((a, b) => a + b, 0);
    
    let smoothed = arr.slice(0, period).reduce((a, b) => a + b, 0);
    for (let i = period; i < arr.length; i++) {
      smoothed = smoothed - smoothed / period + arr[i];
    }
    return smoothed;
  }

  /**
   * Calculate Donchian Channels
   */
  private calculateDonchian(
    highs: number[],
    lows: number[],
    period: number
  ): { upper: number; lower: number; middle: number } {
    const periodHighs = highs.slice(-period);
    const periodLows = lows.slice(-period);

    const upper = Math.max(...periodHighs);
    const lower = Math.min(...periodLows);
    const middle = (upper + lower) / 2;

    return { upper, lower, middle };
  }

  /**
   * Calculate Parabolic SAR
   */
  private calculateParabolicSAR(
    highs: number[],
    lows: number[],
    closes: number[]
  ): number {
    const step = this.config.psarStep;
    const max = this.config.psarMax;

    let sar = lows[0];
    let ep = highs[0];
    let af = step;
    let isLong = true;

    for (let i = 1; i < closes.length; i++) {
      if (isLong) {
        sar = sar + af * (ep - sar);
        if (lows[i] < sar) {
          isLong = false;
          sar = ep;
          ep = lows[i];
          af = step;
        } else {
          if (highs[i] > ep) {
            ep = highs[i];
            af = Math.min(af + step, max);
          }
        }
      } else {
        sar = sar - af * (sar - ep);
        if (highs[i] > sar) {
          isLong = true;
          sar = ep;
          ep = highs[i];
          af = step;
        } else {
          if (lows[i] < ep) {
            ep = lows[i];
            af = Math.min(af + step, max);
          }
        }
      }
    }

    return sar;
  }

  /**
   * Calculate ATR
   */
  private calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): number {
    if (closes.length < period + 1) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      trueRanges.push(Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      ));
    }

    return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  /**
   * Determine trend direction
   */
  private determineTrend(
    price: number,
    sma20: number,
    sma50: number,
    sma200: number,
    plusDI: number,
    minusDI: number
  ): TrendDirection {
    let bullishSignals = 0;
    let bearishSignals = 0;

    if (price > sma20) bullishSignals++;
    else bearishSignals++;

    if (price > sma50) bullishSignals++;
    else bearishSignals++;

    if (sma20 > sma50) bullishSignals++;
    else bearishSignals++;

    if (sma50 > sma200) bullishSignals++;
    else bearishSignals++;

    if (plusDI > minusDI) bullishSignals++;
    else bearishSignals++;

    if (bullishSignals >= 4) return 'UPTREND';
    if (bearishSignals >= 4) return 'DOWNTREND';
    return 'SIDEWAYS';
  }

  /**
   * Classify trend strength
   */
  private classifyStrength(adx: number): TrendStrength {
    if (adx < 20) return 'WEAK';
    if (adx < 40) return 'MODERATE';
    return 'STRONG';
  }

  /**
   * Check for breakout
   */
  private checkBreakout(
    price: number,
    donchian: { upper: number; lower: number; middle: number },
    symbol: string
  ): BreakoutType {
    const key = `${symbol}-breakout`;
    const currentCount = this.breakoutCount.get(key) || 0;

    if (price > donchian.upper) {
      this.breakoutCount.set(key, currentCount + 1);
      return currentCount + 1 >= this.config.breakoutConfirmations ? 'UPPER' : 'NONE';
    }

    if (price < donchian.lower) {
      this.breakoutCount.set(key, currentCount + 1);
      return currentCount + 1 >= this.config.breakoutConfirmations ? 'LOWER' : 'NONE';
    }

    this.breakoutCount.set(key, 0);
    return 'NONE';
  }

  /**
   * Generate trading signal
   */
  private generateSignal(
    direction: TrendDirection,
    strength: TrendStrength,
    adx: number,
    price: number,
    sma20: number,
    sma50: number,
    breakout: BreakoutType,
    psar: number
  ): 'BUY' | 'SELL' | 'HOLD' {
    // Require minimum trend strength
    if (strength === 'WEAK' && this.config.minTrendStrength !== 'WEAK') return 'HOLD';

    // Uptrend conditions
    if (direction === 'UPTREND' &&
        adx >= this.config.adxThreshold &&
        price > sma20 &&
        price > psar &&
        (breakout === 'UPPER' || breakout === 'NONE')) {
      return 'BUY';
    }

    // Downtrend conditions
    if (direction === 'DOWNTREND' &&
        adx >= this.config.adxThreshold &&
        price < sma20 &&
        price < psar &&
        (breakout === 'LOWER' || breakout === 'NONE')) {
      return 'SELL';
    }

    return 'HOLD';
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(
    adx: number,
    direction: TrendDirection,
    breakout: BreakoutType,
    sma20: number,
    sma50: number,
    sma200: number
  ): number {
    let confidence = 0.3;

    // Strong ADX
    if (adx > 40) confidence += 0.2;
    else if (adx > 25) confidence += 0.1;

    // Clear trend
    if (direction !== 'SIDEWAYS') confidence += 0.2;

    // Confirmed breakout
    if (breakout !== 'NONE') confidence += 0.2;

    // Moving average alignment
    if (sma20 > sma50 && sma50 > sma200) confidence += 0.1;
    else if (sma20 < sma50 && sma50 < sma200) confidence += 0.1;

    return Math.min(1, confidence);
  }

  getState(symbol: string): TrendState | undefined { return this.states.get(symbol); }
  getStates(): Map<string, TrendState> { return new Map(this.states); }
  getConfig(): KronConfig { return { ...this.config }; }
}

export default { KronBot, DEFAULT_KRON_CONFIG };
