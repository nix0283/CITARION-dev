/**
 * Unified Exchange Adapter (UEA) - Types
 * 
 * Provides a unified interface for all supported exchanges.
 * Abstracts differences between Binance, Bybit, OKX, Bitget, BingX.
 * 
 * @version 2.0.0
 * @author CITARION Architecture Team
 */

// ==================== EXCHANGE IDENTIFICATION ====================

/**
 * Supported exchanges
 */
export type ExchangeCode = 'BINANCE' | 'BYBIT' | 'OKX' | 'BITGET' | 'BINGX';

/**
 * Exchange metadata
 */
export interface ExchangeMetadata {
  code: ExchangeCode;
  name: string;
  spotEnabled: boolean;
  futuresEnabled: boolean;
  testnetSupported: boolean;
  rateLimits: {
    requestsPerSecond: number;
    ordersPerSecond: number;
    ordersPerDay: number;
  };
  features: {
    trailingStop: boolean;
    oco: boolean;
    conditional: boolean;
    positionMode: 'one_way' | 'hedge' | 'both';
    leverage: { min: number; max: number };
  };
}

/**
 * Exchange configuration
 */
export interface ExchangeConfig {
  code: ExchangeCode;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  testnet?: boolean;
  timeout?: number;
  recvWindow?: number;
}

// ==================== MARKET DATA TYPES ====================

export interface Symbol {
  base: string;
  quote: string;
  symbol: string;
  exchange: ExchangeCode;
  type: 'spot' | 'futures' | 'margin';
  contractSize?: number;
  tickSize: number;
  stepSize: number;
  minNotional?: number;
  status: 'TRADING' | 'HALT' | 'BREAK';
}

export type KlineInterval = 
  | '1s' | '1m' | '3m' | '5m' | '15m' | '30m' 
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' 
  | '1d' | '3d' | '1w' | '1M';

export interface Kline {
  symbol: string;
  exchange: ExchangeCode;
  interval: KlineInterval;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  takerBuyVolume: number;
  takerBuyQuoteVolume: number;
}

export interface OrderbookLevel {
  price: number;
  quantity: number;
}

export interface Orderbook {
  symbol: string;
  exchange: ExchangeCode;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  timestamp: number;
  sequence?: number;
}

export interface Ticker {
  symbol: string;
  exchange: ExchangeCode;
  lastPrice: number;
  bidPrice: number;
  bidQuantity: number;
  askPrice: number;
  askQuantity: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  quoteVolume: number;
  priceChange: number;
  priceChangePercent: number;
  fundingRate?: number;
  nextFundingTime?: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  symbol: string;
  exchange: ExchangeCode;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
  isMaker: boolean;
}

export interface FundingRate {
  symbol: string;
  exchange: ExchangeCode;
  fundingRate: number;
  fundingTime: number;
  markPrice?: number;
  indexPrice?: number;
}

// ==================== TRADING TYPES ====================

export type OrderSide = 'BUY' | 'SELL';

export type OrderType = 
  | 'MARKET' 
  | 'LIMIT' 
  | 'STOP_MARKET' 
  | 'STOP_LIMIT' 
  | 'TAKE_PROFIT_MARKET' 
  | 'TAKE_PROFIT_LIMIT' 
  | 'TRAILING_STOP';

export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTX';

export type OrderStatus = 
  | 'NEW' 
  | 'PARTIALLY_FILLED' 
  | 'FILLED' 
  | 'CANCELLED' 
  | 'REJECTED' 
  | 'EXPIRED';

export type PositionSide = 'LONG' | 'SHORT' | 'BOTH';

export type PositionMode = 'ONE_WAY' | 'HEDGE';

export interface OrderRequest {
  symbol: string;
  exchange: ExchangeCode;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  reduceOnly?: boolean;
  closePosition?: boolean;
  positionSide?: PositionSide;
  activationPrice?: number;
  callbackRate?: number;
  workingType?: 'MARK_PRICE' | 'CONTRACT_PRICE';
  clientOrderId?: string;
}

export interface Order {
  orderId: string;
  clientOrderId?: string;
  symbol: string;
  exchange: ExchangeCode;
  side: OrderSide;
  type: OrderType;
  status: OrderStatus;
  price: number;
  avgPrice: number;
  quantity: number;
  filledQuantity: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  reduceOnly?: boolean;
  positionSide?: PositionSide;
  commission: number;
  commissionAsset: string;
  createdAt: number;
  updatedAt: number;
  trades?: OrderTrade[];
  error?: { code: number; message: string; reason?: string };
}

export interface OrderTrade {
  tradeId: string;
  orderId: string;
  symbol: string;
  exchange: ExchangeCode;
  side: OrderSide;
  price: number;
  quantity: number;
  commission: number;
  commissionAsset: string;
  timestamp: number;
  maker: boolean;
}

export interface Position {
  positionId: string;
  symbol: string;
  exchange: ExchangeCode;
  side: PositionSide;
  entryPrice: number;
  markPrice: number;
  quantity: number;
  notionalValue: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage: number;
  margin: number;
  marginType: 'CROSSED' | 'ISOLATED';
  liquidationPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  openedAt: number;
  updatedAt: number;
}

export interface Balance {
  asset: string;
  exchange: ExchangeCode;
  free: number;
  locked: number;
  total: number;
  usdValue?: number;
}

export interface AccountInfo {
  exchange: ExchangeCode;
  balances: Balance[];
  totalEquity: number;
  availableBalance: number;
  usedMargin: number;
  unrealizedPnl: number;
  marginLevel?: number;
  timestamp: number;
}

// ==================== WEBSOCKET TYPES ====================

export type WSChannel = 
  | 'kline' | 'ticker' | 'orderbook' | 'trade' | 'depth' 
  | 'markPrice' | 'forceOrder' | 'account' | 'order' | 'position';

export interface WSSubscription {
  channel: WSChannel;
  symbol?: string;
  callback: (data: unknown) => void;
}

export type WSState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTING' | 'DISCONNECTED' | 'ERROR';

// ==================== ADAPTER INTERFACE ====================

export interface IExchangeAdapter {
  readonly exchange: ExchangeCode;
  readonly metadata: ExchangeMetadata;
  
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  getExchangeInfo(): Promise<Symbol[]>;
  getTicker(symbol: string): Promise<Ticker>;
  getTickers(symbols?: string[]): Promise<Ticker[]>;
  getKlines(symbol: string, interval: KlineInterval, limit?: number, startTime?: number, endTime?: number): Promise<Kline[]>;
  getOrderbook(symbol: string, limit?: number): Promise<Orderbook>;
  getTrades(symbol: string, limit?: number): Promise<Trade[]>;
  getFundingRate(symbol: string): Promise<FundingRate>;
  getFundingRateHistory(symbol: string, limit?: number, startTime?: number, endTime?: number): Promise<FundingRate[]>;
  
  createOrder(order: OrderRequest): Promise<Order>;
  createOrders(orders: OrderRequest[]): Promise<Order[]>;
  cancelOrder(symbol: string, orderId: string): Promise<Order>;
  cancelOrders(symbol: string, orderIds: string[]): Promise<Order[]>;
  cancelAllOrders(symbol?: string): Promise<void>;
  getOrder(symbol: string, orderId: string): Promise<Order>;
  getOpenOrders(symbol?: string): Promise<Order[]>;
  getOrderHistory(symbol?: string, startTime?: number, endTime?: number, limit?: number): Promise<Order[]>;
  
  getPosition(symbol: string): Promise<Position>;
  getPositions(symbols?: string[]): Promise<Position[]>;
  setLeverage(symbol: string, leverage: number): Promise<void>;
  setMarginType(symbol: string, marginType: 'CROSSED' | 'ISOLATED'): Promise<void>;
  setPositionMode(mode: PositionMode): Promise<void>;
  setStopLoss(symbol: string, stopPrice: number, positionSide?: PositionSide): Promise<void>;
  setTakeProfit(symbol: string, takeProfitPrice: number, positionSide?: PositionSide): Promise<void>;
  
  getAccountInfo(): Promise<AccountInfo>;
  getBalances(): Promise<Balance[]>;
  
  subscribe(subscription: WSSubscription): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  unsubscribeAll(): Promise<void>;
  getWSState(): WSState;
  
  getServerTime(): Promise<number>;
  ping(): Promise<number>;
  formatSymbol(base: string, quote: string): string;
  parseSymbol(symbol: string): { base: string; quote: string };
}

export interface IExchangeAdapterFactory {
  create(config: ExchangeConfig): IExchangeAdapter;
  getSupportedExchanges(): ExchangeCode[];
  getMetadata(code: ExchangeCode): ExchangeMetadata;
}
