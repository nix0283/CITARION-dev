/**
 * MFT Bot Engine (Medium-Frequency Trading)
 * 
 * Institutional-grade medium-frequency trading engine:
 * - Holding period: 15 minutes to 4 hours
 * - Multi-timeframe analysis (1m, 5m, 15m, 1h)
 * - Volume Profile & VWAP strategies
 * - Market microstructure signals
 * - Statistical arbitrage on short timeframes
 * - Algorithmic execution (TWAP, POV)
 * - Regime detection and adaptation
 * 
 * Author: Algorithmic Trading Division
 * Version: 1.0.0
 */

// ==================== TYPES ====================

export type MFTStrategy = 'MOMENTUM' | 'MEAN_REVERSION' | 'VWAP_REVERSION' | 'VOLUME_BREAKOUT' | 'STAT_ARB';
export type MFTTimeframe = '1m' | '5m' | '15m' | '1h';
export type MFTRegime = 'TRENDING' | 'RANGING' | 'VOLATILE' | 'QUIET' | 'TRANSITION';
export type ExecutionAlgorithm = 'TWAP' | 'POV' | 'VWAP' | 'IS' | 'AGGRESSIVE';

export interface VolumeProfile {
  priceLevels: Map<number, { volume: number; buyVolume: number; sellVolume: number }>;
  poc: number;           // Point of Control
  vah: number;           // Value Area High
  val: number;           // Value Area Low
  profileStrength: number;
}

export interface VWAPMetrics {
  vwap: number;
  upperBand: number;
  lowerBand: number;
  currentPrice: number;
  deviation: number;      // Standard deviations from VWAP
  volumeRatio: number;    // Current volume vs average
}

export interface MFTSignal {
  id: string;
  symbol: string;
  timestamp: number;
  strategy: MFTStrategy;
  direction: 'LONG' | 'SHORT';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  holdingPeriod: number;  // Expected holding time in minutes
  timeframe: MFTTimeframe;
  regime: MFTRegime;
  volumeProfile: VolumeProfile | null;
  vwapMetrics: VWAPMetrics | null;
  executionAlgorithm: ExecutionAlgorithm;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
  riskRewardRatio: number;
  maxHoldTime: number;
  trailingStop: boolean;
  trailingPercent: number;
}

export interface MFTPosition {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  size: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  pnlPercent: number;
  openedAt: number;
  expectedClose: number;
  trailingStop: boolean;
  trailingPercent: number;
  highestPrice: number;
  lowestPrice: number;
  strategy: MFTStrategy;
  timeframe: MFTTimeframe;
}

export interface MFTConfig {
  // Strategy settings
  enabledStrategies: MFTStrategy[];
  defaultTimeframe: MFTTimeframe;
  primaryStrategy: MFTStrategy;
  
  // Position settings
  maxPositions: number;
  maxPositionSize: number;
  maxPositionValue: number;
  defaultHoldingPeriod: number;  // minutes
  maxHoldingPeriod: number;
  
  // Risk management
  maxRiskPerTrade: number;       // % of portfolio
  maxDailyLoss: number;          // % of portfolio
  maxDrawdown: number;           // % of portfolio
  stopLossPercent: number;
  takeProfitPercent: number;
  trailingStopEnabled: boolean;
  trailingStopPercent: number;
  
  // Execution settings
  defaultExecution: ExecutionAlgorithm;
  slippageTolerance: number;
  maxSpreadPercent: number;
  minLiquidity: number;
  
  // VWAP settings
  vwapPeriod: number;
  vwapDeviationEntry: number;    // Standard deviations for entry
  vwapDeviationStop: number;
  
  // Volume Profile settings
  volumeProfilePeriod: number;
  pocWeight: number;
  valueAreaPercent: number;
  
  // Regime detection
  regimeLookback: number;
  regimeConfirmation: number;
  
  // Correlation limits
  maxCorrelatedPositions: number;
  correlationThreshold: number;
}

export const DEFAULT_MFT_CONFIG: MFTConfig = {
  enabledStrategies: ['MOMENTUM', 'MEAN_REVERSION', 'VWAP_REVERSION', 'VOLUME_BREAKOUT'],
  defaultTimeframe: '15m',
  primaryStrategy: 'MOMENTUM',
  maxPositions: 8,
  maxPositionSize: 5,
  maxPositionValue: 10000,
  defaultHoldingPeriod: 60,
  maxHoldingPeriod: 240,
  maxRiskPerTrade: 1,
  maxDailyLoss: 3,
  maxDrawdown: 10,
  stopLossPercent: 1.5,
  takeProfitPercent: 3,
  trailingStopEnabled: true,
  trailingStopPercent: 1,
  defaultExecution: 'TWAP',
  slippageTolerance: 0.1,
  maxSpreadPercent: 0.2,
  minLiquidity: 100000,
  vwapPeriod: 24 * 60,           // 24 hours in minutes
  vwapDeviationEntry: 2,
  vwapDeviationStop: 3,
  volumeProfilePeriod: 60,
  pocWeight: 1.5,
  valueAreaPercent: 70,
  regimeLookback: 100,
  regimeConfirmation: 3,
  maxCorrelatedPositions: 3,
  correlationThreshold: 0.7,
};

// ==================== VOLUME PROFILE ANALYZER ====================

export class VolumeProfileAnalyzer {
  private priceVolumes: Map<number, { volume: number; buyVolume: number; sellVolume: number }> = new Map();
  private totalVolume: number = 0;
  private config: { period: number; valueAreaPercent: number };

  constructor(period: number = 60, valueAreaPercent: number = 70) {
    this.config = { period, valueAreaPercent };
  }

  update(trades: Array<{ price: number; volume: number; side: 'BUY' | 'SELL' }>): void {
    for (const trade of trades) {
      const priceKey = Math.round(trade.price * 100) / 100; // Round to 2 decimals
      const existing = this.priceVolumes.get(priceKey) || { volume: 0, buyVolume: 0, sellVolume: 0 };
      
      existing.volume += trade.volume;
      if (trade.side === 'BUY') existing.buyVolume += trade.volume;
      else existing.sellVolume += trade.volume;
      
      this.priceVolumes.set(priceKey, existing);
      this.totalVolume += trade.volume;
    }
  }

  calculate(): VolumeProfile {
    if (this.priceVolumes.size === 0) {
      return {
        priceLevels: new Map(),
        poc: 0,
        vah: 0,
        val: 0,
        profileStrength: 0,
      };
    }

    // Find POC (Point of Control) - price with highest volume
    let poc = 0;
    let maxVolume = 0;
    
    for (const [price, data] of this.priceVolumes) {
      if (data.volume > maxVolume) {
        maxVolume = data.volume;
        poc = price;
      }
    }

    // Calculate Value Area
    const targetVolume = this.totalVolume * (this.config.valueAreaPercent / 100);
    const sortedPrices = Array.from(this.priceVolumes.entries())
      .sort((a, b) => b[1].volume - a[1].volume);

    let accumulatedVolume = 0;
    const valueAreaPrices: number[] = [];
    
    for (const [price, data] of sortedPrices) {
      if (accumulatedVolume >= targetVolume) break;
      accumulatedVolume += data.volume;
      valueAreaPrices.push(price);
    }

    const vah = Math.max(...valueAreaPrices);
    const val = Math.min(...valueAreaPrices);

    // Calculate profile strength (how concentrated is volume around POC)
    const pocVolume = this.priceVolumes.get(poc)?.volume || 0;
    const profileStrength = this.totalVolume > 0 ? pocVolume / this.totalVolume : 0;

    return {
      priceLevels: this.priceVolumes,
      poc,
      vah,
      val,
      profileStrength,
    };
  }

  reset(): void {
    this.priceVolumes.clear();
    this.totalVolume = 0;
  }
}

// ==================== VWAP CALCULATOR ====================

export class VWAPCalculator {
  private cumulativeTPV: number = 0;  // Typical Price * Volume
  private cumulativeVolume: number = 0;
  private prices: Array<{ high: number; low: number; close: number; volume: number }> = [];
  private period: number;

  constructor(periodMinutes: number = 24 * 60) {
    this.period = periodMinutes;
  }

  update(high: number, low: number, close: number, volume: number): void {
    const typicalPrice = (high + low + close) / 3;
    this.cumulativeTPV += typicalPrice * volume;
    this.cumulativeVolume += volume;
    this.prices.push({ high, low, close, volume });

    // Keep only recent data
    if (this.prices.length > this.period) {
      const oldest = this.prices.shift()!;
      const oldestTP = (oldest.high + oldest.low + oldest.close) / 3;
      this.cumulativeTPV -= oldestTP * oldest.volume;
      this.cumulativeVolume -= oldest.volume;
    }
  }

  calculate(currentPrice: number): VWAPMetrics {
    const vwap = this.cumulativeVolume > 0 ? this.cumulativeTPV / this.cumulativeVolume : currentPrice;
    
    // Calculate standard deviation
    let sumSquaredDiff = 0;
    for (const p of this.prices) {
      const tp = (p.high + p.low + p.close) / 3;
      sumSquaredDiff += Math.pow(tp - vwap, 2) * p.volume;
    }
    const stdDev = this.cumulativeVolume > 0 
      ? Math.sqrt(sumSquaredDiff / this.cumulativeVolume) 
      : 0;

    return {
      vwap,
      upperBand: vwap + stdDev,
      lowerBand: vwap - stdDev,
      currentPrice,
      deviation: stdDev > 0 ? (currentPrice - vwap) / stdDev : 0,
      volumeRatio: this.prices.length > 0 
        ? this.prices[this.prices.length - 1].volume / (this.cumulativeVolume / this.prices.length)
        : 1,
    };
  }

  reset(): void {
    this.cumulativeTPV = 0;
    this.cumulativeVolume = 0;
    this.prices = [];
  }
}

// ==================== REGIME DETECTOR ====================

export class RegimeDetector {
  private priceHistory: number[] = [];
  private volumeHistory: number[] = [];
  private lookback: number;
  private confirmationCount: number;
  private currentRegime: MFTRegime = 'QUIET';
  private regimeHistory: MFTRegime[] = [];

  constructor(lookback: number = 100, confirmation: number = 3) {
    this.lookback = lookback;
    this.confirmationCount = confirmation;
  }

  update(price: number, volume: number): void {
    this.priceHistory.push(price);
    this.volumeHistory.push(volume);

    if (this.priceHistory.length > this.lookback) {
      this.priceHistory.shift();
      this.volumeHistory.shift();
    }

    this.detectRegime();
  }

  private detectRegime(): void {
    if (this.priceHistory.length < 20) return;

    const prices = this.priceHistory.slice(-50);
    const volumes = this.volumeHistory.slice(-50);

    // Calculate metrics
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const recentVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const volumeRatio = avgVolume > 0 ? recentVolume / avgVolume : 1;

    // Trend detection (using linear regression slope)
    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = prices.reduce((a, b) => a + b, 0);
    const sumXY = prices.reduce((sum, p, i) => sum + i * p, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const trendStrength = Math.abs(slope) / (prices[0] || 1);

    // Determine regime
    let newRegime: MFTRegime;
    
    if (volatility > 0.02 && volumeRatio > 1.5) {
      newRegime = 'VOLATILE';
    } else if (trendStrength > 0.0001) {
      newRegime = 'TRENDING';
    } else if (volatility < 0.005 && volumeRatio < 0.8) {
      newRegime = 'QUIET';
    } else if (volatility < 0.01) {
      newRegime = 'RANGING';
    } else {
      newRegime = 'TRANSITION';
    }

    // Require confirmation
    this.regimeHistory.push(newRegime);
    if (this.regimeHistory.length > this.confirmationCount) {
      this.regimeHistory.shift();
    }

    if (this.regimeHistory.length === this.confirmationCount) {
      const allSame = this.regimeHistory.every(r => r === newRegime);
      if (allSame) {
        this.currentRegime = newRegime;
      }
    }
  }

  getRegime(): MFTRegime {
    return this.currentRegime;
  }
}

// ==================== MFT ENGINE ====================

export class MFTEngine {
  private config: MFTConfig;
  private positions: Map<string, MFTPosition> = new Map();
  private signals: MFTSignal[] = [];
  private volumeProfileAnalyzer: VolumeProfileAnalyzer;
  private vwapCalculator: VWAPCalculator;
  private regimeDetector: RegimeDetector;
  private metrics = {
    totalTrades: 0,
    winTrades: 0,
    lossTrades: 0,
    totalPnL: 0,
    avgHoldingTime: 0,
    winRate: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    dailyPnL: 0,
    peakEquity: 0,
  };
  private priceHistory: Map<string, Array<{ high: number; low: number; close: number; volume: number }>> = new Map();

  constructor(config: Partial<MFTConfig> = {}) {
    this.config = { ...DEFAULT_MFT_CONFIG, ...config };
    this.volumeProfileAnalyzer = new VolumeProfileAnalyzer(this.config.volumeProfilePeriod, this.config.valueAreaPercent);
    this.vwapCalculator = new VWAPCalculator(this.config.vwapPeriod);
    this.regimeDetector = new RegimeDetector(this.config.regimeLookback, this.config.regimeConfirmation);
  }

  /**
   * Update with new market data
   */
  update(symbol: string, high: number, low: number, close: number, volume: number): void {
    // Store price history
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    const history = this.priceHistory.get(symbol)!;
    history.push({ high, low, close, volume });

    // Update VWAP
    this.vwapCalculator.update(high, low, close, volume);

    // Update regime
    this.regimeDetector.update(close, volume);

    // Update positions
    this.updatePositions(close);
  }

  /**
   * Generate signal based on strategy
   */
  generateSignal(
    symbol: string,
    strategy: MFTStrategy,
    currentPrice: number,
    additionalData?: { volume?: number; orderbookImbalance?: number }
  ): MFTSignal | null {
    if (this.positions.size >= this.config.maxPositions) return null;

    const regime = this.regimeDetector.getRegime();
    const vwapMetrics = this.vwapCalculator.calculate(currentPrice);
    const volumeProfile = this.volumeProfileAnalyzer.calculate();

    let direction: 'LONG' | 'SHORT' | null = null;
    let confidence = 0;
    let entryPrice = currentPrice;
    let stopLoss: number;
    let takeProfit: number;

    // Strategy-specific logic
    switch (strategy) {
      case 'VWAP_REVERSION':
        if (vwapMetrics.deviation < -this.config.vwapDeviationEntry) {
          direction = 'LONG';
          confidence = Math.min(0.9, Math.abs(vwapMetrics.deviation) / this.config.vwapDeviationEntry * 0.5);
        } else if (vwapMetrics.deviation > this.config.vwapDeviationEntry) {
          direction = 'SHORT';
          confidence = Math.min(0.9, vwapMetrics.deviation / this.config.vwapDeviationEntry * 0.5);
        }
        stopLoss = direction === 'LONG' 
          ? currentPrice * (1 - this.config.stopLossPercent / 100)
          : currentPrice * (1 + this.config.stopLossPercent / 100);
        takeProfit = direction === 'LONG'
          ? vwapMetrics.vwap
          : vwapMetrics.vwap;
        break;

      case 'MOMENTUM':
        if (regime === 'TRENDING' && additionalData?.volume && additionalData.volume > 0) {
          const priceHistory = this.priceHistory.get(symbol) || [];
          if (priceHistory.length >= 10) {
            const recentClose = priceHistory.slice(-10).map(p => p.close);
            const momentum = (recentClose[9] - recentClose[0]) / recentClose[0];
            
            if (momentum > 0.005 && vwapMetrics.deviation > 0) {
              direction = 'LONG';
              confidence = Math.min(0.85, momentum * 50);
            } else if (momentum < -0.005 && vwapMetrics.deviation < 0) {
              direction = 'SHORT';
              confidence = Math.min(0.85, Math.abs(momentum) * 50);
            }
          }
        }
        stopLoss = direction === 'LONG'
          ? currentPrice * (1 - this.config.stopLossPercent / 100)
          : currentPrice * (1 + this.config.stopLossPercent / 100);
        takeProfit = direction === 'LONG'
          ? currentPrice * (1 + this.config.takeProfitPercent / 100)
          : currentPrice * (1 - this.config.takeProfitPercent / 100);
        break;

      case 'VOLUME_BREAKOUT':
        if (volumeProfile.profileStrength > 0.15 && currentPrice > volumeProfile.vah) {
          direction = 'LONG';
          confidence = 0.7 + (volumeProfile.profileStrength * 0.5);
        } else if (volumeProfile.profileStrength > 0.15 && currentPrice < volumeProfile.val) {
          direction = 'SHORT';
          confidence = 0.7 + (volumeProfile.profileStrength * 0.5);
        }
        stopLoss = direction === 'LONG'
          ? volumeProfile.poc
          : volumeProfile.poc;
        takeProfit = direction === 'LONG'
          ? currentPrice * (1 + this.config.takeProfitPercent / 100)
          : currentPrice * (1 - this.config.takeProfitPercent / 100);
        break;

      case 'MEAN_REVERSION':
        if (regime === 'RANGING') {
          if (vwapMetrics.deviation < -this.config.vwapDeviationEntry) {
            direction = 'LONG';
            confidence = 0.6 + Math.abs(vwapMetrics.deviation) * 0.1;
          } else if (vwapMetrics.deviation > this.config.vwapDeviationEntry) {
            direction = 'SHORT';
            confidence = 0.6 + vwapMetrics.deviation * 0.1;
          }
        }
        stopLoss = direction === 'LONG'
          ? currentPrice * (1 - this.config.stopLossPercent / 100)
          : currentPrice * (1 + this.config.stopLossPercent / 100);
        takeProfit = direction === 'LONG'
          ? vwapMetrics.vwap
          : vwapMetrics.vwap;
        break;

      default:
        return null;
    }

    if (!direction || confidence < 0.5) return null;

    const riskRewardRatio = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss);
    if (riskRewardRatio < 1.5) return null;

    const positionSize = this.calculatePositionSize(entryPrice, stopLoss, confidence);

    const signal: MFTSignal = {
      id: `${symbol}-${strategy}-${Date.now()}`,
      symbol,
      timestamp: Date.now(),
      strategy,
      direction,
      confidence,
      entryPrice,
      stopLoss,
      takeProfit,
      positionSize,
      holdingPeriod: this.config.defaultHoldingPeriod,
      timeframe: this.config.defaultTimeframe,
      regime,
      volumeProfile,
      vwapMetrics,
      executionAlgorithm: this.config.defaultExecution,
      urgency: confidence > 0.8 ? 'HIGH' : confidence > 0.6 ? 'MEDIUM' : 'LOW',
      riskRewardRatio,
      maxHoldTime: this.config.maxHoldingPeriod,
      trailingStop: this.config.trailingStopEnabled,
      trailingPercent: this.config.trailingStopPercent,
    };

    this.signals.push(signal);
    return signal;
  }

  /**
   * Execute signal
   */
  executeSignal(signal: MFTSignal): MFTPosition | null {
    if (this.positions.size >= this.config.maxPositions) return null;

    const position: MFTPosition = {
      id: `mft-${Date.now()}`,
      symbol: signal.symbol,
      direction: signal.direction,
      entryPrice: signal.entryPrice,
      currentPrice: signal.entryPrice,
      size: signal.positionSize,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      pnl: 0,
      pnlPercent: 0,
      openedAt: Date.now(),
      expectedClose: Date.now() + signal.holdingPeriod * 60 * 1000,
      trailingStop: signal.trailingStop,
      trailingPercent: signal.trailingPercent,
      highestPrice: signal.entryPrice,
      lowestPrice: signal.entryPrice,
      strategy: signal.strategy,
      timeframe: signal.timeframe,
    };

    this.positions.set(position.id, position);
    return position;
  }

  /**
   * Update all positions
   */
  private updatePositions(currentPrice: number): void {
    for (const position of this.positions.values()) {
      position.currentPrice = currentPrice;

      // Update high/low for trailing stop
      if (currentPrice > position.highestPrice) position.highestPrice = currentPrice;
      if (currentPrice < position.lowestPrice) position.lowestPrice = currentPrice;

      // Apply trailing stop
      if (position.trailingStop) {
        if (position.direction === 'LONG') {
          const newStop = position.highestPrice * (1 - position.trailingPercent / 100);
          if (newStop > position.stopLoss) position.stopLoss = newStop;
        } else {
          const newStop = position.lowestPrice * (1 + position.trailingPercent / 100);
          if (newStop < position.stopLoss) position.stopLoss = newStop;
        }
      }

      // Calculate PnL
      if (position.direction === 'LONG') {
        position.pnl = (currentPrice - position.entryPrice) * position.size;
        position.pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
      } else {
        position.pnl = (position.entryPrice - currentPrice) * position.size;
        position.pnlPercent = ((position.entryPrice - currentPrice) / position.entryPrice) * 100;
      }

      // Check stop loss
      if (position.direction === 'LONG' && currentPrice <= position.stopLoss) {
        this.closePosition(position.id, currentPrice);
      }
      if (position.direction === 'SHORT' && currentPrice >= position.stopLoss) {
        this.closePosition(position.id, currentPrice);
      }

      // Check take profit
      if (position.direction === 'LONG' && currentPrice >= position.takeProfit) {
        this.closePosition(position.id, currentPrice);
      }
      if (position.direction === 'SHORT' && currentPrice <= position.takeProfit) {
        this.closePosition(position.id, currentPrice);
      }

      // Check max holding time
      if (Date.now() >= position.expectedClose) {
        this.closePosition(position.id, currentPrice);
      }
    }
  }

  /**
   * Close position
   */
  closePosition(positionId: string, price: number): MFTPosition | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    position.currentPrice = price;
    if (position.direction === 'LONG') {
      position.pnl = (price - position.entryPrice) * position.size;
      position.pnlPercent = ((price - position.entryPrice) / position.entryPrice) * 100;
    } else {
      position.pnl = (position.entryPrice - price) * position.size;
      position.pnlPercent = ((position.entryPrice - price) / position.entryPrice) * 100;
    }

    // Update metrics
    this.metrics.totalTrades++;
    this.metrics.totalPnL += position.pnl;
    this.metrics.dailyPnL += position.pnlPercent;
    
    if (position.pnl >= 0) {
      this.metrics.winTrades++;
    } else {
      this.metrics.lossTrades++;
    }
    this.metrics.winRate = this.metrics.winTrades / this.metrics.totalTrades;

    this.positions.delete(positionId);
    return position;
  }

  /**
   * Calculate position size based on risk
   */
  private calculatePositionSize(entry: number, stop: number, confidence: number): number {
    const riskAmount = this.config.maxPositionValue * (this.config.maxRiskPerTrade / 100);
    const stopDistance = Math.abs(entry - stop);
    const rawSize = stopDistance > 0 ? riskAmount / stopDistance : 0;
    
    // Adjust by confidence
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
      regime: this.regimeDetector.getRegime(),
    };
  }

  getConfig(): MFTConfig {
    return this.config;
  }

  updateConfig(config: Partial<MFTConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default { MFTEngine, VolumeProfileAnalyzer, VWAPCalculator, RegimeDetector, DEFAULT_MFT_CONFIG };
