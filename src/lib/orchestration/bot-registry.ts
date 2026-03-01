/**
 * Bot Registry - Central registry for all CITARION bots
 * 
 * @version 2.0.0
 * @author CITARION Architecture Team
 */

import {
  BotCode,
  BotCategory,
  BotMetadata,
} from './types';

// ==================== BOT DEFINITIONS ====================

/**
 * Complete bot registry with metadata
 */
export const BOT_REGISTRY: Record<BotCode, BotMetadata> = {
  // Operational Bots
  GRD: {
    code: 'GRD',
    name: 'MESH',
    category: 'operational',
    description: 'Grid Trading - автоматическая торговля в ценовом канале',
    version: '2.0.0',
    enabled: true,
  },
  DCA: {
    code: 'DCA',
    name: 'SCALE',
    category: 'operational',
    description: 'Dollar Cost Averaging - усреднение позиции',
    version: '2.0.0',
    enabled: true,
  },
  BBB: {
    code: 'BBB',
    name: 'BAND',
    category: 'operational',
    description: 'Bollinger Bands - торговля по полосам Боллинджера',
    version: '2.0.0',
    enabled: true,
  },
  RNG: {
    code: 'RNG',
    name: 'EDGE',
    category: 'operational',
    description: 'Range Trading - торговля в боковом движении',
    version: '2.0.0',
    enabled: true,
  },
  PND: {
    code: 'PND',
    name: 'Argus',
    category: 'operational',
    description: 'Pump & Dump Detection - обнаружение пампов',
    version: '2.0.0',
    enabled: true,
  },
  FCS: {
    code: 'FCS',
    name: 'Vision',
    category: 'operational',
    description: 'Forecasting - предсказание цен',
    version: '2.0.0',
    enabled: true,
  },
  // Institutional Bots
  ARB: {
    code: 'ARB',
    name: 'Orion',
    category: 'institutional',
    description: 'Cross-Exchange Arbitrage - арбитраж между биржами',
    version: '2.0.0',
    enabled: true,
  },
  PAR: {
    code: 'PAR',
    name: 'Spectrum',
    category: 'institutional',
    description: 'Pairs Trading - парный трейдинг',
    version: '2.0.0',
    enabled: true,
  },
  STA: {
    code: 'STA',
    name: 'Reed',
    category: 'institutional',
    description: 'Statistical Trading - статистические стратегии',
    version: '2.0.0',
    enabled: true,
  },
  MMK: {
    code: 'MMK',
    name: 'Architect',
    category: 'institutional',
    description: 'Market Making - маркет-мейкинг',
    version: '2.0.0',
    enabled: true,
  },
  MRB: {
    code: 'MRB',
    name: 'Equilibrist',
    category: 'institutional',
    description: 'Mean Reversion Basket - возврат к среднему',
    version: '2.0.0',
    enabled: true,
  },
  TRF: {
    code: 'TRF',
    name: 'Kron',
    category: 'institutional',
    description: 'Transfer/Rebalancing - ребалансировка',
    version: '2.0.0',
    enabled: true,
  },
  // Frequency Bots
  HFT: {
    code: 'HFT',
    name: 'Helios',
    category: 'frequency',
    description: 'High Frequency Trading - высокочастотная торговля',
    version: '2.0.0',
    enabled: true,
  },
  MFT: {
    code: 'MFT',
    name: 'Selene',
    category: 'frequency',
    description: 'Medium Frequency Trading - среднечастотная торговля',
    version: '2.0.0',
    enabled: true,
  },
  LFT: {
    code: 'LFT',
    name: 'Atlas',
    category: 'frequency',
    description: 'Low Frequency Trading - низкочастотная торговля',
    version: '2.0.0',
    enabled: true,
  },
  // Integration & Analytics
  ORA: {
    code: 'ORA',
    name: 'Oracle',
    category: 'integration',
    description: 'Chat Bot - AI-ассистент',
    version: '2.0.0',
    enabled: true,
  },
  LUM: {
    code: 'LUM',
    name: 'Lumi',
    category: 'integration',
    description: 'Data Integration - интеграция данных',
    version: '2.0.0',
    enabled: true,
  },
  WLF: {
    code: 'WLF',
    name: 'Wolf',
    category: 'integration',
    description: 'Alert System - система алертов',
    version: '2.0.0',
    enabled: true,
  },
  LOG: {
    code: 'LOG',
    name: 'LOGOS',
    category: 'analytics',
    description: 'Analyst & Autonomous Trader - мета-аналитик',
    version: '2.0.0',
    enabled: true,
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Get all bots by category
 */
export function getBotsByCategory(category: BotCategory): BotMetadata[] {
  return Object.values(BOT_REGISTRY).filter(bot => bot.category === category);
}

/**
 * Get all enabled bots
 */
export function getEnabledBots(): BotMetadata[] {
  return Object.values(BOT_REGISTRY).filter(bot => bot.enabled);
}

/**
 * Get bot metadata by code
 */
export function getBotByCode(code: BotCode): BotMetadata | undefined {
  return BOT_REGISTRY[code];
}

/**
 * Get bot name by code
 */
export function getBotName(code: BotCode): string {
  return BOT_REGISTRY[code]?.name ?? code;
}

/**
 * Get all bot codes
 */
export function getAllBotCodes(): BotCode[] {
  return Object.keys(BOT_REGISTRY) as BotCode[];
}

/**
 * Get operational bot codes
 */
export function getOperationalBotCodes(): BotCode[] {
  return ['GRD', 'DCA', 'BBB', 'RNG', 'PND', 'FCS'];
}

/**
 * Get institutional bot codes
 */
export function getInstitutionalBotCodes(): BotCode[] {
  return ['ARB', 'PAR', 'STA', 'MMK', 'MRB', 'TRF'];
}

/**
 * Get frequency bot codes
 */
export function getFrequencyBotCodes(): BotCode[] {
  return ['HFT', 'MFT', 'LFT'];
}

/**
 * Get integration bot codes
 */
export function getIntegrationBotCodes(): BotCode[] {
  return ['ORA', 'LUM', 'WLF'];
}

/**
 * Get analytics bot codes
 */
export function getAnalyticsBotCodes(): BotCode[] {
  return ['LOG'];
}
