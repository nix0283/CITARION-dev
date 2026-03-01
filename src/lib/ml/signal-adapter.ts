/**
 * Signal Adapter
 * 
 * Converts trading signals to standardized format.
 * Based on TradingView Backtest Adapter pattern.
 */

// ==================== TYPES ====================

export enum SignalType {
  NONE = 0,
  START_LONG = 1,
  END_LONG = 2,
  START_SHORT = -1,
  END_SHORT = -2,
}

export type TradeDirection = 'LONG' | 'SHORT' | 'NEUTRAL';

export interface TradingSession {
  name: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  timezone: string;
  daysOfWeek: number[];
}

export const TRADING_SESSIONS: Record<string, TradingSession> = {
  ASIAN: {
    name: 'Asian Session',
    startHour: 0, startMinute: 0, endHour: 8, endMinute: 0,
    timezone: 'UTC', daysOfWeek: [1, 2, 3, 4, 5],
  },
  LONDON: {
    name: 'London Session',
    startHour: 8, startMinute: 0, endHour: 16, endMinute: 0,
    timezone: 'UTC', daysOfWeek: [1, 2, 3, 4, 5],
  },
  NEW_YORK: {
    name: 'New York Session',
    startHour: 13, startMinute: 0, endHour: 21, endMinute: 0,
    timezone: 'UTC', daysOfWeek: [1, 2, 3, 4, 5],
  },
  LONDON_NY_OVERLAP: {
    name: 'London-NY Overlap',
    startHour: 13, startMinute: 0, endHour: 16, endMinute: 0,
    timezone: 'UTC', daysOfWeek: [1, 2, 3, 4, 5],
  },
  ALWAYS: {
    name: 'Always Active',
    startHour: 0, startMinute: 0, endHour: 23, endMinute: 59,
    timezone: 'UTC', daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  },
};

export interface SignalMetadata {
  timestamp: number;
  price: number;
  confidence?: number;
  probability?: number;
  source: string;
  timeframe: string;
  symbol: string;
  features?: Record<string, number>;
  filters?: { passed: boolean; reasons: string[] };
}

export interface Signal {
  type: SignalType;
  direction: TradeDirection;
  action: 'ENTER' | 'EXIT' | 'NONE';
  metadata: SignalMetadata;
}

export interface SignalAdapterConfig {
  useDateFilter: boolean;
  startDate?: Date;
  endDate?: Date;
  sessions: TradingSession[];
  useSessionFilter: boolean;
  minConfidence: number;
  minProbability: number;
  cooldownPeriod: number;
}

// ==================== HELPERS ====================

export function parseSignalType(value: number): SignalType {
  if (value >= 0.5) return SignalType.START_LONG;
  if (value <= -0.5 && value > -1.5) return SignalType.START_SHORT;
  if (value >= 1.5) return SignalType.END_LONG;
  if (value <= -1.5) return SignalType.END_SHORT;
  return SignalType.NONE;
}

export function signalToDirection(signal: SignalType): TradeDirection {
  if (signal === SignalType.START_LONG) return 'LONG';
  if (signal === SignalType.START_SHORT) return 'SHORT';
  return 'NEUTRAL';
}

export function signalToAction(signal: SignalType): 'ENTER' | 'EXIT' | 'NONE' {
  if (signal === SignalType.START_LONG || signal === SignalType.START_SHORT) return 'ENTER';
  if (signal === SignalType.END_LONG || signal === SignalType.END_SHORT) return 'EXIT';
  return 'NONE';
}

export function isInSession(timestamp: number, session: TradingSession): boolean {
  const date = new Date(timestamp);
  const dayOfWeek = date.getUTCDay();
  if (!session.daysOfWeek.includes(dayOfWeek)) return false;

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const currentTime = hours * 60 + minutes;
  const sessionStart = session.startHour * 60 + session.startMinute;
  const sessionEnd = session.endHour * 60 + session.endMinute;

  if (sessionStart <= sessionEnd) {
    return currentTime >= sessionStart && currentTime < sessionEnd;
  } else {
    return currentTime >= sessionStart || currentTime < sessionEnd;
  }
}

export function createSignalFromClassifierResult(
  result: { direction: 'LONG' | 'SHORT' | 'NEUTRAL'; probability: number; confidence: number },
  metadata: Omit<SignalMetadata, 'confidence' | 'probability'>
): number {
  if (result.direction === 'NEUTRAL') return SignalType.NONE;
  const strength = result.probability * result.confidence;
  if (strength < 0.3) return SignalType.NONE;
  return result.direction === 'LONG' ? SignalType.START_LONG : SignalType.START_SHORT;
}

// ==================== SIGNAL ADAPTER ====================

export class SignalAdapter {
  private config: SignalAdapterConfig;
  private positionState: { direction: TradeDirection; size: number; entryPrice: number } | null = null;
  private lastSignalTime: number = 0;

  constructor(config?: Partial<SignalAdapterConfig>) {
    this.config = {
      useDateFilter: false,
      sessions: [TRADING_SESSIONS.ALWAYS],
      useSessionFilter: false,
      minConfidence: 0.5,
      minProbability: 0.5,
      cooldownPeriod: 60000,
      ...config,
    };
  }

  canTrade(timestamp: number): { allowed: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (this.config.useDateFilter) {
      if (this.config.startDate && timestamp < this.config.startDate.getTime()) {
        reasons.push('Before start date');
      }
      if (this.config.endDate && timestamp > this.config.endDate.getTime()) {
        reasons.push('After end date');
      }
    }

    if (this.config.useSessionFilter && this.config.sessions.length > 0) {
      const inAnySession = this.config.sessions.some(s => isInSession(timestamp, s));
      if (!inAnySession) reasons.push('Outside trading session');
    }

    if (timestamp - this.lastSignalTime < this.config.cooldownPeriod) {
      reasons.push('In cooldown period');
    }

    return { allowed: reasons.length === 0, reasons };
  }

  processSignal(rawSignal: number, metadata: SignalMetadata): Signal {
    const signalType = parseSignalType(rawSignal);
    const direction = signalToDirection(signalType);
    const action = signalToAction(signalType);

    const tradeCheck = this.canTrade(metadata.timestamp);
    const reasons = [...tradeCheck.reasons];

    if (metadata.confidence !== undefined && metadata.confidence < this.config.minConfidence) {
      reasons.push(`Confidence below ${this.config.minConfidence}`);
    }
    if (metadata.probability !== undefined && metadata.probability < this.config.minProbability) {
      reasons.push(`Probability below ${this.config.minProbability}`);
    }

    const signal: Signal = {
      type: signalType,
      direction,
      action,
      metadata: {
        ...metadata,
        filters: { passed: reasons.length === 0, reasons },
      },
    };

    if (signal.metadata.filters!.passed) {
      this.lastSignalTime = metadata.timestamp;
      this.updatePositionState(signal);
    }

    return signal;
  }

  private updatePositionState(signal: Signal): void {
    switch (signal.type) {
      case SignalType.START_LONG:
      case SignalType.START_SHORT:
        this.positionState = {
          direction: signal.direction,
          size: 1,
          entryPrice: signal.metadata.price,
        };
        break;
      case SignalType.END_LONG:
      case SignalType.END_SHORT:
        this.positionState = null;
        break;
    }
  }

  getPositionState() { return this.positionState; }
  getConfig() { return { ...this.config }; }
  setConfig(config: Partial<SignalAdapterConfig>) { this.config = { ...this.config, ...config }; }
  reset() { this.positionState = null; this.lastSignalTime = 0; }
}

// ==================== SINGLETON ====================

let adapterInstance: SignalAdapter | null = null;

export function getSignalAdapter(config?: Partial<SignalAdapterConfig>): SignalAdapter {
  if (!adapterInstance) adapterInstance = new SignalAdapter(config);
  else if (config) adapterInstance.setConfig(config);
  return adapterInstance;
}

export function resetSignalAdapter(): void { adapterInstance = null; }

const signalAdapterModule = {
  SignalType, TRADING_SESSIONS,
  parseSignalType, signalToDirection, signalToAction, isInSession,
  createSignalFromClassifierResult,
  SignalAdapter, getSignalAdapter, resetSignalAdapter,
};

export default signalAdapterModule;
