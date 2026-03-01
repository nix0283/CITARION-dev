/**
 * Multi-timeframe Analysis
 * 
 * Analyzes market across multiple timeframes for improved predictions.
 * Combines signals from different time horizons.
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Timeframe configuration
 */
export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

/**
 * Timeframe data
 */
export interface TimeframeData {
  timeframe: Timeframe
  high: number[]
  low: number[]
  close: number[]
  volume: number[]
  timestamp: number[]
}

/**
 * Multi-timeframe configuration
 */
export interface MTFConfig {
  // Timeframes to analyze
  timeframes: Timeframe[]
  
  // Weight for each timeframe
  weights: Record<Timeframe, number>
  
  // Require alignment between timeframes
  requireAlignment: boolean
  
  // Minimum agreement threshold
  minAgreement: number
  
  // Feature extraction per timeframe
  featureLookback: Record<Timeframe, number>
}

/**
 * Default MTF configuration
 */
export const DEFAULT_MTF_CONFIG: MTFConfig = {
  timeframes: ['5m', '15m', '1h', '4h'],
  weights: {
    '1m': 0.1,
    '5m': 0.2,
    '15m': 0.3,
    '1h': 0.25,
    '4h': 0.1,
    '1d': 0.05,
  },
  requireAlignment: true,
  minAgreement: 0.6,
  featureLookback: {
    '1m': 60,
    '5m': 48,
    '15m': 96,
    '1h': 168,
    '4h': 168,
    '1d': 90,
  },
}

/**
 * Timeframe analysis result
 */
export interface TimeframeAnalysis {
  timeframe: Timeframe
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  strength: number       // 0-1
  momentum: number       // -1 to 1
  volatility: number     // 0-1
  support: number
  resistance: number
  signals: {
    emaCross: number      // -1 to 1
    rsiSignal: number     // -1 to 1
    macdSignal: number    // -1 to 1
    adxSignal: number     // 0-1
    pattern: string | null
  }
  features: number[]
}

/**
 * Multi-timeframe result
 */
export interface MTFResult {
  // Individual timeframe analyses
  timeframes: TimeframeAnalysis[]
  
  // Aggregated signals
  aggregate: {
    // Combined trend
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    
    // Trend alignment score (how well timeframes align)
    alignment: number
    
    // Combined strength
    strength: number
    
    // Weighted momentum
    momentum: number
    
    // Overall direction
    direction: 'LONG' | 'SHORT' | 'NEUTRAL'
    
    // Confidence
    confidence: number
    
    // Agreement level
    agreement: number
  }
  
  // Trading recommendation
  recommendation: {
    action: 'BUY' | 'SELL' | 'WAIT'
    timeframe: Timeframe
    entry: number
    stopLoss: number
    takeProfit: number
    riskReward: number
  }
}

// ============================================================================
// MULTI-TIMEFRAME ANALYZER
// ============================================================================

/**
 * Multi-timeframe Analyzer
 */
export class MultiTimeframeAnalyzer {
  private config: MTFConfig
  private timeframeData: Map<Timeframe, TimeframeData> = new Map()
  
  constructor(config: Partial<MTFConfig> = {}) {
    this.config = { ...DEFAULT_MTF_CONFIG, ...config }
  }
  
  /**
   * Add timeframe data
   */
  addTimeframeData(data: TimeframeData): void {
    this.timeframeData.set(data.timeframe, data)
  }
  
  /**
   * Analyze all timeframes
   */
  analyze(): MTFResult {
    const analyses: TimeframeAnalysis[] = []
    
    // Analyze each timeframe
    for (const tf of this.config.timeframes) {
      const data = this.timeframeData.get(tf)
      if (data) {
        analyses.push(this.analyzeTimeframe(data))
      }
    }
    
    // Aggregate results
    const aggregate = this.aggregateTimeframes(analyses)
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(analyses, aggregate)
    
    return {
      timeframes: analyses,
      aggregate,
      recommendation,
    }
  }
  
  /**
   * Analyze single timeframe
   */
  private analyzeTimeframe(data: TimeframeData): TimeframeAnalysis {
    const { high, low, close, volume } = data
    
    // Calculate indicators
    const emaCross = this.calculateEMACross(close)
    const rsi = this.calculateRSI(close, 14)
    const macd = this.calculateMACD(close)
    const adx = this.calculateADX(high, low, close)
    const atr = this.calculateATR(high, low, close)
    
    // Determine trend
    const trend = this.determineTrend(emaCross, rsi, macd, adx)
    
    // Calculate strength
    const strength = this.calculateStrength(emaCross, rsi, macd, adx)
    
    // Calculate momentum
    const momentum = this.calculateMomentum(close)
    
    // Calculate volatility
    const volatility = atr / close[close.length - 1]
    
    // Find support/resistance
    const { support, resistance } = this.findSupportResistance(high, low, close)
    
    // Detect patterns
    const pattern = this.detectPattern(high, low, close)
    
    // Build features
    const features = [
      emaCross,
      (rsi - 50) / 50,
      macd.histogram / close[close.length - 1] * 100,
      adx / 100,
      volatility * 100,
      momentum,
    ]
    
    return {
      timeframe: data.timeframe,
      trend: trend.direction,
      strength,
      momentum,
      volatility,
      support,
      resistance,
      signals: {
        emaCross: emaCross,
        rsiSignal: (rsi - 50) / 50,
        macdSignal: macd.histogram > 0 ? 1 : -1,
        adxSignal: adx / 100,
        pattern,
      },
      features,
    }
  }
  
  /**
   * Aggregate timeframe analyses
   */
  private aggregateTimeframes(
    analyses: TimeframeAnalysis[]
  ): MTFResult['aggregate'] {
    if (analyses.length === 0) {
      return {
        trend: 'NEUTRAL',
        alignment: 0,
        strength: 0,
        momentum: 0,
        direction: 'NEUTRAL',
        confidence: 0,
        agreement: 0,
      }
    }
    
    // Weighted trend calculation
    let bullishScore = 0
    let bearishScore = 0
    let totalWeight = 0
    let alignmentSum = 0
    
    for (const analysis of analyses) {
      const weight = this.config.weights[analysis.timeframe]
      
      if (analysis.trend === 'BULLISH') {
        bullishScore += weight * analysis.strength
      } else if (analysis.trend === 'BEARISH') {
        bearishScore += weight * analysis.strength
      }
      
      totalWeight += weight
      alignmentSum += weight * analysis.strength
    }
    
    // Normalize
    bullishScore /= totalWeight
    bearishScore /= totalWeight
    
    // Determine trend
    let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    let strength: number
    
    if (bullishScore > bearishScore && bullishScore > 0.3) {
      trend = 'BULLISH'
      strength = bullishScore
    } else if (bearishScore > bullishScore && bearishScore > 0.3) {
      trend = 'BEARISH'
      strength = bearishScore
    } else {
      trend = 'NEUTRAL'
      strength = 0.5
    }
    
    // Calculate alignment
    const alignment = alignmentSum / totalWeight
    
    // Weighted momentum
    let momentum = 0
    for (const analysis of analyses) {
      const weight = this.config.weights[analysis.timeframe]
      momentum += weight * analysis.momentum
    }
    momentum /= totalWeight
    
    // Calculate agreement
    const trends = analyses.map(a => a.trend)
    const bullishCount = trends.filter(t => t === 'BULLISH').length
    const bearishCount = trends.filter(t => t === 'BEARISH').length
    const maxCount = Math.max(bullishCount, bearishCount, trends.length - bullishCount - bearishCount)
    const agreement = maxCount / trends.length
    
    // Determine direction
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL'
    if (trend === 'BULLISH' && agreement >= this.config.minAgreement) {
      direction = 'LONG'
    } else if (trend === 'BEARISH' && agreement >= this.config.minAgreement) {
      direction = 'SHORT'
    } else {
      direction = 'NEUTRAL'
    }
    
    // Calculate confidence
    const confidence = strength * alignment * agreement
    
    return {
      trend,
      alignment,
      strength,
      momentum,
      direction,
      confidence,
      agreement,
    }
  }
  
  /**
   * Generate trading recommendation
   */
  private generateRecommendation(
    analyses: TimeframeAnalysis[],
    aggregate: MTFResult['aggregate']
  ): MTFResult['recommendation'] {
    // Find best timeframe for entry
    let bestTf: TimeframeAnalysis | null = null
    let bestScore = -Infinity
    
    for (const analysis of analyses) {
      const score = analysis.strength * Math.abs(analysis.momentum)
      if (score > bestScore) {
        bestScore = score
        bestTf = analysis
      }
    }
    
    if (!bestTf) {
      return {
        action: 'WAIT',
        timeframe: '1h',
        entry: 0,
        stopLoss: 0,
        takeProfit: 0,
        riskReward: 0,
      }
    }
    
    // Determine action
    let action: 'BUY' | 'SELL' | 'WAIT'
    if (aggregate.confidence > 0.6 && aggregate.direction !== 'NEUTRAL') {
      action = aggregate.direction === 'LONG' ? 'BUY' : 'SELL'
    } else {
      action = 'WAIT'
    }
    
    // Get current price
    const data = this.timeframeData.get(bestTf.timeframe)
    const currentPrice = data?.close[data.close.length - 1] || 0
    
    // Calculate stop loss and take profit
    const atr = bestTf.volatility * currentPrice
    let stopLoss: number
    let takeProfit: number
    
    if (action === 'BUY') {
      stopLoss = bestTf.support || currentPrice - 2 * atr
      takeProfit = currentPrice + 3 * (currentPrice - stopLoss)
    } else if (action === 'SELL') {
      stopLoss = bestTf.resistance || currentPrice + 2 * atr
      takeProfit = currentPrice - 3 * (stopLoss - currentPrice)
    } else {
      stopLoss = currentPrice
      takeProfit = currentPrice
    }
    
    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(currentPrice - stopLoss)
    
    return {
      action,
      timeframe: bestTf.timeframe,
      entry: currentPrice,
      stopLoss,
      takeProfit,
      riskReward,
    }
  }
  
  // ==========================================================================
  // INDICATOR CALCULATIONS
  // ==========================================================================
  
  private calculateEMACross(close: number[]): number {
    if (close.length < 20) return 0
    
    const ema5 = this.calculateEMA(close, 5)
    const ema20 = this.calculateEMA(close, 20)
    
    if (ema5 > ema20) return 1
    if (ema5 < ema20) return -1
    return 0
  }
  
  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0
    
    const multiplier = 2 / (period + 1)
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema
    }
    
    return ema
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
  
  private calculateMACD(close: number[]): { line: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(close, 12)
    const ema26 = this.calculateEMA(close, 26)
    const line = ema12 - ema26
    const signal = line * 0.8  // Simplified signal line
    const histogram = line - signal
    
    return { line, signal, histogram }
  }
  
  private calculateADX(high: number[], low: number[], close: number[]): number {
    if (close.length < 28) return 0
    
    // Simplified ADX
    let plusDM = 0
    let minusDM = 0
    let tr = 0
    
    for (let i = close.length - 14; i < close.length; i++) {
      const upMove = high[i] - high[i - 1]
      const downMove = low[i - 1] - low[i]
      
      plusDM += upMove > downMove && upMove > 0 ? upMove : 0
      minusDM += downMove > upMove && downMove > 0 ? downMove : 0
      tr += Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      )
    }
    
    const plusDI = tr > 0 ? (plusDM / tr) * 100 : 0
    const minusDI = tr > 0 ? (minusDM / tr) * 100 : 0
    
    const dx = (plusDI + minusDI) > 0 
      ? Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100 
      : 0
    
    return dx
  }
  
  private calculateATR(high: number[], low: number[], close: number[]): number {
    if (close.length < 15) return 0
    
    let trSum = 0
    for (let i = close.length - 14; i < close.length; i++) {
      trSum += Math.max(
        high[i] - low[i],
        Math.abs(high[i] - close[i - 1]),
        Math.abs(low[i] - close[i - 1])
      )
    }
    
    return trSum / 14
  }
  
  private calculateMomentum(close: number[]): number {
    if (close.length < 10) return 0
    
    const current = close[close.length - 1]
    const prev = close[close.length - 10]
    
    return (current - prev) / prev
  }
  
  private findSupportResistance(
    high: number[],
    low: number[],
    close: number[]
  ): { support: number; resistance: number } {
    const lookback = Math.min(20, close.length)
    const recentHighs = high.slice(-lookback)
    const recentLows = low.slice(-lookback)
    const currentPrice = close[close.length - 1]
    
    // Find pivot points
    const resistance = Math.max(...recentHighs.filter(h => h > currentPrice)) || currentPrice * 1.02
    const support = Math.min(...recentLows.filter(l => l < currentPrice)) || currentPrice * 0.98
    
    return { support, resistance }
  }
  
  private detectPattern(
    high: number[],
    low: number[],
    close: number[]
  ): string | null {
    if (close.length < 5) return null
    
    const last5 = close.slice(-5)
    const last5High = high.slice(-5)
    const last5Low = low.slice(-5)
    
    // Higher highs, higher lows (uptrend)
    if (last5.every((c, i) => i === 0 || c > last5[i - 1])) {
      return 'UPTREND'
    }
    
    // Lower highs, lower lows (downtrend)
    if (last5.every((c, i) => i === 0 || c < last5[i - 1])) {
      return 'DOWNTREND'
    }
    
    // Inside bar
    if (
      last5High[4] < last5High[3] &&
      last5Low[4] > last5Low[3]
    ) {
      return 'INSIDE_BAR'
    }
    
    // Outside bar
    if (
      last5High[4] > last5High[3] &&
      last5Low[4] < last5Low[3]
    ) {
      return 'OUTSIDE_BAR'
    }
    
    return null
  }
  
  private determineTrend(
    emaCross: number,
    rsi: number,
    macd: { histogram: number },
    adx: number
  ): { direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL'; strength: number } {
    let bullishScore = 0
    let bearishScore = 0
    
    // EMA cross
    if (emaCross > 0) bullishScore += 0.25
    else if (emaCross < 0) bearishScore += 0.25
    
    // RSI
    if (rsi > 60) bullishScore += 0.2
    else if (rsi < 40) bearishScore += 0.2
    
    // MACD
    if (macd.histogram > 0) bullishScore += 0.25
    else bearishScore += 0.25
    
    // ADX strength
    const adxStrength = adx > 25 ? 0.3 : adx > 20 ? 0.15 : 0.05
    
    if (bullishScore > bearishScore) {
      return { direction: 'BULLISH', strength: (bullishScore + adxStrength) / 2 }
    } else if (bearishScore > bullishScore) {
      return { direction: 'BEARISH', strength: (bearishScore + adxStrength) / 2 }
    }
    
    return { direction: 'NEUTRAL', strength: 0.5 }
  }
  
  private calculateStrength(
    emaCross: number,
    rsi: number,
    macd: { histogram: number },
    adx: number
  ): number {
    // ADX is primary strength indicator
    let strength = adx / 100
    
    // Boost if indicators align
    if (Math.abs(emaCross) > 0.5 && Math.abs(macd.histogram) > 0.0001) {
      strength = Math.min(1, strength * 1.2)
    }
    
    // RSI confirmation
    if ((rsi > 70 || rsi < 30) && adx > 25) {
      strength = Math.min(1, strength * 1.15)
    }
    
    return strength
  }
  
  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================
  
  /**
   * Get configuration
   */
  getConfig(): MTFConfig {
    return { ...this.config }
  }
  
  /**
   * Set configuration
   */
  setConfig(config: Partial<MTFConfig>): void {
    this.config = { ...this.config, ...config }
  }
  
  /**
   * Clear data
   */
  clear(): void {
    this.timeframeData.clear()
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let mtfInstance: MultiTimeframeAnalyzer | null = null

export function getMultiTimeframeAnalyzer(config?: Partial<MTFConfig>): MultiTimeframeAnalyzer {
  if (!mtfInstance) {
    mtfInstance = new MultiTimeframeAnalyzer(config)
  }
  return mtfInstance
}

export function resetMultiTimeframeAnalyzer(): void {
  mtfInstance = null
}

export default MultiTimeframeAnalyzer
