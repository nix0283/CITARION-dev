/**
 * Feature Store for ML Models
 * 
 * Centralized feature management with:
 * - Feature computation and caching
 * - Feature versioning
 * - Feature lineage
 * - Real-time feature serving
 */

import { createHash } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface FeatureDefinition {
  name: string
  version: string
  description: string
  type: 'numeric' | 'categorical' | 'binary' | 'embedding'
  
  // Dependencies
  dependencies: string[]
  computeFunction: string  // Function name or expression
  
  // Computation
  computationConfig?: {
    windowSize?: number
    aggregation?: 'mean' | 'sum' | 'min' | 'max' | 'std' | 'last'
    normalize?: boolean
    fillMissing?: 'zero' | 'mean' | 'forward' | 'backward'
  }
  
  // Metadata
  owner?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  deprecated?: boolean
}

export interface FeatureValue {
  name: string
  version: string
  value: number | string | number[]
  timestamp: Date
  entityId?: string
  metadata?: Record<string, unknown>
}

export interface FeatureSet {
  name: string
  version: string
  features: FeatureDefinition[]
  computedFeatures: Map<string, FeatureValue>
  timestamp: Date
}

export interface FeatureLineage {
  featureName: string
  sources: string[]
  transformations: Transformation[]
  computedAt: Date
}

export interface Transformation {
  type: 'raw' | 'derived' | 'aggregated' | 'normalized' | 'encoded'
  description: string
  parameters: Record<string, unknown>
}

export interface FeatureStatistics {
  name: string
  count: number
  mean?: number
  std?: number
  min?: number
  max?: number
  percentiles?: {
    p25: number
    p50: number
    p75: number
    p95: number
    p99: number
  }
  nullCount: number
  uniqueCount?: number
  lastUpdated: Date
}

// ============================================================================
// Feature Store
// ============================================================================

export class FeatureStore {
  private definitions: Map<string, FeatureDefinition> = new Map()
  private cache: Map<string, FeatureValue> = new Map()
  private statistics: Map<string, FeatureStatistics> = new Map()
  private lineage: Map<string, FeatureLineage> = new Map()
  private computeFunctions: Map<string, (...args: unknown[]) => unknown> = new Map()

  constructor() {
    this.initializeBuiltInFeatures()
    this.initializeComputeFunctions()
  }

  // --------------------------------------------------------------------------
  // Feature Registration
  // --------------------------------------------------------------------------

  /**
   * Register a new feature definition
   */
  registerFeature(definition: Omit<FeatureDefinition, 'createdAt' | 'updatedAt'>): FeatureDefinition {
    const key = `${definition.name}@${definition.version}`
    
    const feature: FeatureDefinition = {
      ...definition,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.definitions.set(key, feature)
    this.initializeLineage(feature)
    
    return feature
  }

  /**
   * Get feature definition
   */
  getFeatureDefinition(name: string, version: string = 'latest'): FeatureDefinition | undefined {
    if (version === 'latest') {
      // Find latest version
      let latest: FeatureDefinition | undefined
      for (const [key, def] of this.definitions) {
        if (def.name === name && (!latest || def.version > latest.version)) {
          latest = def
        }
      }
      return latest
    }
    
    return this.definitions.get(`${name}@${version}`)
  }

  /**
   * List all features
   */
  listFeatures(tags?: string[]): FeatureDefinition[] {
    let features = Array.from(this.definitions.values())
    
    if (tags && tags.length > 0) {
      features = features.filter(f => 
        tags.some(tag => f.tags.includes(tag))
      )
    }
    
    return features
  }

  /**
   * Deprecate a feature
   */
  deprecateFeature(name: string, version: string): boolean {
    const key = `${name}@${version}`
    const feature = this.definitions.get(key)
    
    if (!feature) return false
    
    feature.deprecated = true
    feature.updatedAt = new Date()
    
    return true
  }

  // --------------------------------------------------------------------------
  // Feature Computation
  // --------------------------------------------------------------------------

  /**
   * Compute a feature value
   */
  async computeFeature(
    name: string,
    input: Record<string, unknown>,
    version: string = 'latest'
  ): Promise<FeatureValue> {
    const definition = this.getFeatureDefinition(name, version)
    
    if (!definition) {
      throw new Error(`Feature not found: ${name}@${version}`)
    }
    
    if (definition.deprecated) {
      console.warn(`Using deprecated feature: ${name}@${version}`)
    }
    
    // Check cache
    const cacheKey = this.getCacheKey(name, version, input)
    const cached = this.cache.get(cacheKey)
    if (cached && this.isCacheValid(cached)) {
      return cached
    }
    
    // Compute dependencies first
    const dependencies: Record<string, unknown> = {}
    for (const dep of definition.dependencies) {
      const depValue = await this.computeFeature(dep, input)
      dependencies[dep] = depValue.value
    }
    
    // Compute feature
    const computeFn = this.computeFunctions.get(definition.computeFunction)
    let value: number | string | number[]
    
    if (computeFn) {
      value = computeFn({ ...input, ...dependencies }, definition.computationConfig) as number | string | number[]
    } else {
      value = this.evaluateExpression(definition.computeFunction, { ...input, ...dependencies })
    }
    
    // Normalize if configured
    if (definition.computationConfig?.normalize && typeof value === 'number') {
      value = this.normalizeValue(name, value)
    }
    
    // Fill missing if configured
    if (value === null || value === undefined) {
      value = this.fillMissingValue(definition)
    }
    
    const featureValue: FeatureValue = {
      name,
      version: definition.version,
      value: value as number | string | number[],
      timestamp: new Date(),
      entityId: input.entityId as string
    }
    
    // Update cache
    this.cache.set(cacheKey, featureValue)
    
    // Update statistics
    this.updateStatistics(name, featureValue.value)
    
    return featureValue
  }

  /**
   * Compute multiple features
   */
  async computeFeatures(
    names: string[],
    input: Record<string, unknown>
  ): Promise<FeatureSet> {
    const computedFeatures = new Map<string, FeatureValue>()
    
    for (const name of names) {
      const value = await this.computeFeature(name, input)
      computedFeatures.set(name, value)
    }
    
    return {
      name: names.join('-'),
      version: '1.0',
      features: names.map(n => this.getFeatureDefinition(n)!).filter(Boolean),
      computedFeatures,
      timestamp: new Date()
    }
  }

  // --------------------------------------------------------------------------
  // Feature Statistics
  // --------------------------------------------------------------------------

  /**
   * Get feature statistics
   */
  getStatistics(name: string): FeatureStatistics | undefined {
    return this.statistics.get(name)
  }

  /**
   * Compute feature statistics from historical data
   */
  computeHistoricalStatistics(
    name: string,
    values: (number | string | number[])[]
  ): FeatureStatistics {
    const numericValues = values
      .filter((v): v is number => typeof v === 'number')
      .filter(v => !isNaN(v))
    
    const stats: FeatureStatistics = {
      name,
      count: values.length,
      nullCount: values.filter(v => v === null || v === undefined).length,
      lastUpdated: new Date()
    }
    
    if (numericValues.length > 0) {
      stats.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
      stats.std = Math.sqrt(
        numericValues.reduce((a, b) => a + Math.pow(b - stats.mean!, 2), 0) / numericValues.length
      )
      stats.min = Math.min(...numericValues)
      stats.max = Math.max(...numericValues)
      
      const sorted = [...numericValues].sort((a, b) => a - b)
      stats.percentiles = {
        p25: sorted[Math.floor(sorted.length * 0.25)],
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p75: sorted[Math.floor(sorted.length * 0.75)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      }
    }
    
    this.statistics.set(name, stats)
    return stats
  }

  // --------------------------------------------------------------------------
  // Feature Lineage
  // --------------------------------------------------------------------------

  /**
   * Get feature lineage
   */
  getLineage(name: string): FeatureLineage | undefined {
    return this.lineage.get(name)
  }

  private initializeLineage(feature: FeatureDefinition): void {
    const lineage: FeatureLineage = {
      featureName: feature.name,
      sources: feature.dependencies,
      transformations: [],
      computedAt: new Date()
    }
    
    // Add transformations based on config
    if (feature.computationConfig?.normalize) {
      lineage.transformations.push({
        type: 'normalized',
        description: 'Z-score normalization',
        parameters: {}
      })
    }
    
    if (feature.computationConfig?.aggregation) {
      lineage.transformations.push({
        type: 'aggregated',
        description: `${feature.computationConfig.aggregation} aggregation`,
        parameters: { windowSize: feature.computationConfig.windowSize }
      })
    }
    
    this.lineage.set(feature.name, lineage)
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  /**
   * Clear feature cache
   */
  clearCache(name?: string): void {
    if (name) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(name)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would track in production
    }
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private initializeBuiltInFeatures(): void {
    // Price-based features
    this.registerFeature({
      name: 'price_return',
      version: '1.0',
      description: 'Price return over window',
      type: 'numeric',
      dependencies: ['close'],
      computeFunction: 'computeReturn',
      computationConfig: { windowSize: 1 },
      tags: ['price', 'momentum']
    })

    this.registerFeature({
      name: 'price_volatility',
      version: '1.0',
      description: 'Price volatility (std of returns)',
      type: 'numeric',
      dependencies: ['close'],
      computeFunction: 'computeVolatility',
      computationConfig: { windowSize: 20, normalize: true },
      tags: ['price', 'volatility']
    })

    this.registerFeature({
      name: 'price_momentum',
      version: '1.0',
      description: 'Price momentum indicator',
      type: 'numeric',
      dependencies: ['close'],
      computeFunction: 'computeMomentum',
      computationConfig: { windowSize: 10, normalize: true },
      tags: ['price', 'momentum']
    })

    // Volume-based features
    this.registerFeature({
      name: 'volume_ratio',
      version: '1.0',
      description: 'Volume ratio to average',
      type: 'numeric',
      dependencies: ['volume'],
      computeFunction: 'computeVolumeRatio',
      computationConfig: { windowSize: 20 },
      tags: ['volume']
    })

    // Technical indicators
    this.registerFeature({
      name: 'rsi_14',
      version: '1.0',
      description: 'Relative Strength Index 14',
      type: 'numeric',
      dependencies: ['close'],
      computeFunction: 'computeRSI',
      computationConfig: { windowSize: 14, normalize: true },
      tags: ['technical', 'oscillator']
    })

    this.registerFeature({
      name: 'macd',
      version: '1.0',
      description: 'Moving Average Convergence Divergence',
      type: 'numeric',
      dependencies: ['close'],
      computeFunction: 'computeMACD',
      computationConfig: { normalize: true },
      tags: ['technical', 'trend']
    })

    this.registerFeature({
      name: 'bb_position',
      version: '1.0',
      description: 'Bollinger Band position',
      type: 'numeric',
      dependencies: ['close'],
      computeFunction: 'computeBBPosition',
      computationConfig: { windowSize: 20 },
      tags: ['technical', 'volatility']
    })

    // Session features
    this.registerFeature({
      name: 'hour_of_day',
      version: '1.0',
      description: 'Hour of day (cyclical)',
      type: 'numeric',
      dependencies: [],
      computeFunction: 'computeHourOfDay',
      tags: ['time', 'session']
    })

    this.registerFeature({
      name: 'day_of_week',
      version: '1.0',
      description: 'Day of week (cyclical)',
      type: 'numeric',
      dependencies: [],
      computeFunction: 'computeDayOfWeek',
      tags: ['time', 'session']
    })
  }

  private initializeComputeFunctions(): void {
    // Return computation
    this.computeFunctions.set('computeReturn', (input, config) => {
      const closes = input.close as number[]
      const window = (config as { windowSize?: number })?.windowSize || 1
      if (closes.length < window + 1) return 0
      return (closes[closes.length - 1] - closes[closes.length - window - 1]) / closes[closes.length - window - 1]
    })

    // Volatility computation
    this.computeFunctions.set('computeVolatility', (input, config) => {
      const closes = input.close as number[]
      const window = (config as { windowSize?: number })?.windowSize || 20
      if (closes.length < window) return 0
      
      const returns = []
      for (let i = 1; i < Math.min(window, closes.length); i++) {
        returns.push((closes[closes.length - i] - closes[closes.length - i - 1]) / closes[closes.length - i - 1])
      }
      
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length
      return Math.sqrt(returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length)
    })

    // Momentum computation
    this.computeFunctions.set('computeMomentum', (input, config) => {
      const closes = input.close as number[]
      const window = (config as { windowSize?: number })?.windowSize || 10
      if (closes.length < window) return 0
      return closes[closes.length - 1] / closes[closes.length - window] - 1
    })

    // Volume ratio
    this.computeFunctions.set('computeVolumeRatio', (input, config) => {
      const volumes = input.volume as number[]
      const window = (config as { windowSize?: number })?.windowSize || 20
      if (volumes.length < window) return 1
      
      const avg = volumes.slice(-window).reduce((a, b) => a + b, 0) / window
      return volumes[volumes.length - 1] / avg
    })

    // RSI computation
    this.computeFunctions.set('computeRSI', (input) => {
      const closes = input.close as number[]
      if (closes.length < 15) return 50
      
      let gains = 0
      let losses = 0
      
      for (let i = closes.length - 14; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1]
        if (change > 0) gains += change
        else losses -= change
      }
      
      const avgGain = gains / 14
      const avgLoss = losses / 14
      
      if (avgLoss === 0) return 100
      const rs = avgGain / avgLoss
      return 100 - (100 / (1 + rs))
    })

    // MACD computation
    this.computeFunctions.set('computeMACD', (input) => {
      const closes = input.close as number[]
      if (closes.length < 26) return 0
      
      // Simplified MACD
      const ema12 = this.computeEMA(closes, 12)
      const ema26 = this.computeEMA(closes, 26)
      return ema12 - ema26
    })

    // BB Position
    this.computeFunctions.set('computeBBPosition', (input, config) => {
      const closes = input.close as number[]
      const window = (config as { windowSize?: number })?.windowSize || 20
      if (closes.length < window) return 0.5
      
      const slice = closes.slice(-window)
      const mean = slice.reduce((a, b) => a + b, 0) / window
      const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / window)
      
      const upper = mean + 2 * std
      const lower = mean - 2 * std
      const current = closes[closes.length - 1]
      
      return (current - lower) / (upper - lower)
    })

    // Time features
    this.computeFunctions.set('computeHourOfDay', () => {
      const hour = new Date().getHours()
      return Math.sin(2 * Math.PI * hour / 24)
    })

    this.computeFunctions.set('computeDayOfWeek', () => {
      const day = new Date().getDay()
      return Math.sin(2 * Math.PI * day / 7)
    })
  }

  private computeEMA(data: number[], period: number): number {
    const k = 2 / (period + 1)
    let ema = data[0]
    
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k)
    }
    
    return ema
  }

  private getCacheKey(name: string, version: string, input: Record<string, unknown>): string {
    const inputHash = createHash('md5')
      .update(JSON.stringify(input))
      .digest('hex')
      .slice(0, 8)
    
    return `${name}@${version}:${inputHash}`
  }

  private isCacheValid(cached: FeatureValue): boolean {
    const maxAge = 5 * 60 * 1000 // 5 minutes
    return Date.now() - cached.timestamp.getTime() < maxAge
  }

  private evaluateExpression(expr: string, context: Record<string, unknown>): number {
    // Simple expression evaluation
    try {
      // Replace variable names with values
      let evaluated = expr
      for (const [key, value] of Object.entries(context)) {
        evaluated = evaluated.replace(new RegExp(`\\b${key}\\b`, 'g'), String(value))
      }
      
      // Safe evaluation (only allow math)
      const allowedChars = /^[\d\s+\-*/().]+$/
      if (allowedChars.test(evaluated)) {
        return eval(evaluated)
      }
      
      return 0
    } catch {
      return 0
    }
  }

  private normalizeValue(name: string, value: number): number {
    const stats = this.statistics.get(name)
    if (!stats || !stats.mean || !stats.std) return value
    
    return (value - stats.mean) / stats.std
  }

  private fillMissingValue(definition: FeatureDefinition): number | string {
    const config = definition.computationConfig
    
    switch (config?.fillMissing) {
      case 'zero':
        return 0
      case 'mean':
        return this.statistics.get(definition.name)?.mean || 0
      default:
        return 0
    }
  }

  private updateStatistics(name: string, value: number | string | number[]): void {
    let stats = this.statistics.get(name)
    
    if (!stats) {
      stats = {
        name,
        count: 0,
        nullCount: 0,
        lastUpdated: new Date()
      }
    }
    
    stats.count++
    stats.lastUpdated = new Date()
    
    if (typeof value === 'number' && !isNaN(value)) {
      // Running mean and variance (Welford's algorithm)
      if (stats.mean === undefined) {
        stats.mean = value
        stats.std = 0
        stats.min = value
        stats.max = value
      } else {
        const delta = value - stats.mean
        stats.mean += delta / stats.count
        const delta2 = value - stats.mean
        
        if (stats.std !== undefined) {
          stats.std = Math.sqrt(
            ((stats.count - 1) * Math.pow(stats.std, 2) + delta * delta2) / stats.count
          )
        }
        
        stats.min = Math.min(stats.min, value)
        stats.max = Math.max(stats.max, value)
      }
    }
    
    this.statistics.set(name, stats)
  }
}

// ============================================================================
// Singleton
// ============================================================================

let featureStoreInstance: FeatureStore | null = null

export function getFeatureStore(): FeatureStore {
  if (!featureStoreInstance) {
    featureStoreInstance = new FeatureStore()
  }
  return featureStoreInstance
}
