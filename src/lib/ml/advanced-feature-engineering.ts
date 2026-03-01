/**
 * Advanced Feature Engineering
 * 
 * Extended feature extraction for ML signal classification.
 * Includes market microstructure, order flow, and sentiment features.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Extended feature set
 */
export interface ExtendedFeatures extends Record<string, number> {
  // Price-based features
  price: {
    // Trend features
    ema_cross_5_20: number    // EMA 5/20 crossover signal
    ema_cross_10_50: number   // EMA 10/50 crossover signal
    price_momentum_5: number  // 5-period momentum
    price_momentum_20: number // 20-period momentum
    
    // Volatility features
    atr_percent: number       // ATR as % of price
    bollinger_width: number   // Bollinger Band width
    keltner_width: number     // Keltner Channel width
    
    // Price patterns
    higher_highs: number      // Count of consecutive higher highs
    lower_lows: number        // Count of consecutive lower lows
    inside_bar: number        // Inside bar pattern
    outside_bar: number       // Outside bar pattern
  }
  
  // Volume features
  volume: {
    volume_ratio: number      // Current vs average volume
    volume_trend: number      // Volume trend direction
    obv_divergence: number    // OBV divergence
    vwap_distance: number     // Distance from VWAP
  }
  
  // Momentum features
  momentum: {
    rsi_14: number
    rsi_7: number
    rsi_divergence: number
    stochastic_k: number
    stochastic_d: number
    cci: number
    macd_hist: number
    macd_signal_dist: number
  }
  
  // Trend features
  trend: {
    adx: number
    adx_strength: number
    plus_di: number
    minus_di: number
    supertrend_signal: number
    ichimoku_signal: number
  }
  
  // Market microstructure
  microstructure: {
    avg_spread: number
    spread_trend: number
    trade_intensity: number
    large_trade_ratio: number
    order_imbalance: number
  }
  
  // Time features
  time: {
    hour_sin: number          // Sin of hour (cyclical)
    hour_cos: number          // Cos of hour (cyclical)
    day_sin: number           // Sin of day (cyclical)
    day_cos: number           // Cos of day (cyclical)
    session_asian: number
    session_london: number
    session_newyork: number
    session_overlap_ln: number
    session_overlap_ny: number
  }
  
  // Session performance
  session_performance: {
    win_rate_hour: number     // Win rate at this hour
    win_rate_day: number      // Win rate on this day
    avg_pnl_hour: number      // Avg PnL at this hour
  }
}

/**
 * Feature importance scores
 */
export interface FeatureImportance {
  feature: string
  importance: number
  category: string
}

// ============================================================================
// ADVANCED FEATURE EXTRACTOR
// ============================================================================

/**
 * Advanced Feature Extractor
 */
export class AdvancedFeatureExtractor {
  // Historical data for session performance
  private hourlyStats: Map<number, { wins: number; total: number; pnl: number }> = new Map()
  private dailyStats: Map<number, { wins: number; total: number; pnl: number }> = new Map()
  
  constructor() {
    // Initialize session stats
    for (let i = 0; i < 24; i++) {
      this.hourlyStats.set(i, { wins: 0, total: 0, pnl: 0 })
    }
    for (let i = 0; i < 7; i++) {
      this.dailyStats.set(i, { wins: 0, total: 0, pnl: 0 })
    }
  }
  
  /**
   * Extract all extended features
   */
  extractFeatures(
    high: number[],
    low: number[],
    close: number[],
    volume: number[],
    timestamp: number = Date.now()
  ): Partial<ExtendedFeatures> {
    const features: Partial<ExtendedFeatures> = {}
    
    // Price features
    features.price = this.extractPriceFeatures(high, low, close)
    
    // Volume features
    features.volume = this.extractVolumeFeatures(close, volume)
    
    // Momentum features
    features.momentum = this.extractMomentumFeatures(high, low, close)
    
    // Trend features
    features.trend = this.extractTrendFeatures(high, low, close)
    
    // Microstructure features
    features.microstructure = this.extractMicrostructureFeatures(high, low, close, volume)
    
    // Time features
    features.time = this.extractTimeFeatures(timestamp)
    
    // Session performance
    features.session_performance = this.extractSessionPerformance(timestamp)
    
    return features
  }
  
  /**
   * Extract price-based features
   */
  private extractPriceFeatures(
    high: number[],
    low: number[],
    close: number[]
  ): ExtendedFeatures['price'] {
    // EMAs
    const ema5 = this.calculateEMA(close, 5)
    const ema10 = this.calculateEMA(close, 10)
    const ema20 = this.calculateEMA(close, 20)
    const ema50 = this.calculateEMA(close, 50)
    
    // Crosses
    const emaCross5_20 = ema5 > ema20 ? 1 : (ema5 < ema20 ? -1 : 0)
    const emaCross10_50 = ema10 > ema50 ? 1 : (ema10 < ema50 ? -1 : 0)
    
    // Momentum
    const currentPrice = close[close.length - 1]
    const price5 = close.length > 5 ? close[close.length - 5] : currentPrice
    const price20 = close.length > 20 ? close[close.length - 20] : currentPrice
    
    const momentum5 = (currentPrice - price5) / price5
    const momentum20 = (currentPrice - price20) / price20
    
    // ATR
    const atr = this.calculateATR(high, low, close, 14)
    const atrPercent = atr / currentPrice
    
    // Bollinger Bands
    const sma20 = this.calculateSMA(close, 20)
    const std20 = this.calculateStdDev(close, 20)
    const bbWidth = (2 * std20) / sma20
    
    // Price patterns
    const higherHighs = this.countHigherHighs(high)
    const lowerLows = this.countLowerLows(low)
    const insideBar = this.detectInsideBar(high, low)
    const outsideBar = this.detectOutsideBar(high, low)
    
    return {
      ema_cross_5_20: this.normalize(emaCross5_20, 1),
      ema_cross_10_50: this.normalize(emaCross10_50, 1),
      price_momentum_5: this.tanh(momentum5 * 10),
      price_momentum_20: this.tanh(momentum20 * 10),
      atr_percent: this.normalize(atrPercent * 100, 5),
      bollinger_width: this.normalize(bbWidth * 100, 10),
      keltner_width: this.normalize(atrPercent * 100, 5),
      higher_highs: this.normalize(higherHighs, 5),
      lower_lows: this.normalize(lowerLows, 5),
      inside_bar: insideBar ? 1 : 0,
      outside_bar: outsideBar ? 1 : 0,
    }
  }
  
  /**
   * Extract volume-based features
   */
  private extractVolumeFeatures(
    close: number[],
    volume: number[]
  ): ExtendedFeatures['volume'] {
    if (volume.length < 20) {
      return {
        volume_ratio: 0.5,
        volume_trend: 0.5,
        obv_divergence: 0.5,
        vwap_distance: 0.5,
      }
    }
    
    // Volume ratio
    const avgVolume = this.calculateSMA(volume, 20)
    const currentVolume = volume[volume.length - 1]
    const volumeRatio = currentVolume / avgVolume
    
    // Volume trend
    const volSMA5 = this.calculateSMA(volume.slice(-5), 5)
    const volSMA20 = this.calculateSMA(volume.slice(-20), 20)
    const volumeTrend = volSMA5 > volSMA20 ? 1 : (volSMA5 < volSMA20 ? -1 : 0)
    
    // OBV divergence
    const obvDivergence = this.calculateOBVDivergence(close, volume)
    
    // VWAP distance
    const vwap = this.calculateVWAP(close, volume, 20)
    const currentPrice = close[close.length - 1]
    const vwapDistance = (currentPrice - vwap) / vwap
    
    return {
      volume_ratio: this.normalize(volumeRatio, 3),
      volume_trend: this.normalize(volumeTrend, 1),
      obv_divergence: this.normalize(obvDivergence, 1),
      vwap_distance: this.tanh(vwapDistance * 10),
    }
  }
  
  /**
   * Extract momentum features
   */
  private extractMomentumFeatures(
    high: number[],
    low: number[],
    close: number[]
  ): ExtendedFeatures['momentum'] {
    // RSI
    const rsi14 = this.calculateRSI(close, 14)
    const rsi7 = this.calculateRSI(close, 7)
    const rsiDivergence = this.detectRSIDivergence(close, rsi14)
    
    // Stochastic
    const stoch = this.calculateStochastic(high, low, close, 14, 3, 3)
    
    // CCI
    const cci = this.calculateCCI(high, low, close, 20)
    
    // MACD
    const macd = this.calculateMACD(close)
    
    return {
      rsi_14: this.normalize(rsi14 / 100, 1),
      rsi_7: this.normalize(rsi7 / 100, 1),
      rsi_divergence: this.normalize(rsiDivergence, 1),
      stochastic_k: this.normalize(stoch.k / 100, 1),
      stochastic_d: this.normalize(stoch.d / 100, 1),
      cci: this.tanh(cci / 100),
      macd_hist: this.tanh(macd.histogram / close[close.length - 1] * 1000),
      macd_signal_dist: this.tanh(macd.distance / close[close.length - 1] * 1000),
    }
  }
  
  /**
   * Extract trend features
   */
  private extractTrendFeatures(
    high: number[],
    low: number[],
    close: number[]
  ): ExtendedFeatures['trend'] {
    // ADX
    const adx = this.calculateADX(high, low, close, 14)
    const plusDI = this.calculatePlusDI(high, low, close, 14)
    const minusDI = this.calculateMinusDI(high, low, close, 14)
    
    // SuperTrend
    const supertrend = this.calculateSuperTrend(high, low, close, 10, 3)
    
    return {
      adx: this.normalize(adx / 100, 1),
      adx_strength: adx > 25 ? 1 : (adx > 20 ? 0.5 : 0),
      plus_di: this.normalize(plusDI / 100, 1),
      minus_di: this.normalize(minusDI / 100, 1),
      supertrend_signal: supertrend.signal,
      ichimoku_signal: 0.5, // Placeholder
    }
  }
  
  /**
   * Extract microstructure features
   */
  private extractMicrostructureFeatures(
    high: number[],
    low: number[],
    close: number[],
    volume: number[]
  ): ExtendedFeatures['microstructure'] {
    // Approximate spread from high-low
    const spreads = []
    for (let i = Math.max(0, close.length - 20); i < close.length; i++) {
      spreads.push((high[i] - low[i]) / close[i])
    }
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length
    
    // Spread trend
    const recentSpread = spreads.slice(-5).reduce((a, b) => a + b, 0) / 5
    const olderSpread = spreads.slice(0, 15).reduce((a, b) => a + b, 0) / 15
    const spreadTrend = recentSpread > olderSpread ? 1 : -1
    
    // Trade intensity (volume per bar)
    const recentVol = volume.slice(-5).reduce((a, b) => a + b, 0) / 5
    const avgVol = volume.slice(-20).reduce((a, b) => a + b, 0) / 20
    const tradeIntensity = recentVol / avgVol
    
    return {
      avg_spread: this.normalize(avgSpread * 100, 5),
      spread_trend: this.normalize(spreadTrend, 1),
      trade_intensity: this.normalize(tradeIntensity, 3),
      large_trade_ratio: 0.5, // Placeholder
      order_imbalance: 0.5, // Placeholder
    }
  }
  
  /**
   * Extract time features (cyclical encoding)
   */
  private extractTimeFeatures(timestamp: number): ExtendedFeatures['time'] {
    const date = new Date(timestamp)
    const hour = date.getUTCHours()
    const day = date.getUTCDay()
    
    // Cyclical encoding
    const hourSin = Math.sin(2 * Math.PI * hour / 24)
    const hourCos = Math.cos(2 * Math.PI * hour / 24)
    const daySin = Math.sin(2 * Math.PI * day / 7)
    const dayCos = Math.cos(2 * Math.PI * day / 7)
    
    // Sessions (UTC)
    const sessionAsian = hour >= 0 && hour < 8 ? 1 : 0
    const sessionLondon = hour >= 8 && hour < 16 ? 1 : 0
    const sessionNewYork = hour >= 13 && hour < 21 ? 1 : 0
    const sessionOverlapLN = hour >= 8 && hour < 16 ? 1 : 0
    const sessionOverlapNY = hour >= 13 && hour < 17 ? 1 : 0
    
    return {
      hour_sin: (hourSin + 1) / 2,
      hour_cos: (hourCos + 1) / 2,
      day_sin: (daySin + 1) / 2,
      day_cos: (dayCos + 1) / 2,
      session_asian: sessionAsian,
      session_london: sessionLondon,
      session_newyork: sessionNewYork,
      session_overlap_ln: sessionOverlapLN,
      session_overlap_ny: sessionOverlapNY,
    }
  }
  
  /**
   * Extract session performance features
   */
  private extractSessionPerformance(timestamp: number): ExtendedFeatures['session_performance'] {
    const date = new Date(timestamp)
    const hour = date.getUTCHours()
    const day = date.getUTCDay()
    
    const hourStats = this.hourlyStats.get(hour) || { wins: 0, total: 0, pnl: 0 }
    const dayStats = this.dailyStats.get(day) || { wins: 0, total: 0, pnl: 0 }
    
    const winRateHour = hourStats.total > 0 ? hourStats.wins / hourStats.total : 0.5
    const winRateDay = dayStats.total > 0 ? dayStats.wins / dayStats.total : 0.5
    const avgPnlHour = hourStats.total > 0 ? hourStats.pnl / hourStats.total : 0
    
    return {
      win_rate_hour: winRateHour,
      win_rate_day: winRateDay,
      avg_pnl_hour: this.tanh(avgPnlHour * 10),
    }
  }
  
  // ==========================================================================
  // TECHNICAL INDICATOR CALCULATIONS
  // ==========================================================================
  
  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0
    
    const multiplier = 2 / (period + 1)
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema
    }
    
    return ema
  }
  
  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) return data.reduce((a, b) => a + b, 0) / data.length
    return data.slice(-period).reduce((a, b) => a + b, 0) / period
  }
  
  private calculateStdDev(data: number[], period: number): number {
    if (data.length < period) return 0
    
    const slice = data.slice(-period)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
    
    return Math.sqrt(variance)
  }
  
  private calculateATR(high: number[], low: number[], close: number[], period: number): number {
    if (close.length < period + 1) return 0
    
    let atrSum = 0
    for (let i = close.length - period; i < close.length; i++) {
      const tr = Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      )
      atrSum += tr
    }
    
    return atrSum / period
  }
  
  private calculateRSI(close: number[], period: number): number {
    if (close.length < period + 1) return 50
    
    let gains = 0
    let losses = 0
    
    for (let i = close.length - period; i < close.length; i++) {
      const change = close[i] - close[i - 1]
      if (change > 0) gains += change
      else losses += Math.abs(change)
    }
    
    if (losses === 0) return 100
    const rs = gains / losses
    return 100 - (100 / (1 + rs))
  }
  
  private calculateStochastic(
    high: number[],
    low: number[],
    close: number[],
    kPeriod: number,
    smoothK: number,
    dPeriod: number
  ): { k: number; d: number } {
    if (close.length < kPeriod) return { k: 50, d: 50 }
    
    const kValues: number[] = []
    
    for (let i = close.length - kPeriod; i < close.length; i++) {
      const highMax = Math.max(...high.slice(i - kPeriod + 1, i + 1))
      const lowMin = Math.min(...low.slice(i - kPeriod + 1, i + 1))
      const range = highMax - lowMin
      
      if (range === 0) {
        kValues.push(50)
      } else {
        kValues.push(((close[i] - lowMin) / range) * 100)
      }
    }
    
    // Smooth K
    const k = kValues.slice(-smoothK).reduce((a, b) => a + b, 0) / smoothK
    const d = kValues.slice(-dPeriod).reduce((a, b) => a + b, 0) / dPeriod
    
    return { k, d }
  }
  
  private calculateCCI(high: number[], low: number[], close: number[], period: number): number {
    if (close.length < period) return 0
    
    const tp: number[] = []
    for (let i = close.length - period; i < close.length; i++) {
      tp.push((high[i] + low[i] + close[i]) / 3)
    }
    
    const sma = tp.reduce((a, b) => a + b, 0) / period
    const meanDev = tp.reduce((sum, val) => sum + Math.abs(val - sma), 0) / period
    
    if (meanDev === 0) return 0
    
    const currentTP = tp[tp.length - 1]
    return (currentTP - sma) / (0.015 * meanDev)
  }
  
  private calculateMACD(close: number[]): { histogram: number; distance: number } {
    const ema12 = this.calculateEMA(close, 12)
    const ema26 = this.calculateEMA(close, 26)
    const macdLine = ema12 - ema26
    
    // Signal line (9-period EMA of MACD)
    const signalLine = macdLine * 0.8 // Approximation
    
    return {
      histogram: macdLine - signalLine,
      distance: macdLine,
    }
  }
  
  private calculateADX(high: number[], low: number[], close: number[], period: number): number {
    // Simplified ADX calculation
    if (close.length < period * 2) return 0
    
    const plusDM: number[] = []
    const minusDM: number[] = []
    const tr: number[] = []
    
    for (let i = 1; i < close.length; i++) {
      const upMove = high[i] - high[i - 1]
      const downMove = low[i - 1] - low[i]
      
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0)
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0)
      tr.push(Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      ))
    }
    
    // Smoothed values
    const smoothPlusDM = plusDM.slice(-period).reduce((a, b) => a + b, 0) / period
    const smoothMinusDM = minusDM.slice(-period).reduce((a, b) => a + b, 0) / period
    const smoothTR = tr.slice(-period).reduce((a, b) => a + b, 0) / period
    
    if (smoothTR === 0) return 0
    
    const plusDI = (smoothPlusDM / smoothTR) * 100
    const minusDI = (smoothMinusDM / smoothTR) * 100
    
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100
    
    return dx
  }
  
  private calculatePlusDI(high: number[], low: number[], close: number[], period: number): number {
    if (close.length < period) return 0
    
    let plusDM = 0
    let tr = 0
    
    for (let i = close.length - period; i < close.length; i++) {
      const upMove = high[i] - high[i - 1]
      const downMove = low[i - 1] - low[i]
      
      plusDM += upMove > downMove && upMove > 0 ? upMove : 0
      tr += Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      )
    }
    
    return tr > 0 ? (plusDM / tr) * 100 : 0
  }
  
  private calculateMinusDI(high: number[], low: number[], close: number[], period: number): number {
    if (close.length < period) return 0
    
    let minusDM = 0
    let tr = 0
    
    for (let i = close.length - period; i < close.length; i++) {
      const upMove = high[i] - high[i - 1]
      const downMove = low[i - 1] - low[i]
      
      minusDM += downMove > upMove && downMove > 0 ? downMove : 0
      tr += Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      )
    }
    
    return tr > 0 ? (minusDM / tr) * 100 : 0
  }
  
  private calculateSuperTrend(
    high: number[],
    low: number[],
    close: number[],
    atrPeriod: number,
    multiplier: number
  ): { signal: number; value: number } {
    const atr = this.calculateATR(high, low, close, atrPeriod)
    const currentPrice = close[close.length - 1]
    
    // Simplified SuperTrend
    const upperBand = currentPrice + multiplier * atr
    const lowerBand = currentPrice - multiplier * atr
    
    const prevPrice = close[close.length - 2]
    
    if (currentPrice > upperBand) {
      return { signal: 1, value: lowerBand }
    } else if (currentPrice < lowerBand) {
      return { signal: -1, value: upperBand }
    } else {
      return { signal: prevPrice < currentPrice ? 1 : -1, value: 0 }
    }
  }
  
  private calculateVWAP(close: number[], volume: number[], period: number): number {
    if (close.length < period || volume.length < period) return close[close.length - 1]
    
    let sumPV = 0
    let sumV = 0
    
    for (let i = close.length - period; i < close.length; i++) {
      sumPV += close[i] * volume[i]
      sumV += volume[i]
    }
    
    return sumV > 0 ? sumPV / sumV : close[close.length - 1]
  }
  
  private calculateOBVDivergence(close: number[], volume: number[]): number {
    if (close.length < 20) return 0
    
    // Calculate OBV
    let obv = 0
    const obvValues: number[] = []
    
    for (let i = 1; i < close.length; i++) {
      if (close[i] > close[i - 1]) obv += volume[i]
      else if (close[i] < close[i - 1]) obv -= volume[i]
      obvValues.push(obv)
    }
    
    // Check for divergence
    const priceChange = close[close.length - 1] - close[close.length - 20]
    const obvChange = obvValues[obvValues.length - 1] - obvValues[obvValues.length - 20]
    
    // Divergence: price going up but OBV going down (or vice versa)
    if (priceChange > 0 && obvChange < 0) return -1
    if (priceChange < 0 && obvChange > 0) return 1
    
    return 0
  }
  
  // ==========================================================================
  // PATTERN DETECTION
  // ==========================================================================
  
  private countHigherHighs(high: number[]): number {
    let count = 0
    for (let i = high.length - 5; i < high.length - 1; i++) {
      if (high[i] > high[i - 1]) count++
    }
    return count
  }
  
  private countLowerLows(low: number[]): number {
    let count = 0
    for (let i = low.length - 5; i < low.length - 1; i++) {
      if (low[i] < low[i - 1]) count++
    }
    return count
  }
  
  private detectInsideBar(high: number[], low: number[]): boolean {
    if (high.length < 2) return false
    
    const currentHigh = high[high.length - 1]
    const currentLow = low[low.length - 1]
    const prevHigh = high[high.length - 2]
    const prevLow = low[low.length - 2]
    
    return currentHigh < prevHigh && currentLow > prevLow
  }
  
  private detectOutsideBar(high: number[], low: number[]): boolean {
    if (high.length < 2) return false
    
    const currentHigh = high[high.length - 1]
    const currentLow = low[low.length - 1]
    const prevHigh = high[high.length - 2]
    const prevLow = low[low.length - 2]
    
    return currentHigh > prevHigh && currentLow < prevLow
  }
  
  private detectRSIDivergence(close: number[], rsi: number): number {
    // Simplified divergence detection
    return 0
  }
  
  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================
  
  private normalize(value: number, range: number): number {
    return Math.max(0, Math.min(1, (value + range) / (2 * range)))
  }
  
  private tanh(value: number): number {
    return Math.tanh(value) * 0.5 + 0.5
  }
  
  /**
   * Update session stats with outcome
   */
  updateSessionStats(timestamp: number, win: boolean, pnl: number): void {
    const date = new Date(timestamp)
    const hour = date.getUTCHours()
    const day = date.getUTCDay()
    
    const hourStats = this.hourlyStats.get(hour)!
    hourStats.total++
    if (win) hourStats.wins++
    hourStats.pnl += pnl
    
    const dayStats = this.dailyStats.get(day)!
    dayStats.total++
    if (win) dayStats.wins++
    dayStats.pnl += pnl
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let extractorInstance: AdvancedFeatureExtractor | null = null

export function getAdvancedFeatureExtractor(): AdvancedFeatureExtractor {
  if (!extractorInstance) {
    extractorInstance = new AdvancedFeatureExtractor()
  }
  return extractorInstance
}

export default AdvancedFeatureExtractor
