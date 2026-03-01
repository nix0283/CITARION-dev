/**
 * Portfolio Manager - Unified Position and Balance Management
 * 
 * Aggregates positions and balances across all exchanges,
 * provides real-time portfolio analytics and rebalancing.
 * 
 * @version 2.0.0
 * @author CITARION Architecture Team
 */

import { BotCode } from '../types';
import { ExchangeCode, Position, Balance, AccountInfo } from '../exchange/types';
import { eventBus } from '../event-bus';

// ==================== TYPES ====================

/**
 * Unified position across exchanges
 */
export interface UnifiedPosition {
  id: string;
  baseAsset: string;
  quoteAsset: string;
  symbol: string;
  
  // Aggregated across exchanges
  totalQuantity: number;
  totalNotionalValue: number;
  avgEntryPrice: number;
  weightedAvgPrice: number;
  
  // By exchange breakdown
  byExchange: Map<ExchangeCode, {
    quantity: number;
    entryPrice: number;
    notionalValue: number;
    pnl: number;
    margin: number;
    leverage: number;
  }>;
  
  // By bot breakdown
  byBot: Map<BotCode, {
    quantity: number;
    entryPrice: number;
    notionalValue: number;
    pnl: number;
  }>;
  
  // Risk metrics
  totalPnl: number;
  totalPnlPercent: number;
  unrealizedPnl: number;
  realizedPnl: number;
  
  // Timestamps
  openedAt: number;
  updatedAt: number;
}

/**
 * Unified balance across exchanges
 */
export interface UnifiedBalance {
  asset: string;
  totalFree: number;
  totalLocked: number;
  totalBalance: number;
  usdValue: number;
  
  byExchange: Map<ExchangeCode, {
    free: number;
    locked: number;
    usdValue: number;
  }>;
  
  // Allocation
  allocationPercent: number;
  targetAllocation?: number;
}

/**
 * Portfolio summary
 */
export interface PortfolioSummary {
  id: string;
  name: string;
  
  // Equity
  totalEquity: number;
  availableBalance: number;
  usedMargin: number;
  
  // PnL
  totalPnl: number;
  totalPnlPercent: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  weeklyPnl: number;
  weeklyPnlPercent: number;
  monthlyPnl: number;
  monthlyPnlPercent: number;
  
  // Positions
  openPositions: number;
  positionValue: number;
  positionsBySide: { long: number; short: number };
  positionsByExchange: Map<ExchangeCode, number>;
  positionsByBot: Map<BotCode, number>;
  
  // Exposure
  totalExposure: number;
  exposurePercent: number;
  netExposure: number;
  hedgeRatio: number;
  
  // Leverage
  avgLeverage: number;
  maxLeverage: number;
  marginLevel?: number;
  
  // Performance
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

/**
 * Portfolio allocation target
 */
export interface AllocationTarget {
  asset: string;
  targetPercent: number;
  tolerancePercent: number;
  rebalanceThreshold: number;
}

/**
 * Rebalancing action
 */
export interface RebalanceAction {
  type: 'BUY' | 'SELL' | 'TRANSFER';
  asset: string;
  fromExchange?: ExchangeCode;
  toExchange?: ExchangeCode;
  quantity: number;
  estimatedValue: number;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  avgHoldingTime: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  largestWin: number;
  largestLoss: number;
}

// ==================== PORTFOLIO MANAGER ====================

/**
 * Centralized Portfolio Manager
 */
export class PortfolioManager {
  private portfolioId: string;
  private name: string;
  
  private positions = new Map<string, UnifiedPosition>();
  private balances = new Map<string, UnifiedBalance>();
  private allocations = new Map<string, AllocationTarget>();
  
  private totalEquity: number = 0;
  private peakEquity: number = 0;
  private dailyStartEquity: number = 0;
  private weeklyStartEquity: number = 0;
  private monthlyStartEquity: number = 0;
  
  private tradeHistory: Array<{
    timestamp: number;
    pnl: number;
    symbol: string;
    exchange: ExchangeCode;
    botCode: BotCode;
  }> = [];

  constructor(portfolioId: string, name: string = 'Main Portfolio') {
    this.portfolioId = portfolioId;
    this.name = name;
  }

  /**
   * Initialize portfolio with starting equity
   */
  initialize(startingEquity: number): void {
    this.totalEquity = startingEquity;
    this.peakEquity = startingEquity;
    this.dailyStartEquity = startingEquity;
    this.weeklyStartEquity = startingEquity;
    this.monthlyStartEquity = startingEquity;
  }

  /**
   * Update portfolio with exchange account info
   */
  updateFromExchange(exchange: ExchangeCode, accountInfo: AccountInfo): void {
    // Update balances
    for (const balance of accountInfo.balances) {
      this.updateBalance(exchange, balance);
    }
    
    // Update total equity
    this.totalEquity = accountInfo.totalEquity;
    if (this.totalEquity > this.peakEquity) {
      this.peakEquity = this.totalEquity;
    }
  }

  /**
   * Update balance for an exchange
   */
  updateBalance(exchange: ExchangeCode, balance: Balance): void {
    let unified = this.balances.get(balance.asset);
    
    if (!unified) {
      unified = {
        asset: balance.asset,
        totalFree: 0,
        totalLocked: 0,
        totalBalance: 0,
        usdValue: 0,
        byExchange: new Map(),
        allocationPercent: 0,
      };
    }
    
    // Update exchange-specific balance
    unified.byExchange.set(exchange, {
      free: balance.free,
      locked: balance.locked,
      usdValue: balance.usdValue ?? balance.total * (balance.usdValue ?? 1),
    });
    
    // Recalculate totals
    let totalFree = 0;
    let totalLocked = 0;
    let totalUsd = 0;
    
    for (const ex of unified.byExchange.values()) {
      totalFree += ex.free;
      totalLocked += ex.locked;
      totalUsd += ex.usdValue;
    }
    
    unified.totalFree = totalFree;
    unified.totalLocked = totalLocked;
    unified.totalBalance = totalFree + totalLocked;
    unified.usdValue = totalUsd;
    
    if (this.totalEquity > 0) {
      unified.allocationPercent = (totalUsd / this.totalEquity) * 100;
    }
    
    this.balances.set(balance.asset, unified);
  }

  /**
   * Update position from exchange
   */
  updatePosition(position: Position, botCode: BotCode): void {
    const key = `${position.symbol}_${position.exchange}_${botCode}`;
    let unified = this.positions.get(position.symbol);
    
    if (!unified) {
      unified = {
        id: position.symbol,
        baseAsset: this.parseBaseAsset(position.symbol),
        quoteAsset: this.parseQuoteAsset(position.symbol),
        symbol: position.symbol,
        totalQuantity: 0,
        totalNotionalValue: 0,
        avgEntryPrice: 0,
        weightedAvgPrice: 0,
        byExchange: new Map(),
        byBot: new Map(),
        totalPnl: 0,
        totalPnlPercent: 0,
        unrealizedPnl: 0,
        realizedPnl: 0,
        openedAt: position.openedAt,
        updatedAt: Date.now(),
      };
    }
    
    // Update exchange breakdown
    unified.byExchange.set(position.exchange, {
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      notionalValue: position.notionalValue,
      pnl: position.unrealizedPnl,
      margin: position.margin,
      leverage: position.leverage,
    });
    
    // Update bot breakdown
    unified.byBot.set(botCode, {
      quantity: position.quantity,
      entryPrice: position.entryPrice,
      notionalValue: position.notionalValue,
      pnl: position.unrealizedPnl,
    });
    
    // Recalculate totals
    let totalQuantity = 0;
    let totalValue = 0;
    let weightedSum = 0;
    let totalPnl = 0;
    
    for (const ex of unified.byExchange.values()) {
      totalQuantity += ex.quantity;
      totalValue += ex.notionalValue;
      weightedSum += ex.entryPrice * ex.quantity;
      totalPnl += ex.pnl;
    }
    
    unified.totalQuantity = totalQuantity;
    unified.totalNotionalValue = totalValue;
    unified.avgEntryPrice = totalQuantity > 0 ? weightedSum / totalQuantity : 0;
    unified.totalPnl = totalPnl;
    unified.unrealizedPnl = totalPnl;
    
    if (unified.avgEntryPrice > 0 && totalQuantity > 0) {
      unified.totalPnlPercent = (totalPnl / (unified.avgEntryPrice * totalQuantity)) * 100;
    }
    
    unified.updatedAt = Date.now();
    
    this.positions.set(position.symbol, unified);
  }

  /**
   * Record a trade for performance tracking
   */
  recordTrade(
    symbol: string,
    exchange: ExchangeCode,
    botCode: BotCode,
    pnl: number
  ): void {
    this.tradeHistory.push({
      timestamp: Date.now(),
      pnl,
      symbol,
      exchange,
      botCode,
    });
    
    // Publish position event
    eventBus.publish({
      id: `evt_${Date.now()}`,
      topic: 'trading.position.updated',
      domain: 'trading',
      entity: 'position',
      action: 'updated',
      timestamp: Date.now(),
      source: botCode,
      priority: 'normal',
      payload: { symbol, exchange, pnl },
    });
  }

  /**
   * Get portfolio summary
   */
  getSummary(): PortfolioSummary {
    const positions = Array.from(this.positions.values());
    
    // Calculate position metrics
    let longValue = 0;
    let shortValue = 0;
    const positionsByExchange = new Map<ExchangeCode, number>();
    const positionsByBot = new Map<BotCode, number>();
    
    for (const pos of positions) {
      for (const [exchange, data] of pos.byExchange) {
        longValue += data.quantity > 0 ? data.notionalValue : 0;
        shortValue += data.quantity < 0 ? data.notionalValue : 0;
        positionsByExchange.set(exchange, (positionsByExchange.get(exchange) ?? 0) + 1);
      }
      for (const bot of pos.byBot.keys()) {
        positionsByBot.set(bot, (positionsByBot.get(bot) ?? 0) + 1);
      }
    }
    
    const totalExposure = longValue + shortValue;
    const netExposure = longValue - shortValue;
    const hedgeRatio = totalExposure > 0 ? 1 - Math.abs(netExposure) / totalExposure : 0;
    
    // Calculate PnL
    const dailyPnl = this.totalEquity - this.dailyStartEquity;
    const weeklyPnl = this.totalEquity - this.weeklyStartEquity;
    const monthlyPnl = this.totalEquity - this.monthlyStartEquity;
    
    return {
      id: this.portfolioId,
      name: this.name,
      totalEquity: this.totalEquity,
      availableBalance: this.getAvailableBalance(),
      usedMargin: positions.reduce((sum, p) => {
        let margin = 0;
        for (const ex of p.byExchange.values()) margin += ex.margin;
        return sum + margin;
      }, 0),
      totalPnl: this.tradeHistory.reduce((sum, t) => sum + t.pnl, 0),
      totalPnlPercent: 0,
      dailyPnl,
      dailyPnlPercent: this.dailyStartEquity > 0 ? (dailyPnl / this.dailyStartEquity) * 100 : 0,
      weeklyPnl,
      weeklyPnlPercent: this.weeklyStartEquity > 0 ? (weeklyPnl / this.weeklyStartEquity) * 100 : 0,
      monthlyPnl,
      monthlyPnlPercent: this.monthlyStartEquity > 0 ? (monthlyPnl / this.monthlyStartEquity) * 100 : 0,
      openPositions: positions.length,
      positionValue: totalExposure,
      positionsBySide: { long: longValue, short: shortValue },
      positionsByExchange,
      positionsByBot,
      totalExposure,
      exposurePercent: this.totalEquity > 0 ? (totalExposure / this.totalEquity) * 100 : 0,
      netExposure,
      hedgeRatio,
      avgLeverage: this.calculateAverageLeverage(),
      maxLeverage: this.calculateMaxLeverage(),
      winRate: this.calculateWinRate(),
      profitFactor: this.calculateProfitFactor(),
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: this.peakEquity - this.totalEquity,
      maxDrawdownPercent: this.peakEquity > 0 
        ? ((this.peakEquity - this.totalEquity) / this.peakEquity) * 100 
        : 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const trades = this.tradeHistory;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    
    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length
      : 0;
    const avgLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length)
      : 0;
    
    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
      avgWin,
      avgLoss,
      profitFactor: avgLoss > 0 ? avgWin / avgLoss : 0,
      sharpeRatio: this.calculateSharpeRatio(),
      sortinoRatio: this.calculateSortinoRatio(),
      calmarRatio: this.calculateCalmarRatio(),
      maxDrawdown: this.peakEquity - this.totalEquity,
      maxDrawdownPercent: this.peakEquity > 0 
        ? ((this.peakEquity - this.totalEquity) / this.peakEquity) * 100 
        : 0,
      avgHoldingTime: 0,
      maxConsecutiveWins: this.calculateMaxConsecutiveWins(),
      maxConsecutiveLosses: this.calculateMaxConsecutiveLosses(),
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
    };
  }

  /**
   * Get all balances
   */
  getBalances(): UnifiedBalance[] {
    return Array.from(this.balances.values());
  }

  /**
   * Get balance for specific asset
   */
  getBalance(asset: string): UnifiedBalance | undefined {
    return this.balances.get(asset);
  }

  /**
   * Get all positions
   */
  getPositions(): UnifiedPosition[] {
    return Array.from(this.positions.values());
  }

  /**
   * Get position for specific symbol
   */
  getPosition(symbol: string): UnifiedPosition | undefined {
    return this.positions.get(symbol);
  }

  /**
   * Set allocation targets
   */
  setAllocationTargets(targets: AllocationTarget[]): void {
    for (const target of targets) {
      this.allocations.set(target.asset, target);
    }
  }

  /**
   * Check if rebalancing needed
   */
  getRebalanceActions(): RebalanceAction[] {
    const actions: RebalanceAction[] = [];
    
    for (const [asset, target] of this.allocations) {
      const balance = this.balances.get(asset);
      if (!balance) continue;
      
      const diff = balance.allocationPercent - target.targetPercent;
      
      if (Math.abs(diff) > target.rebalanceThreshold) {
        actions.push({
          type: diff > 0 ? 'SELL' : 'BUY',
          asset,
          quantity: Math.abs(diff) / 100 * this.totalEquity,
          estimatedValue: Math.abs(diff) / 100 * this.totalEquity,
          reason: `Allocation ${balance.allocationPercent.toFixed(1)}% differs from target ${target.targetPercent}%`,
          priority: Math.abs(diff) > target.tolerancePercent ? 'HIGH' : 'MEDIUM',
        });
      }
    }
    
    return actions.sort((a, b) => 
      a.priority === 'HIGH' && b.priority !== 'HIGH' ? -1 : 1
    );
  }

  /**
   * Reset daily counters
   */
  resetDaily(): void {
    this.dailyStartEquity = this.totalEquity;
  }

  /**
   * Reset weekly counters
   */
  resetWeekly(): void {
    this.weeklyStartEquity = this.totalEquity;
  }

  /**
   * Reset monthly counters
   */
  resetMonthly(): void {
    this.monthlyStartEquity = this.totalEquity;
  }

  // ==================== PRIVATE METHODS ====================

  private getAvailableBalance(): number {
    let available = 0;
    for (const balance of this.balances.values()) {
      if (balance.asset === 'USDT' || balance.asset === 'USDC' || balance.asset === 'BUSD') {
        available += balance.totalFree;
      } else {
        available += balance.usdValue * (balance.totalFree / balance.totalBalance);
      }
    }
    return available;
  }

  private calculateAverageLeverage(): number {
    const positions = Array.from(this.positions.values());
    if (positions.length === 0) return 1;
    
    let totalLeverage = 0;
    let count = 0;
    
    for (const pos of positions) {
      for (const ex of pos.byExchange.values()) {
        totalLeverage += ex.leverage;
        count++;
      }
    }
    
    return count > 0 ? totalLeverage / count : 1;
  }

  private calculateMaxLeverage(): number {
    const positions = Array.from(this.positions.values());
    let maxLeverage = 1;
    
    for (const pos of positions) {
      for (const ex of pos.byExchange.values()) {
        if (ex.leverage > maxLeverage) {
          maxLeverage = ex.leverage;
        }
      }
    }
    
    return maxLeverage;
  }

  private calculateWinRate(): number {
    const trades = this.tradeHistory;
    if (trades.length === 0) return 0;
    
    const wins = trades.filter(t => t.pnl > 0).length;
    return (wins / trades.length) * 100;
  }

  private calculateProfitFactor(): number {
    const trades = this.tradeHistory;
    const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    
    return grossLoss > 0 ? grossProfit / grossLoss : 0;
  }

  private calculateSharpeRatio(): number {
    const trades = this.tradeHistory;
    if (trades.length < 2) return 0;
    
    const returns = trades.map(t => t.pnl);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? avgReturn / stdDev : 0;
  }

  private calculateSortinoRatio(): number {
    const trades = this.tradeHistory;
    if (trades.length < 2) return 0;
    
    const returns = trades.map(t => t.pnl);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return 0;
    
    const downVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length;
    const downDev = Math.sqrt(downVariance);
    
    return downDev > 0 ? avgReturn / downDev : 0;
  }

  private calculateCalmarRatio(): number {
    const maxDrawdown = this.peakEquity - this.totalEquity;
    if (maxDrawdown <= 0) return 0;
    
    const annualizedReturn = this.calculateAnnualizedReturn();
    return annualizedReturn / (maxDrawdown / this.peakEquity * 100);
  }

  private calculateAnnualizedReturn(): number {
    const monthlyPnl = this.totalEquity - this.monthlyStartEquity;
    return monthlyPnl * 12; // Simplified
  }

  private calculateMaxConsecutiveWins(): number {
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const trade of this.tradeHistory) {
      if (trade.pnl > 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  }

  private calculateMaxConsecutiveLosses(): number {
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (const trade of this.tradeHistory) {
      if (trade.pnl < 0) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  }

  private parseBaseAsset(symbol: string): string {
    // Simple parsing - should be enhanced for different exchange formats
    const match = symbol.match(/^([A-Z]+)(USDT|USDC|BUSD|BTC|ETH)$/);
    return match ? match[1] : symbol;
  }

  private parseQuoteAsset(symbol: string): string {
    const match = symbol.match(/^(?:.*?)(USDT|USDC|BUSD|BTC|ETH)$/);
    return match ? match[1] : 'USDT';
  }
}

// ==================== SINGLETON INSTANCE ====================

export const portfolioManager = new PortfolioManager('default');
