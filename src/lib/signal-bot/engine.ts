/**
 * Signal Bot - Copy, Open & Escort System
 * 
 * Institutional-grade signal processing system with:
 * - Multi-source signal aggregation
 * - Signal validation and deduplication
 * - Position copying with risk scaling
 * - Trade escort (trailing stop, take profit management)
 * - Performance tracking and analytics
 * - Signal source reputation scoring
 * 
 * Version: 2.0.0
 */

// ==================== TYPES ====================

export type SignalSource = 'TRADINGVIEW' | 'TELEGRAM' | 'API' | 'MANUAL' | 'COPY_TRADING';
export type SignalStatus = 'PENDING' | 'VALIDATED' | 'EXECUTED' | 'ESCORTING' | 'CLOSED' | 'REJECTED' | 'EXPIRED';
export type PositionSide = 'LONG' | 'SHORT';
export type EscortMode = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'CUSTOM';

export interface Signal {
  id: string;
  source: SignalSource;
  symbol: string;
  side: PositionSide;
  entryPrice?: number;
  entryRange?: { min: number; max: number };
  stopLoss?: number;
  takeProfitTargets: TakeProfitLevel[];
  leverage?: number;
  timeframe?: string;
  notes?: string;
  receivedAt: number;
  validUntil?: number;
  status: SignalStatus;
  confidence: number;
  sourceReputation: number;
}

export interface TakeProfitLevel {
  price: number;
  percent: number;
  hit: boolean;
  hitAt?: number;
}

export interface EscortedPosition {
  id: string;
  signalId: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  remainingQuantity: number;
  originalStopLoss: number;
  currentStopLoss: number;
  takeProfitLevels: TakeProfitLevel[];
  highestPrice: number;
  lowestPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl: number;
  escortMode: EscortMode;
  trailingActivationPercent: number;
  trailingDistancePercent: number;
  breakEvenTriggered: boolean;
  breakEvenOffsetPercent: number;
  maxRiskPercent: number;
  openedAt: number;
  lastUpdatedAt: number;
  status: 'OPEN' | 'CLOSING' | 'CLOSED';
  closeReason?: string;
  riskScore: number;
}

export interface SignalSourceStats {
  source: SignalSource;
  totalSignals: number;
  executedSignals: number;
  winningSignals: number;
  losingSignals: number;
  winRate: number;
  avgPnl: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  reputation: number;
  lastSignalAt: number;
}

export interface SignalBotConfig {
  requireEntryPrice: boolean;
  requireStopLoss: boolean;
  requireTakeProfit: boolean;
  minRiskReward: number;
  maxEntryDeviationPercent: number;
  signalExpiryMs: number;
  maxRiskPerTrade: number;
  maxPositionSize: number;
  maxPositionsPerSymbol: number;
  maxTotalPositions: number;
  maxLeverage: number;
  defaultLeverage: number;
  defaultEscortMode: EscortMode;
  defaultTrailingActivation: number;
  defaultTrailingDistance: number;
  defaultBreakEvenTrigger: number;
  defaultBreakEvenOffset: number;
  partialTakeProfitEnabled: boolean;
  allowedSymbols: string[];
  blockedSymbols: string[];
  minSourceReputation: number;
  maxDailySignals: number;
  signalCooldownMs: number;
  trackSourceReputation: boolean;
  reputationDecayFactor: number;
  minSignalsForReputation: number;
}

export interface SignalBotState {
  pendingSignals: Signal[];
  activePositions: Map<string, EscortedPosition>;
  sourceStats: Map<SignalSource, SignalSourceStats>;
  dailySignalCount: number;
  lastSignalTime: number;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  winCount: number;
  lossCount: number;
}

// ==================== CONSTANTS ====================

export const DEFAULT_SIGNAL_BOT_CONFIG: SignalBotConfig = {
  requireEntryPrice: false,
  requireStopLoss: true,
  requireTakeProfit: true,
  minRiskReward: 1.5,
  maxEntryDeviationPercent: 0.5,
  signalExpiryMs: 300000,
  maxRiskPerTrade: 2,
  maxPositionSize: 1000,
  maxPositionsPerSymbol: 1,
  maxTotalPositions: 10,
  maxLeverage: 10,
  defaultLeverage: 3,
  defaultEscortMode: 'MODERATE',
  defaultTrailingActivation: 1,
  defaultTrailingDistance: 0.5,
  defaultBreakEvenTrigger: 1,
  defaultBreakEvenOffset: 0.2,
  partialTakeProfitEnabled: true,
  allowedSymbols: [],
  blockedSymbols: [],
  minSourceReputation: 30,
  maxDailySignals: 50,
  signalCooldownMs: 60000,
  trackSourceReputation: true,
  reputationDecayFactor: 0.95,
  minSignalsForReputation: 5,
};

const ESCORT_PRESETS = {
  CONSERVATIVE: { trailingActivation: 0.5, trailingDistance: 0.3, breakEvenTrigger: 0.5, breakEvenOffset: 0.1 },
  MODERATE: { trailingActivation: 1.0, trailingDistance: 0.5, breakEvenTrigger: 1.0, breakEvenOffset: 0.2 },
  AGGRESSIVE: { trailingActivation: 1.5, trailingDistance: 0.8, breakEvenTrigger: 1.5, breakEvenOffset: 0.3 },
};

// ==================== SIGNAL VALIDATOR ====================

export class SignalValidator {
  private config: SignalBotConfig;

  constructor(config: SignalBotConfig) { this.config = config; }

  validate(signal: Signal, currentPrice: number, sourceStats: SignalSourceStats | undefined): {
    valid: boolean; errors: string[]; warnings: string[]; adjustedEntry?: number; riskReward?: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (sourceStats && sourceStats.reputation < this.config.minSourceReputation) {
      errors.push(`Source reputation ${sourceStats.reputation.toFixed(0)} < ${this.config.minSourceReputation}`);
    }
    if (this.config.allowedSymbols.length > 0 && !this.config.allowedSymbols.includes(signal.symbol)) {
      errors.push(`Symbol ${signal.symbol} not in allowed list`);
    }
    if (this.config.blockedSymbols.includes(signal.symbol)) {
      errors.push(`Symbol ${signal.symbol} is blocked`);
    }
    if (signal.validUntil && signal.validUntil < Date.now()) {
      errors.push('Signal has expired');
    }

    let adjustedEntry = signal.entryPrice;
    if (!signal.entryPrice && this.config.requireEntryPrice) {
      errors.push('Entry price required');
    } else if (!signal.entryPrice) {
      adjustedEntry = currentPrice;
      warnings.push(`Using current price ${currentPrice} as entry`);
    }

    if (this.config.requireStopLoss && !signal.stopLoss) errors.push('Stop loss required');
    if (this.config.requireTakeProfit && signal.takeProfitTargets.length === 0) {
      errors.push('Take profit targets required');
    }

    let riskReward: number | undefined;
    if (adjustedEntry && signal.stopLoss && signal.takeProfitTargets.length > 0) {
      const risk = Math.abs(adjustedEntry - signal.stopLoss);
      const reward = Math.abs(signal.takeProfitTargets[0].price - adjustedEntry);
      riskReward = reward / (risk + 0.0001);
      if (riskReward < this.config.minRiskReward) {
        errors.push(`R:R ${riskReward.toFixed(2)} < ${this.config.minRiskReward}`);
      }
    }

    if (signal.leverage && signal.leverage > this.config.maxLeverage) {
      warnings.push(`Leverage ${signal.leverage}x exceeds max ${this.config.maxLeverage}x`);
    }

    return { valid: errors.length === 0, errors, warnings, adjustedEntry, riskReward };
  }

  isDuplicate(signal: Signal, recentSignals: Signal[]): boolean {
    const recentWindow = Date.now() - 60000;
    return recentSignals.some(s =>
      s.symbol === signal.symbol && s.side === signal.side && s.source === signal.source &&
      s.receivedAt > recentWindow &&
      Math.abs((s.entryPrice || 0) - (signal.entryPrice || 0)) / (signal.entryPrice || 1) < 0.001
    );
  }
}

// ==================== POSITION ESCORT ====================

export class PositionEscort {
  private config: SignalBotConfig;

  constructor(config: SignalBotConfig) { this.config = config; }

  createPosition(signal: Signal, entryPrice: number, quantity: number, _portfolioValue: number): EscortedPosition {
    const presets = ESCORT_PRESETS[this.config.defaultEscortMode];
    return {
      id: `pos-${signal.id}`,
      signalId: signal.id,
      symbol: signal.symbol,
      side: signal.side,
      entryPrice,
      currentPrice: entryPrice,
      quantity,
      remainingQuantity: quantity,
      originalStopLoss: signal.stopLoss || this.calculateDefaultStop(entryPrice, signal.side),
      currentStopLoss: signal.stopLoss || this.calculateDefaultStop(entryPrice, signal.side),
      takeProfitLevels: signal.takeProfitTargets.map(tp => ({ ...tp, hit: false })),
      highestPrice: entryPrice,
      lowestPrice: entryPrice,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      realizedPnl: 0,
      escortMode: this.config.defaultEscortMode,
      trailingActivationPercent: presets.trailingActivation,
      trailingDistancePercent: presets.trailingDistance,
      breakEvenTriggered: false,
      breakEvenOffsetPercent: presets.breakEvenOffset,
      maxRiskPercent: this.config.maxRiskPerTrade,
      openedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      status: 'OPEN',
      riskScore: this.calculateRiskScore(signal),
    };
  }

  updatePosition(position: EscortedPosition, currentPrice: number): EscortedPosition {
    const updated = { ...position, currentPrice, lastUpdatedAt: Date.now() };
    if (currentPrice > updated.highestPrice) updated.highestPrice = currentPrice;
    if (currentPrice < updated.lowestPrice) updated.lowestPrice = currentPrice;

    const priceDiff = updated.side === 'LONG' ? currentPrice - updated.entryPrice : updated.entryPrice - currentPrice;
    updated.unrealizedPnl = priceDiff * updated.remainingQuantity;
    updated.unrealizedPnlPercent = (priceDiff / updated.entryPrice) * 100;

    for (const tp of updated.takeProfitLevels) {
      if (!tp.hit && this.isTakeProfitHit(updated, tp, currentPrice)) {
        tp.hit = true;
        tp.hitAt = Date.now();
      }
    }

    updated.currentStopLoss = this.updateTrailingStop(updated);
    if (!updated.breakEvenTriggered && updated.unrealizedPnlPercent >= updated.breakEvenOffsetPercent * 2) {
      updated.breakEvenTriggered = true;
      updated.currentStopLoss = updated.side === 'LONG'
        ? updated.entryPrice * (1 + updated.breakEvenOffsetPercent / 100)
        : updated.entryPrice * (1 - updated.breakEvenOffsetPercent / 100);
    }

    return updated;
  }

  shouldClosePosition(position: EscortedPosition): { close: boolean; reason: string } {
    if (this.isStopLossHit(position)) return { close: true, reason: 'Stop loss triggered' };
    if (position.takeProfitTargets.every(tp => tp.hit)) return { close: true, reason: 'All take profits reached' };
    return { close: false, reason: '' };
  }

  private calculateDefaultStop(entryPrice: number, side: PositionSide): number {
    return side === 'LONG' ? entryPrice * 0.98 : entryPrice * 1.02;
  }

  private calculateRiskScore(signal: Signal): number {
    let score = 50;
    if (!signal.stopLoss) score += 20;
    if (signal.takeProfitTargets.length === 0) score += 15;
    if (signal.leverage && signal.leverage > 5) score += 10;
    if (signal.confidence < 0.5) score += 10;
    return Math.min(100, score);
  }

  private isTakeProfitHit(position: EscortedPosition, tp: TakeProfitLevel, currentPrice: number): boolean {
    return position.side === 'LONG' ? currentPrice >= tp.price : currentPrice <= tp.price;
  }

  private isStopLossHit(position: EscortedPosition): boolean {
    return position.side === 'LONG' ? position.currentPrice <= position.currentStopLoss : position.currentPrice >= position.currentStopLoss;
  }

  private updateTrailingStop(position: EscortedPosition): number {
    if (position.unrealizedPnlPercent < position.trailingActivationPercent) return position.currentStopLoss;
    const newStop = position.side === 'LONG'
      ? position.highestPrice * (1 - position.trailingDistancePercent / 100)
      : position.lowestPrice * (1 + position.trailingDistancePercent / 100);
    if (position.side === 'LONG' && newStop > position.currentStopLoss) return newStop;
    if (position.side === 'SHORT' && newStop < position.currentStopLoss) return newStop;
    return position.currentStopLoss;
  }

  calculatePositionSize(entryPrice: number, stopLoss: number, portfolioValue: number, leverage: number = 1): number {
    const riskAmount = portfolioValue * (this.config.maxRiskPerTrade / 100);
    const stopDistance = Math.abs(entryPrice - stopLoss);
    if (stopDistance === 0) return Math.min(this.config.maxPositionSize, portfolioValue * 0.1);
    return Math.min(riskAmount / stopDistance * leverage, this.config.maxPositionSize / entryPrice);
  }
}

// ==================== REPUTATION TRACKER ====================

export class ReputationTracker {
  private stats: Map<SignalSource, SignalSourceStats> = new Map();
  private config: SignalBotConfig;

  constructor(config: SignalBotConfig) {
    this.config = config;
    for (const source of ['TRADINGVIEW', 'TELEGRAM', 'API', 'MANUAL', 'COPY_TRADING'] as SignalSource[]) {
      this.stats.set(source, {
        source, totalSignals: 0, executedSignals: 0, winningSignals: 0, losingSignals: 0,
        winRate: 0, avgPnl: 0, avgWin: 0, avgLoss: 0, profitFactor: 0, reputation: 50, lastSignalAt: 0,
      });
    }
  }

  recordSignal(source: SignalSource): void {
    const stats = this.stats.get(source);
    if (stats) { stats.totalSignals++; stats.lastSignalAt = Date.now(); }
  }

  recordExecution(source: SignalSource): void {
    const stats = this.stats.get(source);
    if (stats) stats.executedSignals++;
  }

  recordResult(source: SignalSource, pnl: number): void {
    const stats = this.stats.get(source);
    if (!stats) return;
    if (pnl > 0) {
      stats.winningSignals++;
      stats.avgWin = (stats.avgWin * (stats.winningSignals - 1) + pnl) / stats.winningSignals;
    } else {
      stats.losingSignals++;
      stats.avgLoss = (stats.avgLoss * (stats.losingSignals - 1) + Math.abs(pnl)) / stats.losingSignals;
    }
    stats.winRate = stats.winningSignals / Math.max(1, stats.executedSignals);
    stats.avgPnl = (stats.avgWin * stats.winningSignals - stats.avgLoss * stats.losingSignals) / Math.max(1, stats.executedSignals);
    stats.profitFactor = stats.avgLoss > 0 ? stats.avgWin / stats.avgLoss : 0;
    if (stats.executedSignals >= this.config.minSignalsForReputation) {
      stats.reputation = Math.min(100, Math.max(0, stats.winRate * 50 + Math.min(50, stats.profitFactor * 10)));
    }
  }

  applyDecay(): void {
    if (!this.config.trackSourceReputation) return;
    this.stats.forEach(s => { s.reputation = Math.max(0, s.reputation * this.config.reputationDecayFactor); });
  }

  getStats(source: SignalSource): SignalSourceStats | undefined { return this.stats.get(source); }
  getAllStats(): Map<SignalSource, SignalSourceStats> { return new Map(this.stats); }
}

// ==================== SIGNAL BOT ====================

export class SignalBot {
  private config: SignalBotConfig;
  private state: SignalBotState;
  private validator: SignalValidator;
  private escort: PositionEscort;
  private reputationTracker: ReputationTracker;
  private signalCallbacks: Array<(signal: Signal) => void> = [];
  private positionCallbacks: Array<(position: EscortedPosition) => void> = [];

  constructor(config: Partial<SignalBotConfig> = {}) {
    this.config = { ...DEFAULT_SIGNAL_BOT_CONFIG, ...config };
    this.state = {
      pendingSignals: [], activePositions: new Map(), sourceStats: new Map(),
      dailySignalCount: 0, lastSignalTime: 0, totalPnl: 0, realizedPnl: 0, unrealizedPnl: 0, winCount: 0, lossCount: 0,
    };
    this.validator = new SignalValidator(this.config);
    this.escort = new PositionEscort(this.config);
    this.reputationTracker = new ReputationTracker(this.config);
  }

  receiveSignal(rawSignal: Omit<Signal, 'id' | 'receivedAt' | 'status' | 'sourceReputation'>, source: SignalSource): Signal {
    const sourceStats = this.reputationTracker.getStats(source);
    const signal: Signal = {
      ...rawSignal,
      id: `sig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      source, receivedAt: Date.now(), status: 'PENDING',
      confidence: rawSignal.confidence ?? 0.5,
      sourceReputation: sourceStats?.reputation ?? 50,
    };

    if (this.validator.isDuplicate(signal, this.state.pendingSignals) ||
        this.state.dailySignalCount >= this.config.maxDailySignals ||
        Date.now() - this.state.lastSignalTime < this.config.signalCooldownMs) {
      signal.status = 'REJECTED';
      return signal;
    }

    this.state.pendingSignals.push(signal);
    this.state.dailySignalCount++;
    this.state.lastSignalTime = Date.now();
    this.reputationTracker.recordSignal(source);
    return signal;
  }

  validateSignal(signal: Signal, currentPrice: number): { signal: Signal; validation: ReturnType<SignalValidator['validate']> } {
    const validation = this.validator.validate(signal, currentPrice, this.reputationTracker.getStats(signal.source));
    signal.status = validation.valid ? 'VALIDATED' : 'REJECTED';
    return { signal, validation };
  }

  executeSignal(signal: Signal, entryPrice: number, portfolioValue: number): EscortedPosition | null {
    if (signal.status !== 'VALIDATED') return null;
    const symbolPositions = Array.from(this.state.activePositions.values()).filter(p => p.symbol === signal.symbol);
    if (symbolPositions.length >= this.config.maxPositionsPerSymbol || this.state.activePositions.size >= this.config.maxTotalPositions) return null;

    const leverage = Math.min(signal.leverage || this.config.defaultLeverage, this.config.maxLeverage);
    const stopLoss = signal.stopLoss || entryPrice * (signal.side === 'LONG' ? 0.98 : 1.02);
    const quantity = this.escort.calculatePositionSize(entryPrice, stopLoss, portfolioValue, leverage);
    const position = this.escort.createPosition(signal, entryPrice, quantity, portfolioValue);

    this.state.activePositions.set(position.id, position);
    signal.status = 'EXECUTED';
    this.reputationTracker.recordExecution(signal.source);
    this.positionCallbacks.forEach(cb => cb(position));
    this.signalCallbacks.forEach(cb => cb(signal));
    return position;
  }

  updatePositions(prices: Map<string, number>): EscortedPosition[] {
    const updatedPositions: EscortedPosition[] = [];
    const toClose: { id: string; reason: string }[] = [];

    for (const [id, position] of this.state.activePositions) {
      const currentPrice = prices.get(position.symbol);
      if (!currentPrice) continue;
      const updated = this.escort.updatePosition(position, currentPrice);
      this.state.activePositions.set(id, updated);
      updatedPositions.push(updated);
      const { close, reason } = this.escort.shouldClosePosition(updated);
      if (close) toClose.push({ id, reason });
    }

    this.state.unrealizedPnl = Array.from(this.state.activePositions.values()).reduce((sum, p) => sum + p.unrealizedPnl, 0);
    for (const { id, reason } of toClose) this.closePosition(id, reason);
    return updatedPositions;
  }

  closePosition(positionId: string, reason: string): EscortedPosition | null {
    const position = this.state.activePositions.get(positionId);
    if (!position) return null;

    position.status = 'CLOSED';
    position.closeReason = reason;
    position.realizedPnl = position.unrealizedPnl;
    this.state.realizedPnl += position.realizedPnl;
    this.state.totalPnl += position.realizedPnl;
    if (position.realizedPnl > 0) this.state.winCount++; else this.state.lossCount++;

    const signal = this.state.pendingSignals.find(s => s.id === position.signalId);
    if (signal) { this.reputationTracker.recordResult(signal.source, position.realizedPnl); signal.status = 'CLOSED'; }

    this.state.activePositions.delete(positionId);
    this.positionCallbacks.forEach(cb => cb(position));
    return position;
  }

  setEscortMode(positionId: string, mode: EscortMode): boolean {
    const position = this.state.activePositions.get(positionId);
    if (!position) return false;
    const presets = ESCORT_PRESETS[mode];
    Object.assign(position, { escortMode: mode, ...presets });
    return true;
  }

  onSignal(callback: (signal: Signal) => void): void { this.signalCallbacks.push(callback); }
  onPosition(callback: (position: EscortedPosition) => void): void { this.positionCallbacks.push(callback); }
  getState(): SignalBotState { return { ...this.state, activePositions: new Map(this.state.activePositions), sourceStats: this.reputationTracker.getAllStats() }; }
  getPendingSignals(): Signal[] { return [...this.state.pendingSignals]; }
  getActivePositions(): EscortedPosition[] { return Array.from(this.state.activePositions.values()); }
  getPosition(id: string): EscortedPosition | undefined { return this.state.activePositions.get(id); }
  getSourceStats(source: SignalSource): SignalSourceStats | undefined { return this.reputationTracker.getStats(source); }

  resetDaily(): void {
    this.state.dailySignalCount = 0;
    this.state.pendingSignals = this.state.pendingSignals.filter(s => s.status === 'PENDING');
    this.reputationTracker.applyDecay();
  }

  reset(): void {
    this.state = {
      pendingSignals: [], activePositions: new Map(), sourceStats: new Map(),
      dailySignalCount: 0, lastSignalTime: 0, totalPnl: 0, realizedPnl: 0, unrealizedPnl: 0, winCount: 0, lossCount: 0,
    };
  }
}

export default { SignalBot, SignalValidator, PositionEscort, ReputationTracker, DEFAULT_SIGNAL_BOT_CONFIG };
