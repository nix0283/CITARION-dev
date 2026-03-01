/**
 * Orchestration Layer - Main Entry Point
 * 
 * Provides unified event-driven communication for all CITARION bots.
 * 
 * @version 2.0.0
 * @author CITARION Architecture Team
 * 
 * @example
 * // Initialize event bus
 * import { EventBusManager, eventBus } from '@/lib/orchestration';
 * 
 * // Connect to NATS (production)
 * await EventBusManager.initialize({
 *   type: 'nats',
 *   nats: { servers: ['nats://localhost:4222'] }
 * });
 * 
 * // Or use in-memory (development)
 * await EventBusManager.initialize({ type: 'memory' });
 * 
 * // Subscribe to all trading signals
 * import { subscribeToSignals } from '@/lib/orchestration';
 * 
 * await subscribeToSignals((signal) => {
 *   console.log('Signal from:', signal.source, signal.payload);
 * });
 * 
 * // Publish a signal
 * import { publishSignal, BotCode } from '@/lib/orchestration';
 * 
 * await publishSignal('GRD', {
 *   symbol: 'BTCUSDT',
 *   exchange: 'binance',
 *   direction: 'LONG',
 *   confidence: 0.85,
 *   // ...
 * });
 */

// ==================== TYPES ====================

export * from './types';

// ==================== EVENT BUS ====================

export { 
  eventBus, 
  EventBusManager, 
  MemoryEventBus, 
  NATSEventBus,
  type IEventBus,
  type EventHandler,
  type SubscriptionOptions,
  type PublishOptions,
  type EventBusStats,
} from './event-bus';

// ==================== BOT REGISTRY ====================

export {
  BOT_REGISTRY,
  BotBase,
  getBotsByCategory,
  getEnabledBots,
  getBotByCode,
  getBotName,
  getAllBotCodes,
  getOperationalBotCodes,
  getInstitutionalBotCodes,
  getFrequencyBotCodes,
  getIntegrationBotCodes,
  getAnalyticsBotCodes,
} from './bot-registry';

// Re-export commonly used types from bot-registry
export {
  BotCode,
  BotCategory,
  BotMetadata,
  BotStatus,
  BotStatePayload,
  TradingSignalPayload,
  OrderPayload,
  PositionPayload,
  RiskAlertPayload,
  ForecastPayload,
  SignalDirection,
  SignalStrength,
  OrderSide,
  OrderType,
  OrderStatus,
  PositionSide,
  RiskSeverity,
  RiskAlertType,
} from './types';

// ==================== HELPER FUNCTIONS ====================

import { BaseEvent, TradingSignalPayload, OrderPayload, PositionPayload, RiskAlertPayload, createEvent, BotCode } from './types';
import { eventBus } from './event-bus';

/**
 * Subscribe to all trading signals
 */
export async function subscribeToSignals(
  handler: (event: BaseEvent<TradingSignalPayload>) => void | Promise<void>
): Promise<string> {
  return eventBus.subscribe('trading.signal.*', handler);
}

/**
 * Subscribe to signals from a specific bot
 */
export async function subscribeToBotSignals(
  botCode: BotCode,
  handler: (event: BaseEvent<TradingSignalPayload>) => void | Promise<void>
): Promise<string> {
  return eventBus.subscribe(`trading.signal.${botCode.toLowerCase()}`, handler);
}

/**
 * Subscribe to all order events
 */
export async function subscribeToOrders(
  handler: (event: BaseEvent<OrderPayload>) => void | Promise<void>
): Promise<string> {
  return eventBus.subscribe('trading.order.*', handler);
}

/**
 * Subscribe to all position events
 */
export async function subscribeToPositions(
  handler: (event: BaseEvent<PositionPayload>) => void | Promise<void>
): Promise<string> {
  return eventBus.subscribe('trading.position.*', handler);
}

/**
 * Subscribe to all risk alerts
 */
export async function subscribeToRiskAlerts(
  handler: (event: BaseEvent<RiskAlertPayload>) => void | Promise<void>
): Promise<string> {
  return eventBus.subscribe('risk.alert.*', handler);
}

/**
 * Publish a trading signal
 */
export async function publishSignal(
  source: BotCode,
  signal: TradingSignalPayload
): Promise<void> {
  const event = createEvent<TradingSignalPayload>(
    'trading',
    'signal',
    'generated',
    source,
    signal
  );
  await eventBus.publish(event);
}

/**
 * Publish an order event
 */
export async function publishOrder(
  source: BotCode,
  order: OrderPayload,
  action: 'created' | 'filled' | 'cancelled' | 'rejected'
): Promise<void> {
  const event = createEvent<OrderPayload>(
    'trading',
    'order',
    action,
    source,
    order
  );
  await eventBus.publish(event);
}

/**
 * Publish a position event
 */
export async function publishPosition(
  source: BotCode,
  position: PositionPayload,
  action: 'created' | 'updated' | 'deleted'
): Promise<void> {
  const event = createEvent<PositionPayload>(
    'trading',
    'position',
    action,
    source,
    position
  );
  await eventBus.publish(event);
}

/**
 * Publish a risk alert
 */
export async function publishRiskAlert(
  source: BotCode,
  alert: RiskAlertPayload
): Promise<void> {
  const event = createEvent<RiskAlertPayload>(
    'risk',
    'alert',
    'triggered',
    source,
    alert
  );
  await eventBus.publish(event);
}

// ==================== EXCHANGE ADAPTER ====================

export {
  exchangeFactory,
  ExchangeAdapterFactory,
  BaseExchangeAdapter,
  EXCHANGE_METADATA,
  type IExchangeAdapter,
  type IExchangeAdapterFactory,
  type ExchangeCode,
  type ExchangeConfig,
  type ExchangeMetadata,
  type Symbol,
  type Ticker,
  type Kline,
  type KlineInterval,
  type Orderbook,
  type Trade,
  type FundingRate,
  type OrderRequest,
  type Order,
  type Position,
  type PositionMode,
  type AccountInfo,
  type Balance,
  type WSSubscription,
  type WSState,
} from './exchange';

// ==================== RISK & PORTFOLIO ====================

export {
  riskManager,
  portfolioManager,
  RiskManager,
  PortfolioManager,
  DEFAULT_RISK_LIMITS,
  type RiskLevel,
  type RiskLimitType,
  type RiskLimit,
  type PortfolioRiskLimits,
  type RiskState,
  type RiskWarning,
  type PositionExposure,
  type ExposureSummary,
  type UnifiedPosition,
  type UnifiedBalance,
  type PortfolioSummary,
  type AllocationTarget,
  type RebalanceAction,
  type PerformanceMetrics,
} from './risk';
