/**
 * Unified Exchange Adapter - Base Implementation
 * 
 * @version 2.0.0
 * @author CITARION Architecture Team
 */

import {
  ExchangeCode,
  ExchangeMetadata,
  ExchangeConfig,
  Symbol,
  Ticker,
  Kline,
  KlineInterval,
  Orderbook,
  Trade,
  FundingRate,
  OrderRequest,
  Order,
  Position,
  PositionMode,
  AccountInfo,
  Balance,
  WSSubscription,
  WSState,
  IExchangeAdapter,
} from './types';

// ==================== EXCHANGE METADATA ====================

export const EXCHANGE_METADATA: Record<ExchangeCode, ExchangeMetadata> = {
  BINANCE: {
    code: 'BINANCE',
    name: 'Binance',
    spotEnabled: true,
    futuresEnabled: true,
    testnetSupported: true,
    rateLimits: {
      requestsPerSecond: 50,
      ordersPerSecond: 50,
      ordersPerDay: 200000,
    },
    features: {
      trailingStop: true,
      oco: true,
      conditional: true,
      positionMode: 'both',
      leverage: { min: 1, max: 125 },
    },
  },
  BYBIT: {
    code: 'BYBIT',
    name: 'Bybit',
    spotEnabled: true,
    futuresEnabled: true,
    testnetSupported: true,
    rateLimits: {
      requestsPerSecond: 50,
      ordersPerSecond: 100,
      ordersPerDay: 100000,
    },
    features: {
      trailingStop: true,
      oco: false,
      conditional: true,
      positionMode: 'both',
      leverage: { min: 1, max: 100 },
    },
  },
  OKX: {
    code: 'OKX',
    name: 'OKX',
    spotEnabled: true,
    futuresEnabled: true,
    testnetSupported: true,
    rateLimits: {
      requestsPerSecond: 20,
      ordersPerSecond: 60,
      ordersPerDay: 500000,
    },
    features: {
      trailingStop: true,
      oco: false,
      conditional: true,
      positionMode: 'both',
      leverage: { min: 1, max: 125 },
    },
  },
  BITGET: {
    code: 'BITGET',
    name: 'Bitget',
    spotEnabled: true,
    futuresEnabled: true,
    testnetSupported: true,
    rateLimits: {
      requestsPerSecond: 15,
      ordersPerSecond: 30,
      ordersPerDay: 100000,
    },
    features: {
      trailingStop: true,
      oco: false,
      conditional: true,
      positionMode: 'hedge',
      leverage: { min: 1, max: 100 },
    },
  },
  BINGX: {
    code: 'BINGX',
    name: 'BingX',
    spotEnabled: true,
    futuresEnabled: true,
    testnetSupported: false,
    rateLimits: {
      requestsPerSecond: 10,
      ordersPerSecond: 10,
      ordersPerDay: 50000,
    },
    features: {
      trailingStop: false,
      oco: false,
      conditional: false,
      positionMode: 'one_way',
      leverage: { min: 1, max: 50 },
    },
  },
};

// ==================== BASE ADAPTER ====================

/**
 * Abstract base class for exchange adapters
 */
export abstract class BaseExchangeAdapter implements IExchangeAdapter {
  abstract readonly exchange: ExchangeCode;
  abstract readonly metadata: ExchangeMetadata;
  
  protected config: ExchangeConfig;
  protected connected = false;
  protected wsState: WSState = 'DISCONNECTED';
  protected subscriptions = new Map<string, WSSubscription>();

  constructor(config: ExchangeConfig) {
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  
  isConnected(): boolean {
    return this.connected;
  }

  // Market Data
  abstract getExchangeInfo(): Promise<Symbol[]>;
  abstract getTicker(symbol: string): Promise<Ticker>;
  abstract getTickers(symbols?: string[]): Promise<Ticker[]>;
  abstract getKlines(symbol: string, interval: KlineInterval, limit?: number, startTime?: number, endTime?: number): Promise<Kline[]>;
  abstract getOrderbook(symbol: string, limit?: number): Promise<Orderbook>;
  abstract getTrades(symbol: string, limit?: number): Promise<Trade[]>;
  abstract getFundingRate(symbol: string): Promise<FundingRate>;
  abstract getFundingRateHistory(symbol: string, limit?: number, startTime?: number, endTime?: number): Promise<FundingRate[]>;

  // Trading
  abstract createOrder(order: OrderRequest): Promise<Order>;
  abstract createOrders(orders: OrderRequest[]): Promise<Order[]>;
  abstract cancelOrder(symbol: string, orderId: string): Promise<Order>;
  abstract cancelOrders(symbol: string, orderIds: string[]): Promise<Order[]>;
  abstract cancelAllOrders(symbol?: string): Promise<void>;
  abstract getOrder(symbol: string, orderId: string): Promise<Order>;
  abstract getOpenOrders(symbol?: string): Promise<Order[]>;
  abstract getOrderHistory(symbol?: string, startTime?: number, endTime?: number, limit?: number): Promise<Order[]>;

  // Position
  abstract getPosition(symbol: string): Promise<Position>;
  abstract getPositions(symbols?: string[]): Promise<Position[]>;
  abstract setLeverage(symbol: string, leverage: number): Promise<void>;
  abstract setMarginType(symbol: string, marginType: 'CROSSED' | 'ISOLATED'): Promise<void>;
  abstract setPositionMode(mode: PositionMode): Promise<void>;
  abstract setStopLoss(symbol: string, stopPrice: number, positionSide?: 'LONG' | 'SHORT'): Promise<void>;
  abstract setTakeProfit(symbol: string, takeProfitPrice: number, positionSide?: 'LONG' | 'SHORT'): Promise<void>;

  // Account
  abstract getAccountInfo(): Promise<AccountInfo>;
  abstract getBalances(): Promise<Balance[]>;

  // WebSocket
  abstract subscribe(subscription: WSSubscription): Promise<string>;
  abstract unsubscribe(subscriptionId: string): Promise<void>;
  abstract unsubscribeAll(): Promise<void>;

  getWSState(): WSState {
    return this.wsState;
  }

  // Utility
  abstract getServerTime(): Promise<number>;
  abstract ping(): Promise<number>;
  abstract formatSymbol(base: string, quote: string): string;
  abstract parseSymbol(symbol: string): { base: string; quote: string };

  // Helper methods
  protected generateClientId(): string {
    return `${this.exchange.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  protected handleError(error: unknown): never {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}

// ==================== ADAPTER FACTORY ====================

/**
 * Exchange Adapter Factory
 * Creates adapters for all supported exchanges
 */
export class ExchangeAdapterFactory implements IExchangeAdapterFactory {
  private adapters = new Map<ExchangeCode, IExchangeAdapter>();
  private configs = new Map<ExchangeCode, ExchangeConfig>();

  /**
   * Register exchange configuration
   */
  registerConfig(config: ExchangeConfig): void {
    this.configs.set(config.code, config);
  }

  /**
   * Create or get existing adapter
   */
  create(config: ExchangeConfig): IExchangeAdapter {
    const existing = this.adapters.get(config.code);
    if (existing) {
      return existing;
    }

    const adapter = this.createAdapter(config);
    this.adapters.set(config.code, adapter);
    return adapter;
  }

  /**
   * Get existing adapter or throw
   */
  get(code: ExchangeCode): IExchangeAdapter {
    const adapter = this.adapters.get(code);
    if (!adapter) {
      throw new Error(`Exchange adapter not initialized: ${code}`);
    }
    return adapter;
  }

  /**
   * Get all initialized adapters
   */
  getAll(): IExchangeAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Create adapter based on exchange code
   */
  private createAdapter(config: ExchangeConfig): IExchangeAdapter {
    switch (config.code) {
      case 'BINANCE':
        return new BinanceAdapter(config);
      case 'BYBIT':
        return new BybitAdapter(config);
      case 'OKX':
        return new OKXAdapter(config);
      case 'BITGET':
        return new BitgetAdapter(config);
      case 'BINGX':
        return new BingXAdapter(config);
      default:
        throw new Error(`Unsupported exchange: ${config.code}`);
    }
  }

  getSupportedExchanges(): ExchangeCode[] {
    return Object.keys(EXCHANGE_METADATA) as ExchangeCode[];
  }

  getMetadata(code: ExchangeCode): ExchangeMetadata {
    return EXCHANGE_METADATA[code];
  }
}

// ==================== PLACEHOLDER ADAPTERS ====================

class BinanceAdapter extends BaseExchangeAdapter {
  exchange: ExchangeCode = 'BINANCE';
  metadata: ExchangeMetadata = EXCHANGE_METADATA.BINANCE;

  async connect(): Promise<void> {
    this.connected = true;
    console.log('[Binance] Connected');
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('[Binance] Disconnected');
  }

  formatSymbol(base: string, quote: string): string {
    return `${base}${quote}`;
  }

  parseSymbol(symbol: string): { base: string; quote: string } {
    const match = symbol.match(/([A-Z]+)(USDT|BUSD|USDC|BTC|ETH)/);
    if (match) {
      return { base: match[1], quote: match[2] };
    }
    return { base: symbol, quote: 'USDT' };
  }

  async getServerTime(): Promise<number> {
    return Date.now();
  }

  async ping(): Promise<number> {
    return Date.now();
  }

  // TODO: Implement all methods
  async getExchangeInfo(): Promise<Symbol[]> { return []; }
  async getTicker(_symbol: string): Promise<Ticker> { throw new Error('Not implemented'); }
  async getTickers(_symbols?: string[]): Promise<Ticker[]> { return []; }
  async getKlines(_symbol: string, _interval: KlineInterval, _limit?: number, _startTime?: number, _endTime?: number): Promise<Kline[]> { return []; }
  async getOrderbook(_symbol: string, _limit?: number): Promise<Orderbook> { throw new Error('Not implemented'); }
  async getTrades(_symbol: string, _limit?: number): Promise<Trade[]> { return []; }
  async getFundingRate(_symbol: string): Promise<FundingRate> { throw new Error('Not implemented'); }
  async getFundingRateHistory(_symbol: string, _limit?: number, _startTime?: number, _endTime?: number): Promise<FundingRate[]> { return []; }
  async createOrder(_order: OrderRequest): Promise<Order> { throw new Error('Not implemented'); }
  async createOrders(_orders: OrderRequest[]): Promise<Order[]> { return []; }
  async cancelOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async cancelOrders(_symbol: string, _orderIds: string[]): Promise<Order[]> { return []; }
  async cancelAllOrders(_symbol?: string): Promise<void> {}
  async getOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async getOpenOrders(_symbol?: string): Promise<Order[]> { return []; }
  async getOrderHistory(_symbol?: string, _startTime?: number, _endTime?: number, _limit?: number): Promise<Order[]> { return []; }
  async getPosition(_symbol: string): Promise<Position> { throw new Error('Not implemented'); }
  async getPositions(_symbols?: string[]): Promise<Position[]> { return []; }
  async setLeverage(_symbol: string, _leverage: number): Promise<void> {}
  async setMarginType(_symbol: string, _marginType: 'CROSSED' | 'ISOLATED'): Promise<void> {}
  async setPositionMode(_mode: PositionMode): Promise<void> {}
  async setStopLoss(_symbol: string, _stopPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async setTakeProfit(_symbol: string, _takeProfitPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async getAccountInfo(): Promise<AccountInfo> { throw new Error('Not implemented'); }
  async getBalances(): Promise<Balance[]> { return []; }
  async subscribe(_subscription: WSSubscription): Promise<string> { return ''; }
  async unsubscribe(_subscriptionId: string): Promise<void> {}
  async unsubscribeAll(): Promise<void> {}
}

class BybitAdapter extends BaseExchangeAdapter {
  exchange: ExchangeCode = 'BYBIT';
  metadata: ExchangeMetadata = EXCHANGE_METADATA.BYBIT;

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }
  formatSymbol(base: string, quote: string): string { return `${base}${quote}`; }
  parseSymbol(symbol: string): { base: string; quote: string } { return { base: symbol, quote: 'USDT' }; }
  async getServerTime(): Promise<number> { return Date.now(); }
  async ping(): Promise<number> { return Date.now(); }
  async getExchangeInfo(): Promise<Symbol[]> { return []; }
  async getTicker(_symbol: string): Promise<Ticker> { throw new Error('Not implemented'); }
  async getTickers(_symbols?: string[]): Promise<Ticker[]> { return []; }
  async getKlines(_symbol: string, _interval: KlineInterval, _limit?: number, _startTime?: number, _endTime?: number): Promise<Kline[]> { return []; }
  async getOrderbook(_symbol: string, _limit?: number): Promise<Orderbook> { throw new Error('Not implemented'); }
  async getTrades(_symbol: string, _limit?: number): Promise<Trade[]> { return []; }
  async getFundingRate(_symbol: string): Promise<FundingRate> { throw new Error('Not implemented'); }
  async getFundingRateHistory(_symbol: string, _limit?: number, _startTime?: number, _endTime?: number): Promise<FundingRate[]> { return []; }
  async createOrder(_order: OrderRequest): Promise<Order> { throw new Error('Not implemented'); }
  async createOrders(_orders: OrderRequest[]): Promise<Order[]> { return []; }
  async cancelOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async cancelOrders(_symbol: string, _orderIds: string[]): Promise<Order[]> { return []; }
  async cancelAllOrders(_symbol?: string): Promise<void> {}
  async getOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async getOpenOrders(_symbol?: string): Promise<Order[]> { return []; }
  async getOrderHistory(_symbol?: string, _startTime?: number, _endTime?: number, _limit?: number): Promise<Order[]> { return []; }
  async getPosition(_symbol: string): Promise<Position> { throw new Error('Not implemented'); }
  async getPositions(_symbols?: string[]): Promise<Position[]> { return []; }
  async setLeverage(_symbol: string, _leverage: number): Promise<void> {}
  async setMarginType(_symbol: string, _marginType: 'CROSSED' | 'ISOLATED'): Promise<void> {}
  async setPositionMode(_mode: PositionMode): Promise<void> {}
  async setStopLoss(_symbol: string, _stopPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async setTakeProfit(_symbol: string, _takeProfitPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async getAccountInfo(): Promise<AccountInfo> { throw new Error('Not implemented'); }
  async getBalances(): Promise<Balance[]> { return []; }
  async subscribe(_subscription: WSSubscription): Promise<string> { return ''; }
  async unsubscribe(_subscriptionId: string): Promise<void> {}
  async unsubscribeAll(): Promise<void> {}
}

class OKXAdapter extends BaseExchangeAdapter {
  exchange: ExchangeCode = 'OKX';
  metadata: ExchangeMetadata = EXCHANGE_METADATA.OKX;

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }
  formatSymbol(base: string, quote: string): string { return `${base}-${quote}`; }
  parseSymbol(symbol: string): { base: string; quote: string } { 
    const [base, quote] = symbol.split('-');
    return { base: base || symbol, quote: quote || 'USDT' };
  }
  async getServerTime(): Promise<number> { return Date.now(); }
  async ping(): Promise<number> { return Date.now(); }
  async getExchangeInfo(): Promise<Symbol[]> { return []; }
  async getTicker(_symbol: string): Promise<Ticker> { throw new Error('Not implemented'); }
  async getTickers(_symbols?: string[]): Promise<Ticker[]> { return []; }
  async getKlines(_symbol: string, _interval: KlineInterval, _limit?: number, _startTime?: number, _endTime?: number): Promise<Kline[]> { return []; }
  async getOrderbook(_symbol: string, _limit?: number): Promise<Orderbook> { throw new Error('Not implemented'); }
  async getTrades(_symbol: string, _limit?: number): Promise<Trade[]> { return []; }
  async getFundingRate(_symbol: string): Promise<FundingRate> { throw new Error('Not implemented'); }
  async getFundingRateHistory(_symbol: string, _limit?: number, _startTime?: number, _endTime?: number): Promise<FundingRate[]> { return []; }
  async createOrder(_order: OrderRequest): Promise<Order> { throw new Error('Not implemented'); }
  async createOrders(_orders: OrderRequest[]): Promise<Order[]> { return []; }
  async cancelOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async cancelOrders(_symbol: string, _orderIds: string[]): Promise<Order[]> { return []; }
  async cancelAllOrders(_symbol?: string): Promise<void> {}
  async getOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async getOpenOrders(_symbol?: string): Promise<Order[]> { return []; }
  async getOrderHistory(_symbol?: string, _startTime?: number, _endTime?: number, _limit?: number): Promise<Order[]> { return []; }
  async getPosition(_symbol: string): Promise<Position> { throw new Error('Not implemented'); }
  async getPositions(_symbols?: string[]): Promise<Position[]> { return []; }
  async setLeverage(_symbol: string, _leverage: number): Promise<void> {}
  async setMarginType(_symbol: string, _marginType: 'CROSSED' | 'ISOLATED'): Promise<void> {}
  async setPositionMode(_mode: PositionMode): Promise<void> {}
  async setStopLoss(_symbol: string, _stopPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async setTakeProfit(_symbol: string, _takeProfitPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async getAccountInfo(): Promise<AccountInfo> { throw new Error('Not implemented'); }
  async getBalances(): Promise<Balance[]> { return []; }
  async subscribe(_subscription: WSSubscription): Promise<string> { return ''; }
  async unsubscribe(_subscriptionId: string): Promise<void> {}
  async unsubscribeAll(): Promise<void> {}
}

class BitgetAdapter extends BaseExchangeAdapter {
  exchange: ExchangeCode = 'BITGET';
  metadata: ExchangeMetadata = EXCHANGE_METADATA.BITGET;

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }
  formatSymbol(base: string, quote: string): string { return `${base}${quote}`; }
  parseSymbol(symbol: string): { base: string; quote: string } { return { base: symbol, quote: 'USDT' }; }
  async getServerTime(): Promise<number> { return Date.now(); }
  async ping(): Promise<number> { return Date.now(); }
  async getExchangeInfo(): Promise<Symbol[]> { return []; }
  async getTicker(_symbol: string): Promise<Ticker> { throw new Error('Not implemented'); }
  async getTickers(_symbols?: string[]): Promise<Ticker[]> { return []; }
  async getKlines(_symbol: string, _interval: KlineInterval, _limit?: number, _startTime?: number, _endTime?: number): Promise<Kline[]> { return []; }
  async getOrderbook(_symbol: string, _limit?: number): Promise<Orderbook> { throw new Error('Not implemented'); }
  async getTrades(_symbol: string, _limit?: number): Promise<Trade[]> { return []; }
  async getFundingRate(_symbol: string): Promise<FundingRate> { throw new Error('Not implemented'); }
  async getFundingRateHistory(_symbol: string, _limit?: number, _startTime?: number, _endTime?: number): Promise<FundingRate[]> { return []; }
  async createOrder(_order: OrderRequest): Promise<Order> { throw new Error('Not implemented'); }
  async createOrders(_orders: OrderRequest[]): Promise<Order[]> { return []; }
  async cancelOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async cancelOrders(_symbol: string, _orderIds: string[]): Promise<Order[]> { return []; }
  async cancelAllOrders(_symbol?: string): Promise<void> {}
  async getOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async getOpenOrders(_symbol?: string): Promise<Order[]> { return []; }
  async getOrderHistory(_symbol?: string, _startTime?: number, _endTime?: number, _limit?: number): Promise<Order[]> { return []; }
  async getPosition(_symbol: string): Promise<Position> { throw new Error('Not implemented'); }
  async getPositions(_symbols?: string[]): Promise<Position[]> { return []; }
  async setLeverage(_symbol: string, _leverage: number): Promise<void> {}
  async setMarginType(_symbol: string, _marginType: 'CROSSED' | 'ISOLATED'): Promise<void> {}
  async setPositionMode(_mode: PositionMode): Promise<void> {}
  async setStopLoss(_symbol: string, _stopPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async setTakeProfit(_symbol: string, _takeProfitPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async getAccountInfo(): Promise<AccountInfo> { throw new Error('Not implemented'); }
  async getBalances(): Promise<Balance[]> { return []; }
  async subscribe(_subscription: WSSubscription): Promise<string> { return ''; }
  async unsubscribe(_subscriptionId: string): Promise<void> {}
  async unsubscribeAll(): Promise<void> {}
}

class BingXAdapter extends BaseExchangeAdapter {
  exchange: ExchangeCode = 'BINGX';
  metadata: ExchangeMetadata = EXCHANGE_METADATA.BINGX;

  async connect(): Promise<void> { this.connected = true; }
  async disconnect(): Promise<void> { this.connected = false; }
  formatSymbol(base: string, quote: string): string { return `${base}-${quote}`; }
  parseSymbol(symbol: string): { base: string; quote: string } { 
    const [base, quote] = symbol.split('-');
    return { base: base || symbol, quote: quote || 'USDT' };
  }
  async getServerTime(): Promise<number> { return Date.now(); }
  async ping(): Promise<number> { return Date.now(); }
  async getExchangeInfo(): Promise<Symbol[]> { return []; }
  async getTicker(_symbol: string): Promise<Ticker> { throw new Error('Not implemented'); }
  async getTickers(_symbols?: string[]): Promise<Ticker[]> { return []; }
  async getKlines(_symbol: string, _interval: KlineInterval, _limit?: number, _startTime?: number, _endTime?: number): Promise<Kline[]> { return []; }
  async getOrderbook(_symbol: string, _limit?: number): Promise<Orderbook> { throw new Error('Not implemented'); }
  async getTrades(_symbol: string, _limit?: number): Promise<Trade[]> { return []; }
  async getFundingRate(_symbol: string): Promise<FundingRate> { throw new Error('Not implemented'); }
  async getFundingRateHistory(_symbol: string, _limit?: number, _startTime?: number, _endTime?: number): Promise<FundingRate[]> { return []; }
  async createOrder(_order: OrderRequest): Promise<Order> { throw new Error('Not implemented'); }
  async createOrders(_orders: OrderRequest[]): Promise<Order[]> { return []; }
  async cancelOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async cancelOrders(_symbol: string, _orderIds: string[]): Promise<Order[]> { return []; }
  async cancelAllOrders(_symbol?: string): Promise<void> {}
  async getOrder(_symbol: string, _orderId: string): Promise<Order> { throw new Error('Not implemented'); }
  async getOpenOrders(_symbol?: string): Promise<Order[]> { return []; }
  async getOrderHistory(_symbol?: string, _startTime?: number, _endTime?: number, _limit?: number): Promise<Order[]> { return []; }
  async getPosition(_symbol: string): Promise<Position> { throw new Error('Not implemented'); }
  async getPositions(_symbols?: string[]): Promise<Position[]> { return []; }
  async setLeverage(_symbol: string, _leverage: number): Promise<void> {}
  async setMarginType(_symbol: string, _marginType: 'CROSSED' | 'ISOLATED'): Promise<void> {}
  async setPositionMode(_mode: PositionMode): Promise<void> {}
  async setStopLoss(_symbol: string, _stopPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async setTakeProfit(_symbol: string, _takeProfitPrice: number, _positionSide?: 'LONG' | 'SHORT'): Promise<void> {}
  async getAccountInfo(): Promise<AccountInfo> { throw new Error('Not implemented'); }
  async getBalances(): Promise<Balance[]> { return []; }
  async subscribe(_subscription: WSSubscription): Promise<string> { return ''; }
  async unsubscribe(_subscriptionId: string): Promise<void> {}
  async unsubscribeAll(): Promise<void> {}
}

// Singleton factory instance
export const exchangeFactory = new ExchangeAdapterFactory();
