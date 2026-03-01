/**
 * Orchestration Layer Types
 * 
 * Core types for the CITARION event-driven architecture.
 * All bots communicate through the Event Bus using these standardized types.
 * 
 * @version 2.0.0
 * @author CITARION Architecture Team
 */

// ==================== BOT IDENTIFICATION ====================

/**
 * Three-letter bot codes for identification
 */
export type BotCode = 
  // Operational Bots
  | 'GRD'  // MESH - Grid Trading
  | 'DCA'  // SCALE - Dollar Cost Averaging
  | 'BBB'  // BAND - Bollinger Bands
  | 'RNG'  // EDGE - Range Trading
  | 'PND'  // Argus - Pump & Dump Detection
  | 'FCS'  // Vision - Forecasting
  // Institutional Bots
  | 'ARB'  // Orion - Arbitrage
  | 'PAR'  // Spectrum - Pairs Trading
  | 'STA'  // Reed - Statistical Trading
  | 'MMK'  // Architect - Market Making
  | 'MRB'  // Equilibrist - Mean Reversion Basket
  | 'TRF'  // Kron - Transfer/Rebalancing
  // Frequency Bots
  | 'HFT'  // Helios - High Frequency Trading
  | 'MFT'  // Selene - Medium Frequency Trading
  | 'LFT'  // Atlas - Low Frequency Trading
  // Integration & Analytics
  | 'ORA'  // Oracle - Chat Bot
  | 'LUM'  // Lumi - Data Integration
  | 'WLF'  // Wolf - Alert System
  | 'LOG'; // LOGOS - Analyst & Autonomous Trader

/**
 * Bot classification
 */
export type BotCategory = 'operational' | 'institutional' | 'frequency' | 'integration' | 'analytics';

/**
 * Bot metadata
 */
export interface BotMetadata {
  code: BotCode;
  name: string;
  category: BotCategory;
  description: string;
  version: string;
  enabled: boolean;
}

// ==================== EVENT TYPES ====================

/**
 * Event domains for topic namespacing
 */
export type EventDomain = 
  | 'trading'
  | 'market'
  | 'risk'
  | 'execution'
  | 'analytics'
  | 'system'
  | 'notification';

/**
 * Event entities
 */
export type EventEntity = 
  | 'signal'
  | 'order'
  | 'position'
  | 'orderbook'
  | 'ticker'
  | 'kline'
  | 'portfolio'
  | 'balance'
  | 'bot'
  | 'alert';

/**
 * Event actions
 */
export type EventAction = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'executed'
  | 'filled'
  | 'cancelled'
  | 'rejected'
  | 'generated'
  | 'triggered'
  | 'started'
  | 'stopped'
  | 'error';

/**
 * Event priority levels
 */
export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * Base event structure
 */
export interface BaseEvent<T = unknown> {
  id: string;
  topic: string;
  domain: EventDomain;
  entity: EventEntity;
  action: EventAction;
  timestamp: number;
  source: BotCode;
  priority: EventPriority;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
  payload: T;
}

// ==================== TRADING SIGNALS ====================

/**
 * Signal direction
 */
export type SignalDirection = 'LONG' | 'SHORT' | 'EXIT_LONG' | 'EXIT_SHORT' | 'CLOSE_ALL';

/**
 * Signal strength classification
 */
export type SignalStrength = 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';

/**
 * Trading signal payload
 */
export interface TradingSignalPayload {
  symbol: string;
  exchange: string;
  direction: SignalDirection;
  strength: SignalStrength;
  confidence: number;  // 0-100
  entryPrice?: number;
  entryZone?: { min: number; max: number };
  stopLoss?: number;
  takeProfit?: number;
  takeProfitLevels?: Array<{ price: number; percent: number }>;
  positionSize?: number;
  positionSizePercent?: number;
  leverage?: number;
  riskRewardRatio?: number;
  timeframe?: string;
  strategy?: string;
  expiresAt?: number;
  metadata?: {
    indicators?: Record<string, number>;
    regime?: string;
    volatility?: number;
    volume?: number;
    [key: string]: unknown;
  };
}

/**
 * Trading signal event
 */
export type TradingSignalEvent = BaseEvent<TradingSignalPayload> & {
  domain: 'trading';
  entity: 'signal';
};

// ==================== ORDER MANAGEMENT ====================

/**
 * Order side
 */
export type OrderSide = 'BUY' | 'SELL';

/**
 * Order type
 */
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'TRAILING_STOP';

/**
 * Order status
 */
export type OrderStatus = 'PENDING' | 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';

/**
 * Order payload
 */
export interface OrderPayload {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  exchange: string;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price?: number;
  quantity: number;
  filledQuantity?: number;
  avgPrice?: number;
  stopPrice?: number;
  timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTX';
  reduceOnly?: boolean;
  positionSide?: 'LONG' | 'SHORT' | 'BOTH';
  commission?: number;
  commissionAsset?: string;
  createdAt: number;
  updatedAt?: number;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Order event
 */
export type OrderEvent = BaseEvent<OrderPayload> & {
  domain: 'trading';
  entity: 'order';
};

// ==================== POSITION MANAGEMENT ====================

/**
 * Position side
 */
export type PositionSide = 'LONG' | 'SHORT';

/**
 * Position status
 */
export type PositionStatus = 'OPEN' | 'CLOSED' | 'LIQUIDATED';

/**
 * Position payload
 */
export interface PositionPayload {
  positionId: string;
  symbol: string;
  exchange: string;
  side: PositionSide;
  status: PositionStatus;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  notionalValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  realizedPnl?: number;
  leverage: number;
  margin: number;
  liquidationPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  openedAt: number;
  closedAt?: number;
  botCode: BotCode;
}

/**
 * Position event
 */
export type PositionEvent = BaseEvent<PositionPayload> & {
  domain: 'trading';
  entity: 'position';
};

// ==================== MARKET DATA ====================

/**
 * Orderbook level
 */
export interface OrderbookLevel {
  price: number;
  quantity: number;
  cumulative?: number;
}

/**
 * Orderbook snapshot payload
 */
export interface OrderbookPayload {
  symbol: string;
  exchange: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  timestamp: number;
  sequence?: number;
  spread?: number;
  midPrice?: number;
  imbalance?: number;
}

/**
 * Orderbook event
 */
export type OrderbookEvent = BaseEvent<OrderbookPayload> & {
  domain: 'market';
  entity: 'orderbook';
};

/**
 * Ticker payload
 */
export interface TickerPayload {
  symbol: string;
  exchange: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  bidQuantity: number;
  askQuantity: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
  quoteVolume?: number;
  priceChange?: number;
  priceChangePercent?: number;
  fundingRate?: number;
  nextFundingTime?: number;
  timestamp: number;
}

/**
 * Ticker event
 */
export type TickerEvent = BaseEvent<TickerPayload> & {
  domain: 'market';
  entity: 'ticker';
};

/**
 * Kline/Candlestick payload
 */
export interface KlinePayload {
  symbol: string;
  exchange: string;
  interval: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume?: number;
  trades?: number;
  takerBuyVolume?: number;
  takerBuyQuoteVolume?: number;
}

/**
 * Kline event
 */
export type KlineEvent = BaseEvent<KlinePayload> & {
  domain: 'market';
  entity: 'kline';
};

// ==================== RISK MANAGEMENT ====================

/**
 * Risk alert severity
 */
export type RiskSeverity = 'info' | 'warning' | 'critical' | 'emergency';

/**
 * Risk alert type
 */
export type RiskAlertType = 
  | 'DRAWDOWN_THRESHOLD'
  | 'POSITION_LIMIT'
  | 'LEVERAGE_LIMIT'
  | 'CORRELATION_LIMIT'
  | 'DAILY_LOSS_LIMIT'
  | 'EXPOSURE_LIMIT'
  | 'MARGIN_CALL'
  | 'LIQUIDATION_RISK'
  | 'API_ERROR'
  | 'CONNECTION_LOST';

/**
 * Risk alert payload
 */
export interface RiskAlertPayload {
  type: RiskAlertType;
  severity: RiskSeverity;
  message: string;
  currentValue: number;
  threshold: number;
  portfolioId?: string;
  botCode?: BotCode;
  symbol?: string;
  exchange?: string;
  recommendation?: string;
  timestamp: number;
}

/**
 * Risk alert event
 */
export type RiskAlertEvent = BaseEvent<RiskAlertPayload> & {
  domain: 'risk';
  entity: 'alert';
};

/**
 * Portfolio state payload
 */
export interface PortfolioPayload {
  portfolioId: string;
  totalEquity: number;
  availableBalance: number;
  usedMargin: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalPnl: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  drawdown: number;
  drawdownPercent: number;
  peakEquity: number;
  positions: PositionPayload[];
  exposureByExchange: Record<string, number>;
  exposureBySymbol: Record<string, number>;
  timestamp: number;
}

/**
 * Portfolio event
 */
export type PortfolioEvent = BaseEvent<PortfolioPayload> & {
  domain: 'risk';
  entity: 'portfolio';
};

// ==================== BOT MANAGEMENT ====================

/**
 * Bot status
 */
export type BotStatus = 'STARTING' | 'RUNNING' | 'PAUSED' | 'STOPPING' | 'STOPPED' | 'ERROR';

/**
 * Bot state payload
 */
export interface BotStatePayload {
  code: BotCode;
  name: string;
  status: BotStatus;
  enabled: boolean;
  tradingEnabled: boolean;
  paperTrading: boolean;
  symbols: string[];
  exchanges: string[];
  positions: number;
  dailyPnl: number;
  dailyTrades: number;
  errorCount: number;
  lastError?: string;
  startedAt?: number;
  uptime?: number;
  config?: Record<string, unknown>;
  metrics?: {
    winRate?: number;
    profitFactor?: number;
    sharpeRatio?: number;
    avgTradeDuration?: number;
  };
}

/**
 * Bot state event
 */
export type BotStateEvent = BaseEvent<BotStatePayload> & {
  domain: 'system';
  entity: 'bot';
};

// ==================== ANALYTICS ====================

/**
 * Forecast payload (from Vision/FCS bot)
 */
export interface ForecastPayload {
  symbol: string;
  exchange: string;
  direction: SignalDirection;
  confidence: number;
  predictedPrice?: number;
  predictedChange?: number;
  predictedChangePercent?: number;
  timeframe: string;
  validUntil: number;
  indicators: Record<string, number>;
  modelMetrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
  };
  timestamp: number;
}

/**
 * Forecast event
 */
export type ForecastEvent = BaseEvent<ForecastPayload> & {
  domain: 'analytics';
  entity: 'signal';
};

// ==================== NOTIFICATIONS ====================

/**
 * Notification type
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Notification channel
 */
export type NotificationChannel = 'ui' | 'telegram' | 'email' | 'webhook';

/**
 * Notification payload
 */
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  data?: Record<string, unknown>;
  actions?: Array<{
    label: string;
    action: string;
  }>;
}

/**
 * Notification event
 */
export type NotificationEvent = BaseEvent<NotificationPayload> & {
  domain: 'notification';
  entity: 'alert';
};

// ==================== EVENT CONSTRUCTORS ====================

/**
 * Generate unique event ID
 */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate correlation ID for tracking related events
 */
export function generateCorrelationId(): string {
  return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Build topic string from components
 * Format: <domain>.<entity>.<action>
 */
export function buildTopic(domain: EventDomain, entity: EventEntity, action?: EventAction): string {
  return action ? `${domain}.${entity}.${action}` : `${domain}.${entity}`;
}

/**
 * Create a base event
 */
export function createEvent<T>(
  domain: EventDomain,
  entity: EventEntity,
  action: EventAction,
  source: BotCode,
  payload: T,
  options?: {
    priority?: EventPriority;
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }
): BaseEvent<T> {
  return {
    id: generateEventId(),
    topic: buildTopic(domain, entity, action),
    domain,
    entity,
    action,
    timestamp: Date.now(),
    source,
    priority: options?.priority ?? 'normal',
    correlationId: options?.correlationId,
    causationId: options?.causationId,
    metadata: options?.metadata,
    payload,
  };
}

// ==================== EVENT TYPE GUARDS ====================

export function isTradingSignalEvent(event: BaseEvent): event is TradingSignalEvent {
  return event.domain === 'trading' && event.entity === 'signal';
}

export function isOrderEvent(event: BaseEvent): event is OrderEvent {
  return event.domain === 'trading' && event.entity === 'order';
}

export function isPositionEvent(event: BaseEvent): event is PositionEvent {
  return event.domain === 'trading' && event.entity === 'position';
}

export function isOrderbookEvent(event: BaseEvent): event is OrderbookEvent {
  return event.domain === 'market' && event.entity === 'orderbook';
}

export function isTickerEvent(event: BaseEvent): event is TickerEvent {
  return event.domain === 'market' && event.entity === 'ticker';
}

export function isKlineEvent(event: BaseEvent): event is KlineEvent {
  return event.domain === 'market' && event.entity === 'kline';
}

export function isRiskAlertEvent(event: BaseEvent): event is RiskAlertEvent {
  return event.domain === 'risk' && event.entity === 'alert';
}

export function isPortfolioEvent(event: BaseEvent): event is PortfolioEvent {
  return event.domain === 'risk' && event.entity === 'portfolio';
}

export function isBotStateEvent(event: BaseEvent): event is BotStateEvent {
  return event.domain === 'system' && event.entity === 'bot';
}

export function isForecastEvent(event: BaseEvent): event is ForecastEvent {
  return event.domain === 'analytics' && event.entity === 'signal';
}

export function isNotificationEvent(event: BaseEvent): event is NotificationEvent {
  return event.domain === 'notification' && event.entity === 'alert';
}
