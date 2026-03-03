/**
 * Grid Bot Module
 * 
 * Полнофункциональный модуль сеточного торгового бота.
 */

// Core Engine
export { GridBotEngine } from './grid-bot-engine';

// Adapters
export { GridBotExchangeAdapter } from './exchange-adapter';
export { GridBotPaperAdapter } from './paper-adapter';

// Types
export type {
  GridBotConfig,
  GridBotState,
  GridBotStatus,
  GridBotEvent,
  GridBotEventType,
  GridLevel,
  GridOrder,
  GridTrade,
  GridSignal,
  GridBotMetrics,
  GridBotAdapter,
  GridOrderRequest,
  GridOrderResult,
  OrderbookSnapshot,
  BalanceInfo,
  PositionInfo,
  PriceUpdate,
  OrderbookUpdate,
} from './types';

// Additional imports for engine
import { GridBotEngine } from './grid-bot-engine';
import { GridBotExchangeAdapter } from './exchange-adapter';
import { GridBotPaperAdapter } from './paper-adapter';
import type { GridBotConfig, GridBotAdapter } from './types';

// ==================== FACTORY ====================

/**
 * Создать Grid Bot с нужным адаптером
 */
export function createGridBot(
  config: GridBotConfig,
  options: {
    exchange?: string;
    credentials?: { apiKey: string; apiSecret: string };
    testnet?: boolean;
    paperTrading?: boolean;
    initialBalance?: number;
  }
): GridBotEngine {
  let adapter: GridBotAdapter;
  
  if (options.paperTrading || config.accountType === 'DEMO') {
    // Paper trading adapter
    adapter = new GridBotPaperAdapter(
      config.symbol,
      options.initialBalance || 10000,
      config.leverage
    );
  } else {
    // Real exchange adapter
    if (!options.exchange || !options.credentials) {
      throw new Error('Exchange and credentials required for real trading');
    }
    
    adapter = new GridBotExchangeAdapter(
      options.exchange,
      config.symbol,
      options.credentials,
      options.testnet || false
    );
  }
  
  return new GridBotEngine(config, adapter);
}

// ==================== GRID CALCULATORS ====================

/**
 * Рассчитать оптимальное количество уровней сетки
 */
export function calculateOptimalGridLevels(
  price: number,
  volatility: number,
  targetProfitPerGrid: number = 0.5
): number {
  // Higher volatility = more grid levels
  const baseLevels = 10;
  const volatilityAdjustment = Math.ceil(volatility * 100);
  
  return Math.min(100, Math.max(5, baseLevels + volatilityAdjustment));
}

/**
 * Рассчитать оптимальный размер позиции
 */
export function calculateOptimalPositionSize(
  balance: number,
  riskPercent: number,
  leverage: number,
  gridLevels: number
): number {
  const riskAmount = balance * (riskPercent / 100);
  const positionPerLevel = riskAmount / gridLevels;
  
  return positionPerLevel * leverage;
}

/**
 * Рассчитать границы сетки на основе волатильности
 */
export function calculateGridBounds(
  currentPrice: number,
  volatility: number,
  multiplier: number = 2
): { upper: number; lower: number } {
  const range = currentPrice * volatility * multiplier;
  
  return {
    upper: currentPrice + range,
    lower: currentPrice - range,
  };
}
