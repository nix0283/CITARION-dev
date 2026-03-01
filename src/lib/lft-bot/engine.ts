/**
 * LFT Bot Engine (Low-Frequency Trading)
 * 
 * Institutional-grade low-frequency/position trading engine:
 * - Holding period: 1 day to 2 weeks
 * - Multi-timeframe analysis (4h, 1d, 1w)
 * - Macro trend analysis
 * - Fundamental + Technical integration
 * - Swing trading strategies
 * - Algorithmic scaling (position pyramiding)
 * - Portfolio-level risk management
 * - Correlation-aware position sizing
 * 
 * Author: Algorithmic Trading Division
 * Version: 1.0.0
 */

// ==================== TYPES ====================

export type LFTStrategy = 'TREND_FOLLOWING' | 'SWING_TRADING' | 'BREAKOUT' | 'POSITION_REVERSAL' | 'MACRO_MOMENTUM';
export type LFTTimeframe = '4h' | '1d' | '1w';
export type TrendDirection = 'STRONG_UP' | 'UP' | 'SIDEWAYS' | 'DOWN' | 'STRONG_DOWN';
export type MarketPhase = 'ACCUMULATION' | 'MARKUP' | 'DISTRIBUTION' | 'MARKDOWN';
export type PositionScale = 'INITIAL' | 'PYRAMID_1' | 'PYRAMID_2' | 'FULL';

export interface MacroIndicators {
  btcDominance: number;
  totalMarketCap: number;
  fearGreedIndex: number;
  fundingRateAvg: number;
  openInterestChange: number;
  stablecoinInflow: number;
  exchangeOutflow: number;
  whaleAccumulation: number;
}

export interface TrendAnalysis {
  direction: TrendDirection;
  strength: number;          // 0-100
  phase: MarketPhase;
  primaryTrend: LFTTimeframe;
  secondaryTrend: LFTTimeframe;
  trendAge: number;          // Days since trend started
  exhaustionSignals: number; // 0-10
}

export interface MultiTimeframeAnalysis {
  timeframe: LFTTimeframe;
  trend: TrendDirection;
  momentum: number;
  volatility: number;
  volume: number;
  support: number;
  resistance: number;
  keyLevels: number[];
  signals: string[];
}

export interface LFTSignal {
  id: string;
  symbol: string;
  timestamp: number;
  strategy: LFTStrategy;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  
  // Multi-timeframe analysis
  mtfAnalysis: {
    '4h': MultiTimeframeAnalysis;
    '1d': MultiTimeframeAnalysis;
    '1w'?: MultiTimeframeAnalysis;
  };
  
  // Entry/Exit
  entryZone: { min: number; max: number };
  entryPrice: number;
  stopLoss: number;
  takeProfitLevels: Array<{ price: number; percent: number }>;
  
  // Position management
  positionSize: number;
  scaleInLevels: Array<{ price: number; size: number }>;
  scaleOutLevels: Array<{ price: number; percent: number }>;
  
  // Timing
  expectedHoldingDays: number;
  maxHoldingDays: number;
  timeframe: LFTTimeframe;
  
  // Risk
  riskRewardRatio: number;
  maxDrawdownRisk: number;
  correlationRisk: number;
  
  // Macro context
  macroContext: MacroIndicators | null;
  trendContext: TrendAnalysis;
  
  // Execution
  executionStyle: 'SCALE_IN' | 'ALL_IN' | 'WAIT_CONFIRMATION';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface LFTPosition {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  strategy: LFTStrategy;
  
  // Position tracking
  totalSize: number;
  avgEntryPrice: number;
  currentPrice: number;
  currentValue: number;
  
  // Scale tracking
  entries: Array<{ price: number; size: number; timestamp: number }>;
  exits: Array<{ price: number; size: number; timestamp: number; pnl: number }>;
  scale: PositionScale;
  
  // Risk management
  stopLoss: number;
  takeProfitLevels: Array<{ price: number; percent: number; hit: boolean }>;
  trailingStop: number;
  trailingActivated: boolean;
  
  // PnL
  realizedPnL: number;
  unrealizedPnL: number;
  pnlPercent: number;
  highestPrice: number;
  lowestPrice: number;
  
  // Timing
  openedAt: number;
  expectedClose: number;
  maxClose: number;
  holdingDays: number;
  
  // Metadata
  trend: TrendAnalysis;
  timeframe: LFTTimeframe;
  notes: string[];
}

export interface LFTConfig {
  // Strategy settings
  enabledStrategies: LFTStrategy[];
  primaryStrategy: LFTStrategy;
  defaultTimeframe: LFTTimeframe;
  
  // Position settings
  maxPositions: number;
  maxPositionSize: number;
  maxPositionValue: number;
  maxSectorExposure: number;      // % in correlated assets
  
  // Holding period
  minHoldingDays: number;
  maxHoldingDays: number;
  defaultHoldingDays: number;
  
  // Risk management
  maxRiskPerPosition: number;     // % of portfolio
  maxPortfolioRisk: number;       // Total % at risk
  maxDailyLoss: number;
  maxDrawdown: number;
  stopLossPercent: number;
  takeProfitPercent: number;
  
  // Scaling
  enablePyramiding: boolean;
  maxPyramidLevels: number;
  pyramidSizeMultiplier: number;
  scaleInSteps: number;
  scaleOutSteps: number;
  
  // Trailing
  trailingStopEnabled: boolean;
  trailingStopPercent: number;
  trailingActivationPercent: number;
  
  // Trend following
  trendStrengthMin: number;       // Minimum trend strength to enter
  mtfAlignmentRequired: boolean;  // Require multi-timeframe alignment
  trendConfirmationPeriod: number;
  
  // Macro filters
  useMacroFilters: boolean;
  fearGreedRange: [number, number];
  fundingRateRange: [number, number];
  whaleAccumulationMin: number;
  
  // Correlation
  maxCorrelatedAssets: number;
  correlationThreshold: number;
  
  // Execution
  slippageTolerance: number;
  maxSpreadPercent: number;
  minLiquidity: number;
}

export const DEFAULT_LFT_CONFIG: LFTConfig = {
  enabledStrategies: ['TREND_FOLLOWING', 'SWING_TRADING', 'BREAKOUT'],
  primaryStrategy: 'TREND_FOLLOWING',
  defaultTimeframe: '1d',
  maxPositions: 10,
  maxPositionSize: 10,
  maxPositionValue: 50000,
  maxSectorExposure: 30,
  minHoldingDays: 1,
  maxHoldingDays: 14,
  defaultHoldingDays: 5,
  maxRiskPerPosition: 2,
  maxPortfolioRisk: 8,
  maxDailyLoss: 5,
  maxDrawdown: 15,
  stopLossPercent: 5,
  takeProfitPercent: 15,
  enablePyramiding: true,
  maxPyramidLevels: 2,
  pyramidSizeMultiplier: 0.5,
  scaleInSteps: 3,
  scaleOutSteps: 4,
  trailingStopEnabled: true,
  trailingStopPercent: 3,
  trailingActivationPercent: 5,
  trendStrengthMin: 40,
  mtfAlignmentRequired: true,
  trendConfirmationPeriod: 3,
  useMacroFilters: true,
  fearGreedRange: [20, 80],
  fundingRateRange: [-0.01, 0.01],
  whaleAccumulationMin: 0.3,
  maxCorrelatedAssets: 3,
  correlationThreshold: 0.7,
  slippageTolerance: 0.5,
  maxSpreadPercent: 0.5,
  minLiquidity: 500000,
};

// ==================== TREND ANALYZER ====================

export class TrendAnalyzer {
  private priceHistory: Map<string, Array<{ open: number; high: number; low: number; close: number; volume: number; timestamp: number }>> = new Map();
  private trendHistory: Map<string, TrendAnalysis[]> = new Map();
  private config: { confirmationPeriod: number; strengthMin: number };

  constructor(confirmationPeriod: number = 3, strengthMin: number = 40) {
    this.config = { confirmationPeriod, strengthMin };
  }

  update(symbol: string, ohlcv: { open: number; high: number; low: number; close: number; volume: number; timestamp: number }): void {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    const history = this.priceHistory.get(symbol)!;
    history.push(ohlcv);

    // Keep last 200 bars
    if (history.length > 200) {
      history.shift();
    }

    this.analyzeTrend(symbol);
  }

  private analyzeTrend(symbol: string): TrendAnalysis | null {
    const history = this.priceHistory.get(symbol);
    if (!history || history.length < 50) return null;

    const closes = history.map(h => h.close);
    const highs = history.map(h => h.high);
    const lows = history.map(h => h.low);
    const volumes = history.map(h => h.volume);

    // Calculate SMAs
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, 200);
    const currentPrice = closes[closes.length - 1];

    // Determine direction
    let direction: TrendDirection;
    const smaTrend = sma20 > sma50 && sma50 > (sma200 || sma50);
    const priceVsSMAs = currentPrice > sma20 && currentPrice > sma50;
    
    if (smaTrend && priceVsSMAs) {
      direction = currentPrice > sma20 * 1.05 ? 'STRONG_UP' : 'UP';
    } else if (!smaTrend && !priceVsSMAs) {
      direction = currentPrice < sma20 * 0.95 ? 'STRONG_DOWN' : 'DOWN';
    } else {
      direction = 'SIDEWAYS';
    }

    // Calculate strength (0-100)
    const adx = this.calculateADX(highs, lows, closes, 14);
    const volumeStrength = this.calculateVolumeStrength(volumes);
    const momentumStrength = this.calculateMomentumStrength(closes);
    const strength = Math.min(100, (adx * 0.4 + volumeStrength * 0.3 + momentumStrength * 0.3));

    // Determine phase (Wyckoff)
    const phase = this.determineMarketPhase(closes, volumes);

    // Calculate trend age
    const trendAge = this.calculateTrendAge(symbol, direction);

    // Check for exhaustion
    const exhaustionSignals = this.checkExhaustion(closes, volumes, direction);

    const analysis: TrendAnalysis = {
      direction,
      strength,
      phase,
      primaryTrend: '1d',
      secondaryTrend: '4h',
      trendAge,
      exhaustionSignals,
    };

    // Store trend history
    if (!this.trendHistory.has(symbol)) {
      this.trendHistory.set(symbol, []);
    }
    this.trendHistory.get(symbol)!.push(analysis);

    return analysis;
  }

  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private calculateADX(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < period * 2) return 25; // Default

    let plusDM = 0;
    let minusDM = 0;
    let tr = 0;

    for (let i = 1; i < Math.min(period * 2, highs.length); i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      
      plusDM += upMove > downMove && upMove > 0 ? upMove : 0;
      minusDM += downMove > upMove && downMove > 0 ? downMove : 0;
      tr += Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    }

    const plusDI = (plusDM / tr) * 100;
    const minusDI = (minusDM / tr) * 100;
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

    return Math.min(100, dx * 1.5); // Scale up
  }

  private calculateVolumeStrength(volumes: number[]): number {
    if (volumes.length < 20) return 50;
    const recent = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const avg = volumes.slice(-50).reduce((a, b) => a + b, 0) / 50;
    return Math.min(100, (recent / avg) * 50);
  }

  private calculateMomentumStrength(closes: number[]): number {
    if (closes.length < 20) return 50;
    const roc = ((closes[closes.length - 1] - closes[closes.length - 20]) / closes[closes.length - 20]) * 100;
    return Math.min(100, Math.abs(roc) * 10);
  }

  private determineMarketPhase(closes: number[], volumes: number[]): MarketPhase {
    if (closes.length < 50) return 'ACCUMULATION';

    const priceChange = (closes[closes.length - 1] - closes[closes.length - 50]) / closes[closes.length - 50];
    const volRecent = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const volAvg = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    if (Math.abs(priceChange) < 0.05 && volRecent < volAvg) return 'ACCUMULATION';
    if (priceChange > 0.05 && volRecent > volAvg) return 'MARKUP';
    if (Math.abs(priceChange) < 0.05 && volRecent > volAvg) return 'DISTRIBUTION';
    if (priceChange < -0.05) return 'MARKDOWN';
    
    return 'ACCUMULATION';
  }

  private calculateTrendAge(symbol: string, currentDirection: TrendDirection): number {
    const history = this.trendHistory.get(symbol);
    if (!history || history.length === 0) return 1;

    let age = 1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].direction === currentDirection) age++;
      else break;
    }
    return age;
  }

  private checkExhaustion(closes: number[], volumes: number[], direction: TrendDirection): number {
    let signals = 0;
    
    // Price divergence
    const priceROC = (closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5];
    if (direction.includes('UP') && priceROC < 0.01) signals++;
    if (direction.includes('DOWN') && priceROC > -0.01) signals++;

    // Volume divergence
    const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const avgVol = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    if ((direction.includes('UP') || direction.includes('DOWN')) && recentVol < avgVol * 0.7) signals++;

    return Math.min(10, signals * 3);
  }

  getTrend(symbol: string): TrendAnalysis | null {
    const history = this.trendHistory.get(symbol);
    return history ? history[history.length - 1] : null;
  }
}

// ==================== MULTI-TIMEFRAME ANALYZER ====================

export class MultiTimeframeAnalyzer {
  private data: Map<string, Map<LFTTimeframe, Array<{ ohlcv: { open: number; high: number; low: number; close: number; volume: number }; timestamp: number }>>> = new Map();

  update(symbol: string, timeframe: LFTTimeframe, ohlcv: { open: number; high: number; low: number; close: number; volume: number }): void {
    if (!this.data.has(symbol)) {
      this.data.set(symbol, new Map());
    }
    const tfData = this.data.get(symbol)!;
    
    if (!tfData.has(timeframe)) {
      tfData.set(timeframe, []);
    }
    
    const history = tfData.get(timeframe)!;
    history.push({ ohlcv, timestamp: Date.now() });

    if (history.length > 100) {
      history.shift();
    }
  }

  analyze(symbol: string, timeframe: LFTTimeframe): MultiTimeframeAnalysis {
    const tfData = this.data.get(symbol)?.get(timeframe);
    
    if (!tfData || tfData.length < 20) {
      return {
        timeframe,
        trend: 'SIDEWAYS',
        momentum: 0,
        volatility: 0,
        volume: 0,
        support: 0,
        resistance: 0,
        keyLevels: [],
        signals: ['Insufficient data'],
      };
    }

    const closes = tfData.map(d => d.ohlcv.close);
    const highs = tfData.map(d => d.ohlcv.high);
    const lows = tfData.map(d => d.ohlcv.low);
    const volumes = tfData.map(d => d.ohlcv.volume);

    // Calculate metrics
    const currentPrice = closes[closes.length - 1];
    const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);

    // Trend
    let trend: TrendDirection;
    if (currentPrice > sma20 && sma20 > sma50) trend = 'UP';
    else if (currentPrice < sma20 && sma20 < sma50) trend = 'DOWN';
    else trend = 'SIDEWAYS';

    // Momentum (ROC)
    const momentum = closes.length > 10 
      ? ((closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10]) * 100
      : 0;

    // Volatility
    const returns = closes.slice(-20).map((c, i) => i > 0 ? (c - closes[closes.length - 20 + i - 1]) / closes[closes.length - 20 + i - 1] : 0);
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * 100;

    // Support/Resistance
    const support = Math.min(...lows.slice(-20));
    const resistance = Math.max(...highs.slice(-20));

    // Key levels (pivot points)
    const keyLevels = this.findKeyLevels(highs, lows, closes);

    // Generate signals
    const signals: string[] = [];
    if (trend === 'UP' && momentum > 2) signals.push('Bullish momentum');
    if (trend === 'DOWN' && momentum < -2) signals.push('Bearish momentum');
    if (currentPrice < support * 1.02) signals.push('Near support');
    if (currentPrice > resistance * 0.98) signals.push('Near resistance');

    return {
      timeframe,
      trend,
      momentum,
      volatility,
      volume: volumes[volumes.length - 1],
      support,
      resistance,
      keyLevels,
      signals,
    };
  }

  private findKeyLevels(highs: number[], lows: number[], closes: number[]): number[] {
    const levels: number[] = [];
    
    // Find pivot highs and lows
    for (let i = 5; i < highs.length - 5; i++) {
      const highWindow = highs.slice(i - 5, i + 5);
      const lowWindow = lows.slice(i - 5, i + 5);
      
      if (highs[i] === Math.max(...highWindow)) {
        levels.push(highs[i]);
      }
      if (lows[i] === Math.min(...lowWindow)) {
        levels.push(lows[i]);
      }
    }

    // Return unique levels, sorted
    return [...new Set(levels)].sort((a, b) => a - b).slice(-10);
  }

  checkAlignment(symbol: string): { aligned: boolean; direction: 'LONG' | 'SHORT' | null; strength: number } {
    const tf4h = this.analyze(symbol, '4h');
    const tf1d = this.analyze(symbol, '1d');

    if (tf4h.trend === tf1d.trend && tf4h.trend !== 'SIDEWAYS') {
      return {
        aligned: true,
        direction: tf4h.trend === 'UP' ? 'LONG' : 'SHORT',
        strength: (Math.abs(tf4h.momentum) + Math.abs(tf1d.momentum)) / 2,
      };
    }

    return { aligned: false, direction: null, strength: 0 };
  }
}

// ==================== LFT ENGINE ====================

export class LFTEngine {
  private config: LFTConfig;
  private positions: Map<string, LFTPosition> = new Map();
  private signals: LFTSignal[] = [];
  private trendAnalyzer: TrendAnalyzer;
  private mtfAnalyzer: MultiTimeframeAnalyzer;
  private metrics = {
    totalTrades: 0,
    winTrades: 0,
    lossTrades: 0,
    totalPnL: 0,
    avgHoldingDays: 0,
    winRate: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    dailyPnL: 0,
    peakEquity: 0,
    portfolioRisk: 0,
  };
  private correlationMatrix: Map<string, Map<string, number>> = new Map();

  constructor(config: Partial<LFTConfig> = {}) {
    this.config = { ...DEFAULT_LFT_CONFIG, ...config };
    this.trendAnalyzer = new TrendAnalyzer(this.config.trendConfirmationPeriod, this.config.trendStrengthMin);
    this.mtfAnalyzer = new MultiTimeframeAnalyzer();
  }

  /**
   * Update with new market data
   */
  update(symbol: string, timeframe: LFTTimeframe, ohlcv: { open: number; high: number; low: number; close: number; volume: number }): void {
    this.trendAnalyzer.update(symbol, { ...ohlcv, timestamp: Date.now() });
    this.mtfAnalyzer.update(symbol, timeframe, ohlcv);
    this.updatePositions(ohlcv.close);
  }

  /**
   * Generate position signal
   */
  generateSignal(
    symbol: string,
    strategy: LFTStrategy,
    currentPrice: number,
    macroContext?: MacroIndicators
  ): LFTSignal | null {
    if (this.positions.size >= this.config.maxPositions) return null;

    const trend = this.trendAnalyzer.getTrend(symbol);
    const mtf4h = this.mtfAnalyzer.analyze(symbol, '4h');
    const mtf1d = this.mtfAnalyzer.analyze(symbol, '1d');
    const alignment = this.mtfAnalyzer.checkAlignment(symbol);

    // Check MTF alignment if required
    if (this.config.mtfAlignmentRequired && !alignment.aligned) {
      return null;
    }

    // Check trend strength
    if (!trend || trend.strength < this.config.trendStrengthMin) {
      return null;
    }

    // Check macro filters
    if (this.config.useMacroFilters && macroContext) {
      if (macroContext.fearGreedIndex < this.config.fearGreedRange[0] ||
          macroContext.fearGreedIndex > this.config.fearGreedRange[1]) {
        return null;
      }
      if (macroContext.fundingRateAvg < this.config.fundingRateRange[0] ||
          macroContext.fundingRateAvg > this.config.fundingRateRange[1]) {
        return null;
      }
    }

    // Strategy-specific logic
    let direction: 'LONG' | 'SHORT' | null = null;
    let confidence = 0;

    switch (strategy) {
      case 'TREND_FOLLOWING':
        if (alignment.aligned && alignment.direction) {
          direction = alignment.direction;
          confidence = Math.min(0.9, (trend.strength / 100) * 0.7 + (alignment.strength / 20) * 0.3);
        }
        break;

      case 'SWING_TRADING':
        if (trend.phase === 'ACCUMULATION' && mtf4h.trend === 'UP') {
          direction = 'LONG';
          confidence = 0.7;
        } else if (trend.phase === 'DISTRIBUTION' && mtf4h.trend === 'DOWN') {
          direction = 'SHORT';
          confidence = 0.7;
        }
        break;

      case 'BREAKOUT':
        if (currentPrice > mtf1d.resistance * 0.99 && mtf4h.trend === 'UP') {
          direction = 'LONG';
          confidence = 0.75;
        } else if (currentPrice < mtf1d.support * 1.01 && mtf4h.trend === 'DOWN') {
          direction = 'SHORT';
          confidence = 0.75;
        }
        break;

      case 'MACRO_MOMENTUM':
        if (macroContext && macroContext.whaleAccumulation > this.config.whaleAccumulationMin && trend.direction.includes('UP')) {
          direction = 'LONG';
          confidence = 0.8;
        }
        break;

      default:
        return null;
    }

    if (!direction || confidence < 0.5) return null;

    // Calculate entry zone and stop/target
    const entryZone = {
      min: currentPrice * 0.99,
      max: currentPrice * 1.01,
    };

    const stopLoss = direction === 'LONG'
      ? currentPrice * (1 - this.config.stopLossPercent / 100)
      : currentPrice * (1 + this.config.stopLossPercent / 100);

    const takeProfitLevels = [
      { price: currentPrice * (1 + this.config.takeProfitPercent * 0.5 / 100), percent: 25 },
      { price: currentPrice * (1 + this.config.takeProfitPercent / 100), percent: 50 },
      { price: currentPrice * (1 + this.config.takeProfitPercent * 1.5 / 100), percent: 25 },
    ];

    // Scale-in levels
    const scaleInLevels = this.config.enablePyramiding
      ? [
          { price: currentPrice, size: 0.5 },
          { price: direction === 'LONG' ? currentPrice * 1.02 : currentPrice * 0.98, size: 0.3 },
          { price: direction === 'LONG' ? currentPrice * 1.04 : currentPrice * 0.96, size: 0.2 },
        ]
      : [{ price: currentPrice, size: 1 }];

    const riskRewardRatio = this.config.takeProfitPercent / this.config.stopLossPercent;
    const positionSize = this.calculatePositionSize(currentPrice, stopLoss, confidence);

    const signal: LFTSignal = {
      id: `${symbol}-${strategy}-${Date.now()}`,
      symbol,
      timestamp: Date.now(),
      strategy,
      direction,
      confidence,
      mtfAnalysis: {
        '4h': mtf4h,
        '1d': mtf1d,
      },
      entryZone,
      entryPrice: currentPrice,
      stopLoss,
      takeProfitLevels: direction === 'LONG' ? takeProfitLevels : takeProfitLevels.map(tp => ({
        price: currentPrice - (tp.price - currentPrice),
        percent: tp.percent,
      })),
      positionSize,
      scaleInLevels,
      scaleOutLevels: takeProfitLevels.map(tp => ({ price: tp.price, percent: tp.percent })),
      expectedHoldingDays: this.config.defaultHoldingDays,
      maxHoldingDays: this.config.maxHoldingDays,
      timeframe: this.config.defaultTimeframe,
      riskRewardRatio,
      maxDrawdownRisk: this.config.stopLossPercent / 100,
      correlationRisk: 0,
      macroContext: macroContext || null,
      trendContext: trend,
      executionStyle: this.config.enablePyramiding ? 'SCALE_IN' : 'ALL_IN',
      urgency: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW',
    };

    this.signals.push(signal);
    return signal;
  }

  /**
   * Execute signal
   */
  executeSignal(signal: LFTSignal, initialSize?: number): LFTPosition | null {
    if (this.positions.size >= this.config.maxPositions) return null;

    const size = initialSize || signal.positionSize * (signal.scaleInLevels[0]?.size || 1);

    const position: LFTPosition = {
      id: `lft-${Date.now()}`,
      symbol: signal.symbol,
      direction: signal.direction,
      strategy: signal.strategy,
      totalSize: size,
      avgEntryPrice: signal.entryPrice,
      currentPrice: signal.entryPrice,
      currentValue: size * signal.entryPrice,
      entries: [{ price: signal.entryPrice, size, timestamp: Date.now() }],
      exits: [],
      scale: 'INITIAL',
      stopLoss: signal.stopLoss,
      takeProfitLevels: signal.takeProfitLevels.map(tp => ({ ...tp, hit: false })),
      trailingStop: signal.stopLoss,
      trailingActivated: false,
      realizedPnL: 0,
      unrealizedPnL: 0,
      pnlPercent: 0,
      highestPrice: signal.entryPrice,
      lowestPrice: signal.entryPrice,
      openedAt: Date.now(),
      expectedClose: Date.now() + signal.expectedHoldingDays * 24 * 60 * 60 * 1000,
      maxClose: Date.now() + signal.maxHoldingDays * 24 * 60 * 60 * 1000,
      holdingDays: 0,
      trend: signal.trendContext,
      timeframe: signal.timeframe,
      notes: [],
    };

    this.positions.set(position.id, position);
    return position;
  }

  /**
   * Add to position (pyramiding)
   */
  addToPosition(positionId: string, price: number, size: number): boolean {
    const position = this.positions.get(positionId);
    if (!position) return false;

    const newSize = position.totalSize + size;
    const newAvgEntry = ((position.avgEntryPrice * position.totalSize) + (price * size)) / newSize;

    position.totalSize = newSize;
    position.avgEntryPrice = newAvgEntry;
    position.entries.push({ price, size, timestamp: Date.now() });
    position.scale = position.scale === 'INITIAL' ? 'PYRAMID_1' : 'PYRAMID_2';

    return true;
  }

  /**
   * Update all positions
   */
  private updatePositions(currentPrice: number): void {
    for (const position of this.positions.values()) {
      position.currentPrice = currentPrice;
      position.holdingDays = (Date.now() - position.openedAt) / (24 * 60 * 60 * 1000);

      // Update high/low
      if (currentPrice > position.highestPrice) {
        position.highestPrice = currentPrice;
        
        // Activate trailing stop
        const gainPercent = ((currentPrice - position.avgEntryPrice) / position.avgEntryPrice) * 100;
        if (gainPercent >= this.config.trailingActivationPercent && this.config.trailingStopEnabled) {
          position.trailingActivated = true;
          position.trailingStop = position.highestPrice * (1 - this.config.trailingStopPercent / 100);
        }
      }
      if (currentPrice < position.lowestPrice) {
        position.lowestPrice = currentPrice;
      }

      // Calculate PnL
      if (position.direction === 'LONG') {
        position.unrealizedPnL = (currentPrice - position.avgEntryPrice) * position.totalSize;
        position.pnlPercent = ((currentPrice - position.avgEntryPrice) / position.avgEntryPrice) * 100;
      } else {
        position.unrealizedPnL = (position.avgEntryPrice - currentPrice) * position.totalSize;
        position.pnlPercent = ((position.avgEntryPrice - currentPrice) / position.avgEntryPrice) * 100;
      }

      // Check stop loss
      if (position.direction === 'LONG' && currentPrice <= (position.trailingActivated ? position.trailingStop : position.stopLoss)) {
        this.closePosition(position.id, currentPrice);
        continue;
      }
      if (position.direction === 'SHORT' && currentPrice >= (position.trailingActivated ? position.trailingStop : position.stopLoss)) {
        this.closePosition(position.id, currentPrice);
        continue;
      }

      // Check take profit levels
      for (const tp of position.takeProfitLevels) {
        if (!tp.hit && (
          (position.direction === 'LONG' && currentPrice >= tp.price) ||
          (position.direction === 'SHORT' && currentPrice <= tp.price)
        )) {
          tp.hit = true;
          // Partial close
          const closeSize = position.totalSize * (tp.percent / 100);
          position.exits.push({ price: currentPrice, size: closeSize, timestamp: Date.now(), pnl: 0 });
          position.totalSize -= closeSize;
          position.realizedPnL += (currentPrice - position.avgEntryPrice) * closeSize;
        }
      }

      // Check max holding time
      if (position.holdingDays >= position.maxHoldingDays / (24 * 60 * 60 * 1000)) {
        this.closePosition(position.id, currentPrice);
      }
    }
  }

  /**
   * Close position
   */
  closePosition(positionId: string, price: number): LFTPosition | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    // Calculate final PnL
    if (position.direction === 'LONG') {
      position.unrealizedPnL = (price - position.avgEntryPrice) * position.totalSize;
      position.pnlPercent = ((price - position.avgEntryPrice) / position.avgEntryPrice) * 100;
    } else {
      position.unrealizedPnL = (position.avgEntryPrice - price) * position.totalSize;
      position.pnlPercent = ((position.avgEntryPrice - price) / position.avgEntryPrice) * 100;
    }

    const totalPnL = position.realizedPnL + position.unrealizedPnL;

    // Update metrics
    this.metrics.totalTrades++;
    this.metrics.totalPnL += totalPnL;
    
    if (totalPnL >= 0) {
      this.metrics.winTrades++;
    } else {
      this.metrics.lossTrades++;
    }
    this.metrics.winRate = this.metrics.winTrades / this.metrics.totalTrades;
    this.metrics.avgHoldingDays = (this.metrics.avgHoldingDays * (this.metrics.totalTrades - 1) + position.holdingDays) / this.metrics.totalTrades;

    this.positions.delete(positionId);
    return position;
  }

  /**
   * Calculate position size
   */
  private calculatePositionSize(entry: number, stop: number, confidence: number): number {
    const riskAmount = this.config.maxPositionValue * (this.config.maxRiskPerPosition / 100);
    const stopDistance = Math.abs(entry - stop);
    const rawSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
    
    return Math.min(rawSize * confidence, this.config.maxPositionSize);
  }

  /**
   * Get state
   */
  getState() {
    return {
      config: this.config,
      positions: Array.from(this.positions.values()),
      signals: this.signals.slice(-50),
      metrics: this.metrics,
    };
  }

  getConfig(): LFTConfig {
    return this.config;
  }

  updateConfig(config: Partial<LFTConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default { LFTEngine, TrendAnalyzer, MultiTimeframeAnalyzer, DEFAULT_LFT_CONFIG };
