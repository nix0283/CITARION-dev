/**
 * Risk Manager - Centralized Risk Management System
 * 
 * Provides portfolio-level risk monitoring, position limits,
 * drawdown protection, and correlation analysis.
 * 
 * @version 2.0.0
 * @author CITARION Architecture Team
 */

import { BotCode } from '../types';
import { ExchangeCode } from '../exchange/types';
import { eventBus } from '../event-bus';

// ==================== TYPES ====================

/**
 * Risk severity levels
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Risk limit types
 */
export type RiskLimitType = 
  | 'MAX_DRAWDOWN'
  | 'MAX_DAILY_LOSS'
  | 'MAX_POSITION_SIZE'
  | 'MAX_LEVERAGE'
  | 'MAX_CORRELATION'
  | 'MAX_EXPOSURE'
  | 'MAX_OPEN_POSITIONS'
  | 'MAX_ORDERS_PER_MINUTE'
  | 'MIN_BALANCE';

/**
 * Risk limit configuration
 */
export interface RiskLimit {
  type: RiskLimitType;
  value: number;
  unit: 'PERCENT' | 'ABSOLUTE' | 'COUNT' | 'RATIO';
  scope: 'PORTFOLIO' | 'BOT' | 'SYMBOL' | 'EXCHANGE';
  action: 'ALERT' | 'BLOCK' | 'REDUCE' | 'CLOSE_ALL';
  cooldownMinutes?: number;
}

/**
 * Portfolio risk limits
 */
export interface PortfolioRiskLimits {
  maxDrawdownPercent: number;          // 15%
  maxDailyLossPercent: number;         // 5%
  maxPositionSizePercent: number;      // 10%
  maxLeverage: number;                 // 20x
  maxCorrelation: number;              // 0.7
  maxExposurePercent: number;          // 80%
  maxOpenPositions: number;            // 20
  maxOrdersPerMinute: number;          // 30
  minBalancePercent: number;           // 10%
  maxExposurePerExchange: number;      // 40%
  maxExposurePerBot: number;           // 25%
}

/**
 * Risk state
 */
export interface RiskState {
  portfolioId: string;
  totalEquity: number;
  availableBalance: number;
  usedMargin: number;
  unrealizedPnl: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  drawdown: number;
  drawdownPercent: number;
  peakEquity: number;
  leverage: number;
  exposure: number;
  exposurePercent: number;
  openPositions: number;
  openOrders: number;
  correlationRisk: number;
  riskScore: number;                   // 0-100
  riskLevel: RiskLevel;
  warnings: RiskWarning[];
  timestamp: number;
}

/**
 * Risk warning
 */
export interface RiskWarning {
  id: string;
  type: RiskLimitType;
  severity: RiskLevel;
  message: string;
  currentValue: number;
  limitValue: number;
  scope: string;
  affectedBots: BotCode[];
  affectedSymbols: string[];
  affectedExchanges: ExchangeCode[];
  recommendation: string;
  createdAt: number;
  acknowledged: boolean;
  acknowledgedAt?: number;
}

/**
 * Position exposure
 */
export interface PositionExposure {
  symbol: string;
  exchange: ExchangeCode;
  botCode: BotCode;
  side: 'LONG' | 'SHORT';
  quantity: number;
  notionalValue: number;
  margin: number;
  leverage: number;
  pnl: number;
  pnlPercent: number;
  entryPrice: number;
  currentPrice: number;
  liquidationPrice?: number;
}

/**
 * Exposure summary
 */
export interface ExposureSummary {
  totalExposure: number;
  exposureByExchange: Map<ExchangeCode, number>;
  exposureBySymbol: Map<string, number>;
  exposureByBot: Map<BotCode, number>;
  exposureBySide: { long: number; short: number };
  netExposure: number;
  hedgeRatio: number;
}

/**
 * Correlation matrix
 */
export interface CorrelationMatrix {
  symbols: string[];
  matrix: number[][];
  lastUpdated: number;
}

// ==================== DEFAULT LIMITS ====================

export const DEFAULT_RISK_LIMITS: PortfolioRiskLimits = {
  maxDrawdownPercent: 15,
  maxDailyLossPercent: 5,
  maxPositionSizePercent: 10,
  maxLeverage: 20,
  maxCorrelation: 0.7,
  maxExposurePercent: 80,
  maxOpenPositions: 20,
  maxOrdersPerMinute: 30,
  minBalancePercent: 10,
  maxExposurePerExchange: 40,
  maxExposurePerBot: 25,
};

// ==================== RISK MANAGER ====================

/**
 * Centralized Risk Manager
 */
export class RiskManager {
  private limits: PortfolioRiskLimits;
  private state: RiskState | null = null;
  private exposures: PositionExposure[] = [];
  private warnings: RiskWarning[] = [];
  private orderTimestamps: number[] = [];
  private peakEquity: number = 0;
  private dailyStartEquity: number = 0;
  private correlationMatrix: CorrelationMatrix | null = null;

  constructor(limits: Partial<PortfolioRiskLimits> = {}) {
    this.limits = { ...DEFAULT_RISK_LIMITS, ...limits };
  }

  /**
   * Initialize risk manager with portfolio data
   */
  initialize(portfolioId: string, initialEquity: number): void {
    this.peakEquity = initialEquity;
    this.dailyStartEquity = initialEquity;
    this.state = {
      portfolioId,
      totalEquity: initialEquity,
      availableBalance: initialEquity,
      usedMargin: 0,
      unrealizedPnl: 0,
      dailyPnl: 0,
      dailyPnlPercent: 0,
      drawdown: 0,
      drawdownPercent: 0,
      peakEquity: initialEquity,
      leverage: 1,
      exposure: 0,
      exposurePercent: 0,
      openPositions: 0,
      openOrders: 0,
      correlationRisk: 0,
      riskScore: 0,
      riskLevel: 'LOW',
      warnings: [],
      timestamp: Date.now(),
    };
  }

  /**
   * Update risk state with new data
   */
  updateState(
    totalEquity: number,
    availableBalance: number,
    positions: PositionExposure[],
    openOrders: number
  ): RiskState {
    this.exposures = positions;

    // Calculate exposure
    const totalExposure = positions.reduce((sum, p) => sum + p.notionalValue, 0);
    const usedMargin = positions.reduce((sum, p) => sum + p.margin, 0);
    const unrealizedPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

    // Update peak equity
    if (totalEquity > this.peakEquity) {
      this.peakEquity = totalEquity;
    }

    // Calculate drawdown
    const drawdown = this.peakEquity - totalEquity;
    const drawdownPercent = (drawdown / this.peakEquity) * 100;

    // Calculate daily PnL
    const dailyPnl = totalEquity - this.dailyStartEquity;
    const dailyPnlPercent = (dailyPnl / this.dailyStartEquity) * 100;

    // Calculate leverage
    const leverage = usedMargin > 0 ? totalExposure / usedMargin : 1;

    // Calculate exposure percent
    const exposurePercent = (totalExposure / totalEquity) * 100;

    // Calculate correlation risk
    const correlationRisk = this.calculateCorrelationRisk(positions);

    // Calculate risk score
    const riskScore = this.calculateRiskScore({
      drawdownPercent,
      dailyPnlPercent,
      leverage,
      exposurePercent,
      openPositions: positions.length,
      correlationRisk,
    });

    // Determine risk level
    const riskLevel = this.determineRiskLevel(riskScore);

    // Generate warnings
    this.generateWarnings(
      totalEquity,
      availableBalance,
      positions,
      drawdownPercent,
      dailyPnlPercent,
      leverage,
      exposurePercent,
      correlationRisk
    );

    this.state = {
      portfolioId: this.state?.portfolioId ?? 'default',
      totalEquity,
      availableBalance,
      usedMargin,
      unrealizedPnl,
      dailyPnl,
      dailyPnlPercent,
      drawdown,
      drawdownPercent,
      peakEquity: this.peakEquity,
      leverage,
      exposure: totalExposure,
      exposurePercent,
      openPositions: positions.length,
      openOrders,
      correlationRisk,
      riskScore,
      riskLevel,
      warnings: [...this.warnings],
      timestamp: Date.now(),
    };

    return this.state;
  }

  /**
   * Check if a new order is allowed
   */
  checkOrderAllowed(
    botCode: BotCode,
    symbol: string,
    exchange: ExchangeCode,
    side: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    leverage: number
  ): { allowed: boolean; reason?: string; warning?: string } {
    if (!this.state) {
      return { allowed: false, reason: 'Risk manager not initialized' };
    }

    // Check order rate limit
    this.cleanOldOrderTimestamps();
    if (this.orderTimestamps.length >= this.limits.maxOrdersPerMinute) {
      return { allowed: false, reason: 'Order rate limit exceeded' };
    }

    // Check open positions limit
    if (this.state.openPositions >= this.limits.maxOpenPositions) {
      return { allowed: false, reason: 'Maximum open positions reached' };
    }

    // Check leverage limit
    if (leverage > this.limits.maxLeverage) {
      return { allowed: false, reason: `Leverage ${leverage}x exceeds limit ${this.limits.maxLeverage}x` };
    }

    // Check position size
    const orderValue = quantity * price * leverage;
    const positionSizePercent = (orderValue / this.state.totalEquity) * 100;
    if (positionSizePercent > this.limits.maxPositionSizePercent) {
      return { allowed: false, reason: `Position size ${positionSizePercent.toFixed(1)}% exceeds limit ${this.limits.maxPositionSizePercent}%` };
    }

    // Check exposure after order
    const newExposure = this.state.exposure + orderValue;
    const newExposurePercent = (newExposure / this.state.totalEquity) * 100;
    if (newExposurePercent > this.limits.maxExposurePercent) {
      return { allowed: false, reason: `Exposure would exceed ${this.limits.maxExposurePercent}%` };
    }

    // Check minimum balance
    const requiredMargin = orderValue / leverage;
    const minRequiredBalance = this.state.totalEquity * (this.limits.minBalancePercent / 100);
    if (this.state.availableBalance - requiredMargin < minRequiredBalance) {
      return { allowed: false, reason: 'Insufficient balance (minimum reserve required)' };
    }

    // Check drawdown
    if (this.state.drawdownPercent >= this.limits.maxDrawdownPercent) {
      return { allowed: false, reason: `Drawdown ${this.state.drawdownPercent.toFixed(1)}% at limit` };
    }

    // Check daily loss
    if (this.state.dailyPnlPercent <= -this.limits.maxDailyLossPercent) {
      return { allowed: false, reason: `Daily loss limit reached (${this.limits.maxDailyLossPercent}%)` };
    }

    // Check exchange exposure
    const exchangeExposure = this.getExposureByExchange(exchange);
    const newExchangeExposurePercent = ((exchangeExposure + orderValue) / this.state.totalEquity) * 100;
    if (newExchangeExposurePercent > this.limits.maxExposurePerExchange) {
      return { allowed: false, reason: `Exchange exposure would exceed ${this.limits.maxExposurePerExchange}%` };
    }

    // Check bot exposure
    const botExposure = this.getExposureByBot(botCode);
    const newBotExposurePercent = ((botExposure + orderValue) / this.state.totalEquity) * 100;
    if (newBotExposurePercent > this.limits.maxExposurePerBot) {
      return { allowed: false, reason: `Bot exposure would exceed ${this.limits.maxExposurePerBot}%` };
    }

    // Record order timestamp
    this.orderTimestamps.push(Date.now());

    // Return warning if risk is high
    if (this.state.riskLevel === 'HIGH' || this.state.riskLevel === 'CRITICAL') {
      return {
        allowed: true,
        warning: `Risk level is ${this.state.riskLevel}. Proceed with caution.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Record order timestamp for rate limiting
   */
  recordOrder(): void {
    this.orderTimestamps.push(Date.now());
  }

  /**
   * Get current risk state
   */
  getState(): RiskState | null {
    return this.state;
  }

  /**
   * Get current limits
   */
  getLimits(): PortfolioRiskLimits {
    return { ...this.limits };
  }

  /**
   * Update limits
   */
  updateLimits(limits: Partial<PortfolioRiskLimits>): void {
    this.limits = { ...this.limits, ...limits };
  }

  /**
   * Get exposure summary
   */
  getExposureSummary(): ExposureSummary {
    const exposureByExchange = new Map<ExchangeCode, number>();
    const exposureBySymbol = new Map<string, number>();
    const exposureByBot = new Map<BotCode, number>();
    let longExposure = 0;
    let shortExposure = 0;

    for (const exposure of this.exposures) {
      // By exchange
      const currentExchange = exposureByExchange.get(exposure.exchange) ?? 0;
      exposureByExchange.set(exposure.exchange, currentExchange + exposure.notionalValue);

      // By symbol
      const currentSymbol = exposureBySymbol.get(exposure.symbol) ?? 0;
      exposureBySymbol.set(exposure.symbol, currentSymbol + exposure.notionalValue);

      // By bot
      const currentBot = exposureByBot.get(exposure.botCode) ?? 0;
      exposureByBot.set(exposure.botCode, currentBot + exposure.notionalValue);

      // By side
      if (exposure.side === 'LONG') {
        longExposure += exposure.notionalValue;
      } else {
        shortExposure += exposure.notionalValue;
      }
    }

    const totalExposure = longExposure + shortExposure;
    const netExposure = longExposure - shortExposure;
    const hedgeRatio = totalExposure > 0 ? 1 - Math.abs(netExposure) / totalExposure : 0;

    return {
      totalExposure,
      exposureByExchange,
      exposureBySymbol,
      exposureByBot,
      exposureBySide: { long: longExposure, short: shortExposure },
      netExposure,
      hedgeRatio,
    };
  }

  /**
   * Reset daily counters
   */
  resetDaily(): void {
    if (this.state) {
      this.dailyStartEquity = this.state.totalEquity;
    }
    this.warnings = this.warnings.filter(w => w.severity === 'CRITICAL');
  }

  /**
   * Acknowledge warning
   */
  acknowledgeWarning(warningId: string): boolean {
    const warning = this.warnings.find(w => w.id === warningId);
    if (warning) {
      warning.acknowledged = true;
      warning.acknowledgedAt = Date.now();
      return true;
    }
    return false;
  }

  // ==================== PRIVATE METHODS ====================

  private getExposureByExchange(exchange: ExchangeCode): number {
    return this.exposures
      .filter(e => e.exchange === exchange)
      .reduce((sum, e) => sum + e.notionalValue, 0);
  }

  private getExposureByBot(botCode: BotCode): number {
    return this.exposures
      .filter(e => e.botCode === botCode)
      .reduce((sum, e) => sum + e.notionalValue, 0);
  }

  private cleanOldOrderTimestamps(): void {
    const oneMinuteAgo = Date.now() - 60000;
    this.orderTimestamps = this.orderTimestamps.filter(t => t > oneMinuteAgo);
  }

  private calculateCorrelationRisk(positions: PositionExposure[]): number {
    if (positions.length < 2) return 0;
    
    // Simplified correlation risk calculation
    // Count positions in same direction for correlated assets
    const longSymbols = positions.filter(p => p.side === 'LONG').map(p => p.symbol);
    const shortSymbols = positions.filter(p => p.side === 'SHORT').map(p => p.symbol);
    
    const totalPositions = positions.length;
    const sameDirectionCount = longSymbols.length > shortSymbols.length 
      ? longSymbols.length 
      : shortSymbols.length;
    
    return sameDirectionCount / totalPositions;
  }

  private calculateRiskScore(metrics: {
    drawdownPercent: number;
    dailyPnlPercent: number;
    leverage: number;
    exposurePercent: number;
    openPositions: number;
    correlationRisk: number;
  }): number {
    let score = 0;

    // Drawdown component (0-30 points)
    score += Math.min(30, (metrics.drawdownPercent / this.limits.maxDrawdownPercent) * 30);

    // Daily loss component (0-25 points)
    const dailyLossScore = Math.abs(Math.min(0, metrics.dailyPnlPercent)) / this.limits.maxDailyLossPercent;
    score += Math.min(25, dailyLossScore * 25);

    // Leverage component (0-20 points)
    score += Math.min(20, (metrics.leverage / this.limits.maxLeverage) * 20);

    // Exposure component (0-15 points)
    score += Math.min(15, (metrics.exposurePercent / this.limits.maxExposurePercent) * 15);

    // Correlation component (0-10 points)
    score += metrics.correlationRisk * 10;

    return Math.min(100, Math.round(score));
  }

  private determineRiskLevel(score: number): RiskLevel {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    return 'LOW';
  }

  private generateWarnings(
    totalEquity: number,
    availableBalance: number,
    positions: PositionExposure[],
    drawdownPercent: number,
    dailyPnlPercent: number,
    leverage: number,
    exposurePercent: number,
    correlationRisk: number
  ): void {
    const now = Date.now();

    // Drawdown warning
    if (drawdownPercent >= this.limits.maxDrawdownPercent * 0.8) {
      this.addWarning({
        type: 'MAX_DRAWDOWN',
        severity: drawdownPercent >= this.limits.maxDrawdownPercent ? 'CRITICAL' : 'HIGH',
        message: `Drawdown at ${drawdownPercent.toFixed(1)}% of ${this.limits.maxDrawdownPercent}% limit`,
        currentValue: drawdownPercent,
        limitValue: this.limits.maxDrawdownPercent,
        scope: 'PORTFOLIO',
        affectedBots: [...new Set(positions.map(p => p.botCode))],
        affectedSymbols: [...new Set(positions.map(p => p.symbol))],
        affectedExchanges: [...new Set(positions.map(p => p.exchange))],
        recommendation: 'Consider reducing positions or stopping trading',
      });
    }

    // Daily loss warning
    if (dailyPnlPercent <= -this.limits.maxDailyLossPercent * 0.8) {
      this.addWarning({
        type: 'MAX_DAILY_LOSS',
        severity: dailyPnlPercent <= -this.limits.maxDailyLossPercent ? 'CRITICAL' : 'HIGH',
        message: `Daily loss at ${Math.abs(dailyPnlPercent).toFixed(1)}% of ${this.limits.maxDailyLossPercent}% limit`,
        currentValue: Math.abs(dailyPnlPercent),
        limitValue: this.limits.maxDailyLossPercent,
        scope: 'PORTFOLIO',
        affectedBots: [...new Set(positions.map(p => p.botCode))],
        affectedSymbols: [],
        affectedExchanges: [],
        recommendation: 'Stop trading for the day to preserve capital',
      });
    }

    // Leverage warning
    if (leverage >= this.limits.maxLeverage * 0.8) {
      this.addWarning({
        type: 'MAX_LEVERAGE',
        severity: leverage >= this.limits.maxLeverage ? 'CRITICAL' : 'MEDIUM',
        message: `Leverage at ${leverage.toFixed(1)}x of ${this.limits.maxLeverage}x limit`,
        currentValue: leverage,
        limitValue: this.limits.maxLeverage,
        scope: 'PORTFOLIO',
        affectedBots: [...new Set(positions.map(p => p.botCode))],
        affectedSymbols: [],
        affectedExchanges: [],
        recommendation: 'Reduce position sizes to lower leverage',
      });
    }

    // Correlation warning
    if (correlationRisk >= this.limits.maxCorrelation * 0.8) {
      this.addWarning({
        type: 'MAX_CORRELATION',
        severity: correlationRisk >= this.limits.maxCorrelation ? 'HIGH' : 'MEDIUM',
        message: `Position correlation at ${(correlationRisk * 100).toFixed(0)}%`,
        currentValue: correlationRisk,
        limitValue: this.limits.maxCorrelation,
        scope: 'PORTFOLIO',
        affectedBots: [...new Set(positions.map(p => p.botCode))],
        affectedSymbols: [...new Set(positions.map(p => p.symbol))],
        affectedExchanges: [],
        recommendation: 'Diversify positions to reduce correlation risk',
      });
    }
  }

  private addWarning(warning: Omit<RiskWarning, 'id' | 'createdAt' | 'acknowledged'>): void {
    const id = `warn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Check if similar warning already exists
    const existingIndex = this.warnings.findIndex(
      w => w.type === warning.type && !w.acknowledged
    );

    const newWarning: RiskWarning = {
      ...warning,
      id,
      createdAt: Date.now(),
      acknowledged: false,
    };

    if (existingIndex >= 0) {
      this.warnings[existingIndex] = newWarning;
    } else {
      this.warnings.push(newWarning);
    }

    // Publish risk alert event
    eventBus.publish({
      id: `evt_${Date.now()}`,
      topic: `risk.alert.${warning.severity.toLowerCase()}`,
      domain: 'risk',
      entity: 'alert',
      action: 'triggered',
      timestamp: Date.now(),
      source: 'WLF',
      priority: warning.severity === 'CRITICAL' ? 'critical' : 'high',
      payload: newWarning,
    });
  }
}

// ==================== SINGLETON INSTANCE ====================

export const riskManager = new RiskManager();
