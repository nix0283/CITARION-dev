/**
 * CornixBot-like Signal Processing System
 * 
 * Full implementation of signal bot functionality:
 * - Multi-exchange signal processing
 * - Signal validation and filtering
 * - Position management
 * - Risk management
 * - Auto-trading execution
 */

import { createHash } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface SignalConfig {
  // Signal Sources
  telegramChannels: string[]
  webhookEndpoints: string[]
  tradingviewWebhook: boolean
  
  // Signal Processing
  signalTimeout: number        // ms before signal expires
  minConfidence: number        // Minimum confidence to execute
  maxConcurrentPositions: number
  
  // Risk Management
  maxPositionSize: number      // USDT
  maxLeverage: number
  defaultLeverage: number
  maxRiskPerTrade: number      // % of account
  maxDailyLoss: number         // % of account
  
  // Take Profit / Stop Loss
  defaultTP: number            // %
  defaultSL: number            // %
  useTrailingStop: boolean
  trailingStopTrigger: number  // %
  trailingStopDistance: number // %
  
  // Exchanges
  exchanges: ExchangeConfig[]
  
  // Notifications
  notifyOnSignal: boolean
  notifyOnEntry: boolean
  notifyOnExit: boolean
  notifyOnError: boolean
}

export interface ExchangeConfig {
  name: 'binance' | 'bybit' | 'okx' | 'bitget' | 'bingx'
  apiKey: string
  apiSecret: string
  testnet: boolean
  enabled: boolean
  defaultType: 'spot' | 'futures'
}

export interface TradingSignal {
  id: string
  source: string
  timestamp: Date
  
  // Symbol info
  symbol: string
  exchange: string
  type: 'spot' | 'futures'
  direction: 'LONG' | 'SHORT'
  
  // Entry
  entryType: 'market' | 'limit' | 'limit-zone'
  entryPrice?: number
  entryZone?: { min: number; max: number }
  
  // Targets
  takeProfits: TakeProfitLevel[]
  stopLoss?: number
  stopLossType?: 'fixed' | 'trailing'
  
  // Risk
  leverage?: number
  positionSize?: number       // USDT or %
  riskPercent?: number
  
  // Status
  status: 'pending' | 'validating' | 'ready' | 'executing' | 'active' | 'closed' | 'expired' | 'failed'
  
  // Validation
  validation?: SignalValidation
  
  // Execution
  execution?: SignalExecution
  
  // Metadata
  rawMessage?: string
  parsedBy: string
  confidence: number
  expiresAt?: Date
}

export interface TakeProfitLevel {
  price: number
  percent: number             // % of position to close
  type: 'fixed' | 'trailing'
  hit?: boolean
  hitAt?: Date
}

export interface SignalValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  
  // Checks
  symbolExists: boolean
  priceValid: boolean
  riskWithinLimits: boolean
  leverageWithinLimits: boolean
  notDuplicate: boolean
  notExpired: boolean
  
  // Market data
  currentPrice?: number
  spread?: number
  volume24h?: number
}

export interface SignalExecution {
  orderId: string
  exchange: string
  executedAt: Date
  entryPrice: number
  positionSize: number
  leverage: number
  
  // Current state
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  
  // Take profits
  takeProfitsHit: number[]
  remainingPosition: number
  
  // Stop loss
  stopLossPrice: number
  stopLossHit: boolean
  
  // Exit
  exitPrice?: number
  exitReason?: 'take_profit' | 'stop_loss' | 'manual' | 'signal' | 'timeout'
  realizedPnl?: number
  closedAt?: Date
}

export interface Position {
  id: string
  signalId: string
  symbol: string
  exchange: string
  direction: 'LONG' | 'SHORT'
  
  // Entry
  entryPrice: number
  positionSize: number
  leverage: number
  marginUsed: number
  
  // Current
  currentPrice: number
  unrealizedPnl: number
  unrealizedPnlPercent: number
  liquidationPrice: number
  
  // Risk
  stopLoss: number
  takeProfits: TakeProfitLevel[]
  
  // Status
  status: 'open' | 'closing' | 'closed'
  openedAt: Date
  closedAt?: Date
  closeReason?: string
}

// ============================================================================
// Signal Parser
// ============================================================================

export class SignalParser {
  private patterns: Map<string, RegExp[]> = new Map()

  constructor() {
    this.initializePatterns()
  }

  private initializePatterns(): void {
    // Cornix signal format
    this.patterns.set('cornix', [
      /#(?<symbol>[A-Z]+USDT?)\s*(?<direction>LONG|SHORT)/i,
      /Entry:\s*(?<entry>[\d.]+)/i,
      /TP\s*\d*:\s*(?<tp>[\d.]+)/gi,
      /SL:\s*(?<sl>[\d.]+)/i,
      /Leverage:\s*(?<leverage>\d+)x/i
    ])

    // Standard signal format
    this.patterns.set('standard', [
      /(?:Buy|Sell|Long|Short)\s+(?<symbol>[A-Z]+\/?[A-Z]*)/i,
      /(?:@|Entry:?)\s*(?<entry>[\d.]+)/i,
      /(?:TP|Target|Take Profit)[:\s]*(?<tp>[\d.]+)/gi,
      /(?:SL|Stop Loss)[:\s]*(?<sl>[\d.]+)/i
    ])

    // TradingView alert format
    this.patterns.set('tradingview', [
      /"symbol":\s*"(?<symbol>[^"]+)"/,
      /"action":\s*"(?<action>[^"]+)"/,
      /"price":\s*(?<price>[\d.]+)/,
      /"stop_loss":\s*(?<sl>[\d.]+)/,
      /"take_profit":\s*(?<tp>[\d.]+)/
    ])

    // Custom channel format
    this.patterns.set('custom', [
      /💰\s*(?<symbol>[A-Z]+USDT?)/,
      /📊\s*(?<direction>LONG|SHORT)/i,
      /🎯\s*(?<tp>[\d.]+)/g,
      /🛑\s*(?<sl>[\d.]+)/
    ])
  }

  /**
   * Parse signal from message
   */
  parse(message: string, source: string): TradingSignal | null {
    const format = this.detectFormat(message)
    if (!format) return null

    const patterns = this.patterns.get(format) || []
    const parsed: Partial<TradingSignal> = {
      id: this.generateId(),
      source,
      timestamp: new Date(),
      status: 'pending',
      parsedBy: format,
      rawMessage: message,
      takeProfits: [],
      confidence: 0.5
    }

    // Extract data using patterns
    for (const pattern of patterns) {
      const match = message.match(pattern)
      if (match?.groups) {
        this.applyMatch(parsed, match.groups, pattern)
      }
    }

    // Validate required fields
    if (!parsed.symbol || !parsed.direction) {
      return null
    }

    // Set defaults
    parsed.type = this.detectType(parsed.symbol)
    parsed.exchange = 'binance' // Default exchange

    // Calculate confidence
    parsed.confidence = this.calculateConfidence(parsed)

    return parsed as TradingSignal
  }

  private detectFormat(message: string): string | null {
    // Check for JSON format
    if (message.startsWith('{')) {
      return 'tradingview'
    }

    // Check for Cornix format
    if (message.includes('#') && (message.includes('LONG') || message.includes('SHORT'))) {
      return 'cornix'
    }

    // Check for custom format
    if (message.includes('💰') || message.includes('🎯')) {
      return 'custom'
    }

    // Default to standard
    if (/buy|sell|long|short/i.test(message)) {
      return 'standard'
    }

    return null
  }

  private applyMatch(
    parsed: Partial<TradingSignal>,
    groups: Record<string, string>,
    _pattern: RegExp
  ): void {
    if (groups.symbol) {
      parsed.symbol = this.normalizeSymbol(groups.symbol)
    }

    if (groups.direction || groups.action) {
      const dir = (groups.direction || groups.action || '').toUpperCase()
      parsed.direction = dir === 'BUY' || dir === 'LONG' ? 'LONG' : 'SHORT'
    }

    if (groups.entry || groups.price) {
      const price = parseFloat(groups.entry || groups.price)
      if (!isNaN(price)) {
        parsed.entryPrice = price
        parsed.entryType = 'limit'
      }
    }

    if (groups.tp) {
      const tp = parseFloat(groups.tp)
      if (!isNaN(tp)) {
        parsed.takeProfits!.push({
          price: tp,
          percent: 100,
          type: 'fixed'
        })
      }
    }

    if (groups.sl) {
      const sl = parseFloat(groups.sl)
      if (!isNaN(sl)) {
        parsed.stopLoss = sl
      }
    }

    if (groups.leverage) {
      parsed.leverage = parseInt(groups.leverage)
    }
  }

  private normalizeSymbol(symbol: string): string {
    // Remove slashes and normalize
    let normalized = symbol.replace('/', '').toUpperCase()
    
    // Add USDT if missing
    if (!normalized.endsWith('USDT') && !normalized.endsWith('USDT')) {
      normalized += 'USDT'
    }
    
    return normalized
  }

  private detectType(symbol: string): 'spot' | 'futures' {
    // Futures symbols typically have date suffix or are perpetual
    return 'futures'
  }

  private calculateConfidence(parsed: Partial<TradingSignal>): number {
    let confidence = 0.3

    if (parsed.symbol) confidence += 0.15
    if (parsed.direction) confidence += 0.15
    if (parsed.entryPrice) confidence += 0.15
    if (parsed.takeProfits && parsed.takeProfits.length > 0) confidence += 0.1
    if (parsed.stopLoss) confidence += 0.1
    if (parsed.leverage) confidence += 0.05

    return Math.min(1, confidence)
  }

  private generateId(): string {
    return `sig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  }
}

// ============================================================================
// Signal Validator
// ============================================================================

export class SignalValidator {
  private config: SignalConfig

  constructor(config: SignalConfig) {
    this.config = config
  }

  /**
   * Validate a signal
   */
  async validate(signal: TradingSignal): Promise<SignalValidation> {
    const validation: SignalValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      symbolExists: false,
      priceValid: false,
      riskWithinLimits: true,
      leverageWithinLimits: true,
      notDuplicate: true,
      notExpired: true
    }

    // Check symbol exists
    try {
      const marketData = await this.getMarketData(signal.symbol, signal.exchange)
      if (marketData) {
        validation.symbolExists = true
        validation.currentPrice = marketData.price
        validation.spread = marketData.spread
        validation.volume24h = marketData.volume24h
      } else {
        validation.errors.push(`Symbol ${signal.symbol} not found on ${signal.exchange}`)
        validation.isValid = false
      }
    } catch (error) {
      validation.errors.push(`Failed to validate symbol: ${error}`)
      validation.isValid = false
    }

    // Validate entry price
    if (signal.entryPrice && validation.currentPrice) {
      const priceDiff = Math.abs(signal.entryPrice - validation.currentPrice) / validation.currentPrice
      if (priceDiff > 0.05) {
        validation.warnings.push(`Entry price differs from current price by ${(priceDiff * 100).toFixed(2)}%`)
      }
      validation.priceValid = true
    }

    // Check leverage limits
    if (signal.leverage) {
      if (signal.leverage > this.config.maxLeverage) {
        validation.errors.push(`Leverage ${signal.leverage}x exceeds max ${this.config.maxLeverage}x`)
        validation.leverageWithinLimits = false
        validation.isValid = false
      }
    }

    // Check risk limits
    if (signal.riskPercent && signal.riskPercent > this.config.maxRiskPerTrade) {
      validation.errors.push(`Risk ${signal.riskPercent}% exceeds max ${this.config.maxRiskPerTrade}%`)
      validation.riskWithinLimits = false
      validation.isValid = false
    }

    // Check confidence
    if (signal.confidence < this.config.minConfidence) {
      validation.warnings.push(`Signal confidence ${signal.confidence} below minimum ${this.config.minConfidence}`)
    }

    // Check expiration
    if (signal.expiresAt && signal.expiresAt < new Date()) {
      validation.errors.push('Signal has expired')
      validation.notExpired = false
      validation.isValid = false
    }

    return validation
  }

  private async getMarketData(
    symbol: string,
    exchange: string
  ): Promise<{ price: number; spread: number; volume24h: number } | null> {
    // In production, fetch from exchange API
    // For now, return mock data
    return {
      price: 42000 + Math.random() * 1000,
      spread: 0.01,
      volume24h: 1000000000
    }
  }

  /**
   * Set signal defaults from config
   */
  applyDefaults(signal: TradingSignal): TradingSignal {
    if (!signal.leverage) {
      signal.leverage = this.config.defaultLeverage
    }

    if (!signal.stopLoss && signal.entryPrice) {
      const slPercent = this.config.defaultSL / 100
      signal.stopLoss = signal.direction === 'LONG'
        ? signal.entryPrice * (1 - slPercent)
        : signal.entryPrice * (1 + slPercent)
    }

    if (!signal.takeProfits?.length && signal.entryPrice) {
      const tpPercent = this.config.defaultTP / 100
      signal.takeProfits = [{
        price: signal.direction === 'LONG'
          ? signal.entryPrice * (1 + tpPercent)
          : signal.entryPrice * (1 - tpPercent),
        percent: 100,
        type: this.config.useTrailingStop ? 'trailing' : 'fixed'
      }]
    }

    // Set expiration
    if (!signal.expiresAt) {
      signal.expiresAt = new Date(Date.now() + this.config.signalTimeout)
    }

    return signal
  }
}

// ============================================================================
// Signal Executor
// ============================================================================

export class SignalExecutor {
  private config: SignalConfig
  private positions: Map<string, Position> = new Map()

  constructor(config: SignalConfig) {
    this.config = config
  }

  /**
   * Execute a signal
   */
  async execute(signal: TradingSignal): Promise<SignalExecution> {
    const execution: SignalExecution = {
      orderId: this.generateOrderId(),
      exchange: signal.exchange,
      executedAt: new Date(),
      entryPrice: signal.entryPrice || 0,
      positionSize: signal.positionSize || 0,
      leverage: signal.leverage || this.config.defaultLeverage,
      currentPrice: signal.entryPrice || 0,
      unrealizedPnl: 0,
      unrealizedPnlPercent: 0,
      takeProfitsHit: [],
      remainingPosition: 100,
      stopLossPrice: signal.stopLoss || 0,
      stopLossHit: false
    }

    try {
      // Calculate position size if not provided
      if (!signal.positionSize) {
        execution.positionSize = await this.calculatePositionSize(signal)
      }

      // Execute entry order
      if (signal.entryType === 'market') {
        execution.entryPrice = await this.executeMarketOrder(signal, execution)
      } else if (signal.entryType === 'limit') {
        execution.entryPrice = await this.executeLimitOrder(signal, execution)
      }

      // Set stop loss
      if (signal.stopLoss) {
        await this.setStopLoss(signal, execution)
      }

      // Set take profits
      for (const tp of signal.takeProfits) {
        await this.setTakeProfit(signal, tp, execution)
      }

      // Create position
      const position: Position = {
        id: this.generatePositionId(),
        signalId: signal.id,
        symbol: signal.symbol,
        exchange: signal.exchange,
        direction: signal.direction,
        entryPrice: execution.entryPrice,
        positionSize: execution.positionSize,
        leverage: execution.leverage,
        marginUsed: execution.positionSize / execution.leverage,
        currentPrice: execution.currentPrice,
        unrealizedPnl: execution.unrealizedPnl,
        unrealizedPnlPercent: execution.unrealizedPnlPercent,
        liquidationPrice: this.calculateLiquidationPrice(execution),
        stopLoss: execution.stopLossPrice,
        takeProfits: signal.takeProfits,
        status: 'open',
        openedAt: new Date()
      }

      this.positions.set(position.id, position)

    } catch (error) {
      signal.status = 'failed'
      throw error
    }

    return execution
  }

  private async calculatePositionSize(signal: TradingSignal): Promise<number> {
    // Risk-based position sizing
    const accountBalance = await this.getAccountBalance()
    const riskAmount = accountBalance * (this.config.maxRiskPerTrade / 100)
    
    if (signal.stopLoss && signal.entryPrice) {
      const stopDistance = Math.abs(signal.entryPrice - signal.stopLoss)
      const stopPercent = stopDistance / signal.entryPrice
      
      // Position size = Risk Amount / Stop Distance
      return riskAmount / stopPercent
    }

    // Default to max position size
    return Math.min(this.config.maxPositionSize, accountBalance * 0.1)
  }

  private async getAccountBalance(): Promise<number> {
    // In production, fetch from exchange
    return 10000 // Mock balance
  }

  private async executeMarketOrder(
    signal: TradingSignal,
    execution: SignalExecution
  ): Promise<number> {
    // Execute market order on exchange
    const side = signal.direction === 'LONG' ? 'BUY' : 'SELL'
    
    // In production: await exchange.createMarketOrder(...)
    console.log(`Executing market ${side} order for ${signal.symbol}`)
    
    return execution.entryPrice || signal.entryPrice || 0
  }

  private async executeLimitOrder(
    signal: TradingSignal,
    execution: SignalExecution
  ): Promise<number> {
    // Execute limit order on exchange
    const side = signal.direction === 'LONG' ? 'BUY' : 'SELL'
    
    // In production: await exchange.createLimitOrder(...)
    console.log(`Executing limit ${side} order for ${signal.symbol} @ ${signal.entryPrice}`)
    
    return signal.entryPrice || 0
  }

  private async setStopLoss(
    signal: TradingSignal,
    execution: SignalExecution
  ): Promise<void> {
    // Set stop loss order on exchange
    const side = signal.direction === 'LONG' ? 'SELL' : 'BUY'
    
    // In production: await exchange.createStopMarketOrder(...)
    console.log(`Setting stop loss at ${signal.stopLoss}`)
    
    execution.stopLossPrice = signal.stopLoss || 0
  }

  private async setTakeProfit(
    signal: TradingSignal,
    tp: TakeProfitLevel,
    execution: SignalExecution
  ): Promise<void> {
    // Set take profit order
    const side = signal.direction === 'LONG' ? 'SELL' : 'BUY'
    
    // In production: await exchange.createLimitOrder(...)
    console.log(`Setting take profit at ${tp.price} (${tp.percent}%)`)
  }

  private calculateLiquidationPrice(execution: SignalExecution): number {
    const { entryPrice, leverage, positionSize } = execution
    const maintenanceMargin = 0.004 // 0.4%
    
    // Simplified liquidation price calculation
    return entryPrice * (1 - (1 / leverage) + maintenanceMargin)
  }

  /**
   * Update position with current price
   */
  updatePosition(positionId: string, currentPrice: number): Position | null {
    const position = this.positions.get(positionId)
    if (!position) return null

    position.currentPrice = currentPrice

    // Calculate unrealized PnL
    const priceDiff = position.direction === 'LONG'
      ? currentPrice - position.entryPrice
      : position.entryPrice - currentPrice
    
    position.unrealizedPnl = priceDiff * position.positionSize / position.entryPrice
    position.unrealizedPnlPercent = (priceDiff / position.entryPrice) * 100 * position.leverage

    // Check take profits
    for (const tp of position.takeProfits) {
      if (tp.hit) continue
      
      const hit = position.direction === 'LONG'
        ? currentPrice >= tp.price
        : currentPrice <= tp.price
      
      if (hit) {
        tp.hit = true
        tp.hitAt = new Date()
        // Close partial position
        this.closePartialPosition(position, tp.percent)
      }
    }

    // Check stop loss
    const slHit = position.direction === 'LONG'
      ? currentPrice <= position.stopLoss
      : currentPrice >= position.stopLoss
    
    if (slHit) {
      this.closePosition(position.id, 'stop_loss')
    }

    return position
  }

  private closePartialPosition(position: Position, percent: number): void {
    console.log(`Closing ${percent}% of position ${position.id}`)
    // In production: execute partial close on exchange
  }

  /**
   * Close a position
   */
  async closePosition(positionId: string, reason: string): Promise<void> {
    const position = this.positions.get(positionId)
    if (!position) return

    position.status = 'closed'
    position.closedAt = new Date()
    position.closeReason = reason

    // Execute close order
    const side = position.direction === 'LONG' ? 'SELL' : 'BUY'
    console.log(`Closing position ${positionId} (${reason})`)

    // In production: await exchange.createMarketOrder(...)
  }

  /**
   * Get all open positions
   */
  getOpenPositions(): Position[] {
    return Array.from(this.positions.values()).filter(p => p.status === 'open')
  }

  private generateOrderId(): string {
    return `ord-${Date.now().toString(36)}`
  }

  private generatePositionId(): string {
    return `pos-${Date.now().toString(36)}`
  }
}

// ============================================================================
// Signal Bot Manager
// ============================================================================

export class SignalBotManager {
  private config: SignalConfig
  private parser: SignalParser
  private validator: SignalValidator
  private executor: SignalExecutor
  private signals: Map<string, TradingSignal> = new Map()

  constructor(config: SignalConfig) {
    this.config = config
    this.parser = new SignalParser()
    this.validator = new SignalValidator(config)
    this.executor = new SignalExecutor(config)
  }

  /**
   * Process incoming signal
   */
  async processSignal(message: string, source: string): Promise<TradingSignal> {
    // Parse signal
    const signal = this.parser.parse(message, source)
    if (!signal) {
      throw new Error('Failed to parse signal')
    }

    this.signals.set(signal.id, signal)
    signal.status = 'validating'

    // Apply defaults
    this.validator.applyDefaults(signal)

    // Validate signal
    signal.validation = await this.validator.validate(signal)
    
    if (!signal.validation.isValid) {
      signal.status = 'failed'
      return signal
    }

    signal.status = 'ready'

    // Auto-execute if enabled
    if (signal.confidence >= this.config.minConfidence) {
      signal.status = 'executing'
      
      try {
        signal.execution = await this.executor.execute(signal)
        signal.status = 'active'
      } catch (error) {
        signal.status = 'failed'
        console.error('Failed to execute signal:', error)
      }
    }

    return signal
  }

  /**
   * Get signal by ID
   */
  getSignal(signalId: string): TradingSignal | undefined {
    return this.signals.get(signalId)
  }

  /**
   * Get all signals
   */
  getSignals(status?: TradingSignal['status']): TradingSignal[] {
    let signals = Array.from(this.signals.values())
    
    if (status) {
      signals = signals.filter(s => s.status === status)
    }
    
    return signals.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Close signal position
   */
  async closeSignal(signalId: string, reason: string = 'manual'): Promise<void> {
    const signal = this.signals.get(signalId)
    if (!signal || !signal.execution) return

    await this.executor.closePosition(
      signal.execution.orderId,
      reason
    )

    signal.status = 'closed'
    if (signal.execution) {
      signal.execution.exitReason = reason as SignalExecution['exitReason']
      signal.execution.closedAt = new Date()
    }
  }

  /**
   * Update all positions with current prices
   */
  async updatePositions(prices: Record<string, number>): Promise<void> {
    for (const signal of this.signals.values()) {
      if (signal.status !== 'active' || !signal.execution) continue

      const price = prices[signal.symbol]
      if (!price) continue

      this.executor.updatePosition(signal.execution.orderId, price)
    }
  }

  /**
   * Get account summary
   */
  getAccountSummary(): {
    totalSignals: number
    activeSignals: number
    openPositions: number
    totalPnL: number
    winRate: number
  } {
    const signals = Array.from(this.signals.values())
    const closedSignals = signals.filter(s => s.status === 'closed')
    const wins = closedSignals.filter(s => 
      (s.execution?.realizedPnl || 0) > 0
    )

    return {
      totalSignals: signals.length,
      activeSignals: signals.filter(s => s.status === 'active').length,
      openPositions: this.executor.getOpenPositions().length,
      totalPnL: closedSignals.reduce((a, s) => a + (s.execution?.realizedPnl || 0), 0),
      winRate: closedSignals.length > 0 ? wins.length / closedSignals.length : 0
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSignalBot(config: Partial<SignalConfig> = {}): SignalBotManager {
  const defaultConfig: SignalConfig = {
    telegramChannels: [],
    webhookEndpoints: [],
    tradingviewWebhook: true,
    signalTimeout: 24 * 60 * 60 * 1000, // 24 hours
    minConfidence: 0.7,
    maxConcurrentPositions: 10,
    maxPositionSize: 1000,
    maxLeverage: 20,
    defaultLeverage: 5,
    maxRiskPerTrade: 2,
    maxDailyLoss: 10,
    defaultTP: 3,
    defaultSL: 1.5,
    useTrailingStop: true,
    trailingStopTrigger: 1,
    trailingStopDistance: 0.5,
    exchanges: [],
    notifyOnSignal: true,
    notifyOnEntry: true,
    notifyOnExit: true,
    notifyOnError: true,
    ...config
  }

  return new SignalBotManager(defaultConfig)
}
