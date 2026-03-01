/**
 * Argus Bot Circuit Breaker
 */

export interface CircuitBreakerConfig {
  enabled: boolean;
  maxConsecutiveLosses: number;
  maxDailyLoss: number;
  maxDailyLossPercent: number;
  cooldownMinutes: number;
  maxTradesPerHour: number;
}

export interface CircuitBreakerState {
  active: boolean;
  triggeredAt?: Date;
  reason?: string;
  until?: Date;
  consecutiveLosses: number;
  dailyPnl: number;
  hourlyTrades: number;
  lastTradeTime?: Date;
  lastReset: Date;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  enabled: true,
  maxConsecutiveLosses: 5,
  maxDailyLoss: 500,
  maxDailyLossPercent: 10,
  cooldownMinutes: 60,
  maxTradesPerHour: 20,
};

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState;
  private initialBalance: number;

  constructor(config: Partial<CircuitBreakerConfig> = {}, initialBalance: number = 10000) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialBalance = initialBalance;
    this.state = {
      active: false,
      consecutiveLosses: 0,
      dailyPnl: 0,
      hourlyTrades: 0,
      lastReset: new Date(),
    };
  }

  canTrade(): { allowed: boolean; reason?: string } {
    if (!this.config.enabled) return { allowed: true };

    if (this.state.active) {
      if (this.state.until && new Date() < this.state.until) {
        return { allowed: false, reason: `Circuit breaker active until ${this.state.until.toISOString()}` };
      } else {
        this.deactivate();
      }
    }

    this.checkHourlyReset();
    if (this.state.hourlyTrades >= this.config.maxTradesPerHour) {
      return { allowed: false, reason: `Hourly trade limit reached (${this.config.maxTradesPerHour})` };
    }

    return { allowed: true };
  }

  recordTrade(pnl: number): { triggered: boolean; reason?: string } {
    this.state.dailyPnl += pnl;
    this.state.hourlyTrades++;
    this.state.lastTradeTime = new Date();

    if (pnl < 0) {
      this.state.consecutiveLosses++;
      if (this.state.consecutiveLosses >= this.config.maxConsecutiveLosses) {
        return this.trigger(`Too many consecutive losses (${this.state.consecutiveLosses})`);
      }
    } else {
      this.state.consecutiveLosses = 0;
    }

    if (this.state.dailyPnl <= -this.config.maxDailyLoss) {
      return this.trigger(`Max daily loss reached ($${this.config.maxDailyLoss})`);
    }

    const dailyLossPercent = (Math.abs(this.state.dailyPnl) / this.initialBalance) * 100;
    if (dailyLossPercent >= this.config.maxDailyLossPercent) {
      return this.trigger(`Max daily loss percent reached (${dailyLossPercent.toFixed(1)}%)`);
    }

    return { triggered: false };
  }

  private trigger(reason: string): { triggered: boolean; reason: string } {
    this.state.active = true;
    this.state.triggeredAt = new Date();
    this.state.reason = reason;
    this.state.until = new Date(Date.now() + this.config.cooldownMinutes * 60 * 1000);
    console.warn(`[CircuitBreaker] TRIGGERED: ${reason}. Cooldown until ${this.state.until}`);
    return { triggered: true, reason };
  }

  private deactivate(): void {
    this.state.active = false;
    this.state.triggeredAt = undefined;
    this.state.reason = undefined;
    this.state.until = undefined;
    this.state.consecutiveLosses = 0;
  }

  private checkHourlyReset(): void {
    const now = new Date();
    const hoursSinceReset = (now.getTime() - this.state.lastReset.getTime()) / (60 * 60 * 1000);
    if (hoursSinceReset >= 1) {
      this.state.hourlyTrades = 0;
      this.state.lastReset = now;
    }
  }

  resetDaily(): void {
    this.state.dailyPnl = 0;
    this.state.hourlyTrades = 0;
    this.state.consecutiveLosses = 0;
    this.state.lastReset = new Date();
  }

  forceReset(): void {
    this.state = { active: false, consecutiveLosses: 0, dailyPnl: 0, hourlyTrades: 0, lastReset: new Date() };
  }

  getState(): CircuitBreakerState { return { ...this.state }; }
  updateConfig(config: Partial<CircuitBreakerConfig>): void { this.config = { ...this.config, ...config }; }
  updateBalance(balance: number): void { this.initialBalance = balance; }
}
