/**
 * A/B Testing Framework for ML Models
 * 
 * Provides statistical comparison between model variants
 * with automated traffic splitting and metrics tracking.
 */

import { createHash } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface ABExperiment {
  id: string
  name: string
  description: string
  status: ExperimentStatus
  createdAt: Date
  startedAt?: Date
  endedAt?: Date
  
  // Variants
  control: ExperimentVariant
  treatment: ExperimentVariant
  
  // Traffic allocation
  trafficAllocation: number // 0-1, fraction of traffic in experiment
  controlWeight: number     // 0-1, fraction of experiment traffic to control
  
  // Targeting
  targeting: ExperimentTargeting
  
  // Results
  results?: ExperimentResults
  
  // Configuration
  config: ExperimentConfig
}

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived'

export interface ExperimentVariant {
  id: string
  name: string
  modelId: string
  modelVersion?: string
  description: string
  isControl: boolean
}

export interface ExperimentTargeting {
  symbols?: string[]       // Only specific trading pairs
  botTypes?: string[]      // Only specific bots
  userSegments?: string[]  // User segments to include
  minConfidence?: number   // Minimum model confidence threshold
  timeRange?: {
    startHour: number
    endHour: number
  }
}

export interface ExperimentConfig {
  // Stopping criteria
  maxDuration: number         // Max experiment duration in hours
  minSampleSize: number       // Minimum samples per variant
  maxSampleSize: number       // Maximum samples per variant
  
  // Statistical parameters
  significanceLevel: number   // Alpha (default 0.05)
  power: number              // Statistical power (default 0.8)
  minDetectableEffect: number // Minimum effect size to detect
  
  // Metrics
  primaryMetric: PrimaryMetric
  secondaryMetrics: SecondaryMetric[]
  
  // Safety
  autoStopOnDegradation: boolean
  degradationThreshold: number // Stop if treatment is X% worse
}

export type PrimaryMetric = 'win_rate' | 'profit_factor' | 'sharpe_ratio' | 'accuracy' | 'precision'

export type SecondaryMetric = 'recall' | 'f1_score' | 'max_drawdown' | 'avg_return' | 'total_trades'

export interface ExperimentResults {
  // Sample counts
  controlSamples: number
  treatmentSamples: number
  
  // Metrics
  controlMetrics: VariantMetrics
  treatmentMetrics: VariantMetrics
  
  // Statistical tests
  statisticalTests: StatisticalTestResult[]
  
  // Conclusion
  conclusion?: ExperimentConclusion
}

export interface VariantMetrics {
  winRate: number
  profitFactor: number
  sharpeRatio: number
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  maxDrawdown: number
  avgReturn: number
  totalTrades: number
  totalPnL: number
  avgConfidence: number
}

export interface StatisticalTestResult {
  metric: string
  testType: 't_test' | 'chi_square' | 'mann_whitney' | 'bootstrap'
  
  // Test statistics
  statistic: number
  pValue: number
  confidenceInterval: [number, number]
  
  // Effect size
  effectSize: number
  effectType: 'cohens_d' | 'odds_ratio' | 'relative_lift'
  
  // Interpretation
  isSignificant: boolean
  direction: 'control_better' | 'treatment_better' | 'no_difference'
}

export interface ExperimentConclusion {
  winner: 'control' | 'treatment' | 'inconclusive'
  confidence: number
  recommendation: string
  effectSize: number
  expectedLift: number
  
  // Business impact
  projectedAnnualImpact?: number
}

export interface ExperimentEvent {
  experimentId: string
  variantId: string
  eventType: 'prediction' | 'trade' | 'outcome'
  timestamp: Date
  
  // Prediction data
  prediction?: {
    symbol: string
    direction: 'LONG' | 'SHORT' | 'NEUTRAL'
    confidence: number
    features?: Record<string, number>
  }
  
  // Trade data
  trade?: {
    id: string
    symbol: string
    side: 'BUY' | 'SELL'
    entryPrice: number
    exitPrice?: number
    quantity: number
    pnl?: number
    outcome?: 'win' | 'loss' | 'neutral'
  }
  
  // Context
  context?: {
    botType?: string
    userId?: string
    sessionId?: string
  }
}

// ============================================================================
// A/B Testing Manager
// ============================================================================

export class ABTestingManager {
  private experiments: Map<string, ABExperiment> = new Map()
  private events: Map<string, ExperimentEvent[]> = new Map()
  private userAssignments: Map<string, Map<string, string>> = new Map() // userId -> experimentId -> variantId

  constructor() {
    this.loadFromStorage()
  }

  // --------------------------------------------------------------------------
  // Experiment Management
  // --------------------------------------------------------------------------

  /**
   * Create a new experiment
   */
  createExperiment(
    name: string,
    description: string,
    controlModelId: string,
    treatmentModelId: string,
    config: Partial<ExperimentConfig> = {}
  ): ABExperiment {
    const id = this.generateId(name)
    
    const experiment: ABExperiment = {
      id,
      name,
      description,
      status: 'draft',
      createdAt: new Date(),
      
      control: {
        id: `${id}-control`,
        name: 'Control',
        modelId: controlModelId,
        description: 'Current production model',
        isControl: true
      },
      
      treatment: {
        id: `${id}-treatment`,
        name: 'Treatment',
        modelId: treatmentModelId,
        description: 'New model variant',
        isControl: false
      },
      
      trafficAllocation: config.maxSampleSize ? 1.0 : 0.1, // Default 10% traffic
      controlWeight: 0.5,
      
      targeting: {},
      
      config: {
        maxDuration: 168, // 1 week
        minSampleSize: 1000,
        maxSampleSize: 10000,
        significanceLevel: 0.05,
        power: 0.8,
        minDetectableEffect: 0.05,
        primaryMetric: 'win_rate',
        secondaryMetrics: ['profit_factor', 'sharpe_ratio'],
        autoStopOnDegradation: true,
        degradationThreshold: 0.1,
        ...config
      }
    }
    
    this.experiments.set(id, experiment)
    this.events.set(id, [])
    this.saveToStorage()
    
    return experiment
  }

  /**
   * Start an experiment
   */
  startExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId)
    if (!experiment || experiment.status !== 'draft') return false
    
    experiment.status = 'running'
    experiment.startedAt = new Date()
    this.saveToStorage()
    
    return true
  }

  /**
   * Pause an experiment
   */
  pauseExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId)
    if (!experiment || experiment.status !== 'running') return false
    
    experiment.status = 'paused'
    this.saveToStorage()
    
    return true
  }

  /**
   * End an experiment
   */
  endExperiment(experimentId: string): ExperimentConclusion | null {
    const experiment = this.experiments.get(experimentId)
    if (!experiment) return null
    
    const results = this.calculateResults(experimentId)
    if (!results) return null
    
    experiment.status = 'completed'
    experiment.endedAt = new Date()
    experiment.results = results
    
    this.saveToStorage()
    
    return results.conclusion || null
  }

  // --------------------------------------------------------------------------
  // Variant Assignment
  // --------------------------------------------------------------------------

  /**
   * Get variant assignment for a user/request
   */
  getVariant(
    experimentId: string,
    userId?: string,
    context?: { symbol?: string; botType?: string }
  ): ExperimentVariant | null {
    const experiment = this.experiments.get(experimentId)
    if (!experiment || experiment.status !== 'running') return null
    
    // Check targeting
    if (!this.matchesTargeting(experiment, context)) return null
    
    // Check traffic allocation
    if (Math.random() > experiment.trafficAllocation) return null
    
    // Consistent assignment for same user
    if (userId) {
      const userExperiments = this.userAssignments.get(userId) || new Map()
      const existingVariant = userExperiments.get(experimentId)
      
      if (existingVariant) {
        return existingVariant === experiment.control.id 
          ? experiment.control 
          : experiment.treatment
      }
      
      // New assignment
      const isControl = this.hashUserId(userId, experimentId) < experiment.controlWeight
      const variant = isControl ? experiment.control : experiment.treatment
      
      userExperiments.set(experimentId, variant.id)
      this.userAssignments.set(userId, userExperiments)
      
      return variant
    }
    
    // Random assignment for anonymous
    const isControl = Math.random() < experiment.controlWeight
    return isControl ? experiment.control : experiment.treatment
  }

  /**
   * Check if context matches targeting rules
   */
  private matchesTargeting(
    experiment: ABExperiment,
    context?: { symbol?: string; botType?: string }
  ): boolean {
    const { targeting } = experiment
    
    if (targeting.symbols && context?.symbol) {
      if (!targeting.symbols.includes(context.symbol)) return false
    }
    
    if (targeting.botTypes && context?.botType) {
      if (!targeting.botTypes.includes(context.botType)) return false
    }
    
    if (targeting.timeRange) {
      const hour = new Date().getHours()
      if (hour < targeting.timeRange.startHour || hour > targeting.timeRange.endHour) {
        return false
      }
    }
    
    return true
  }

  /**
   * Consistent hash for user assignment
   */
  private hashUserId(userId: string, experimentId: string): number {
    const hash = createHash('md5')
      .update(`${userId}:${experimentId}`)
      .digest('hex')
    return parseInt(hash.slice(0, 8), 16) / 0xffffffff
  }

  // --------------------------------------------------------------------------
  // Event Tracking
  // --------------------------------------------------------------------------

  /**
   * Record a prediction event
   */
  recordPrediction(
    experimentId: string,
    variantId: string,
    prediction: ExperimentEvent['prediction'],
    context?: ExperimentEvent['context']
  ): void {
    this.recordEvent({
      experimentId,
      variantId,
      eventType: 'prediction',
      timestamp: new Date(),
      prediction,
      context
    })
  }

  /**
   * Record a trade event
   */
  recordTrade(
    experimentId: string,
    variantId: string,
    trade: ExperimentEvent['trade'],
    context?: ExperimentEvent['context']
  ): void {
    this.recordEvent({
      experimentId,
      variantId,
      eventType: 'trade',
      timestamp: new Date(),
      trade,
      context
    })
  }

  /**
   * Record an outcome event
   */
  recordOutcome(
    experimentId: string,
    variantId: string,
    tradeId: string,
    outcome: 'win' | 'loss' | 'neutral',
    pnl: number
  ): void {
    const events = this.events.get(experimentId) || []
    const tradeEvent = events.find(e => 
      e.eventType === 'trade' && e.trade?.id === tradeId
    )
    
    if (tradeEvent && tradeEvent.trade) {
      tradeEvent.trade.outcome = outcome
      tradeEvent.trade.pnl = pnl
      tradeEvent.eventType = 'outcome'
      this.saveToStorage()
    }
  }

  private recordEvent(event: ExperimentEvent): void {
    const events = this.events.get(event.experimentId) || []
    events.push(event)
    this.events.set(event.experimentId, events)
    
    // Auto-check for early stopping
    this.checkStoppingCriteria(event.experimentId)
  }

  // --------------------------------------------------------------------------
  // Results Calculation
  // --------------------------------------------------------------------------

  /**
   * Calculate experiment results
   */
  calculateResults(experimentId: string): ExperimentResults | null {
    const experiment = this.experiments.get(experimentId)
    const events = this.events.get(experimentId)
    
    if (!experiment || !events) return null

    // Separate events by variant
    const controlEvents = events.filter(e => e.variantId === experiment.control.id)
    const treatmentEvents = events.filter(e => e.variantId === experiment.treatment.id)

    // Calculate metrics
    const controlMetrics = this.calculateVariantMetrics(controlEvents)
    const treatmentMetrics = this.calculateVariantMetrics(treatmentEvents)

    // Run statistical tests
    const statisticalTests = this.runStatisticalTests(
      controlEvents,
      treatmentEvents,
      experiment.config
    )

    // Determine conclusion
    const conclusion = this.determineConclusion(
      controlMetrics,
      treatmentMetrics,
      statisticalTests,
      experiment.config
    )

    return {
      controlSamples: controlEvents.length,
      treatmentSamples: treatmentEvents.length,
      controlMetrics,
      treatmentMetrics,
      statisticalTests,
      conclusion
    }
  }

  private calculateVariantMetrics(events: ExperimentEvent[]): VariantMetrics {
    const trades = events.filter(e => e.eventType === 'trade' && e.trade?.outcome)
    const predictions = events.filter(e => e.eventType === 'prediction')
    
    const wins = trades.filter(e => e.trade?.outcome === 'win').length
    const losses = trades.filter(e => e.trade?.outcome === 'loss').length
    const total = trades.length
    
    const pnls = trades.map(e => e.trade?.pnl || 0).filter(p => p !== 0)
    const grossProfit = pnls.filter(p => p > 0).reduce((a, b) => a + b, 0)
    const grossLoss = Math.abs(pnls.filter(p => p < 0).reduce((a, b) => a + b, 0))
    
    return {
      winRate: total > 0 ? wins / total : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      sharpeRatio: this.calculateSharpeRatio(pnls),
      accuracy: predictions.length > 0 
        ? predictions.filter(e => (e.prediction?.confidence || 0) > 0.5).length / predictions.length 
        : 0,
      precision: wins / (wins + losses) || 0,
      recall: wins / (wins + losses) || 0, // Simplified
      f1Score: 0, // Calculate from precision/recall
      maxDrawdown: this.calculateMaxDrawdown(pnls),
      avgReturn: pnls.length > 0 ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0,
      totalTrades: total,
      totalPnL: pnls.reduce((a, b) => a + b, 0),
      avgConfidence: predictions.length > 0
        ? predictions.reduce((a, e) => a + (e.prediction?.confidence || 0), 0) / predictions.length
        : 0
    }
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / (returns.length - 1)
    const std = Math.sqrt(variance)
    
    return std > 0 ? mean / std : 0
  }

  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0
    
    let peak = 0
    let maxDrawdown = 0
    let cumulative = 0
    
    for (const r of returns) {
      cumulative += r
      peak = Math.max(peak, cumulative)
      maxDrawdown = Math.max(maxDrawdown, peak - cumulative)
    }
    
    return maxDrawdown
  }

  private runStatisticalTests(
    controlEvents: ExperimentEvent[],
    treatmentEvents: ExperimentEvent[],
    config: ExperimentConfig
  ): StatisticalTestResult[] {
    const results: StatisticalTestResult[] = []
    
    // Win rate comparison (Chi-square)
    const controlTrades = controlEvents.filter(e => e.eventType === 'trade' && e.trade?.outcome)
    const treatmentTrades = treatmentEvents.filter(e => e.eventType === 'trade' && e.trade?.outcome)
    
    if (controlTrades.length >= config.minSampleSize && treatmentTrades.length >= config.minSampleSize) {
      const controlWins = controlTrades.filter(e => e.trade?.outcome === 'win').length
      const treatmentWins = treatmentTrades.filter(e => e.trade?.outcome === 'win').length
      
      results.push(this.chiSquareTest(
        controlWins,
        controlTrades.length - controlWins,
        treatmentWins,
        treatmentTrades.length - treatmentWins,
        'win_rate'
      ))
    }
    
    return results
  }

  private chiSquareTest(
    controlSuccess: number,
    controlFailure: number,
    treatmentSuccess: number,
    treatmentFailure: number,
    metric: string
  ): StatisticalTestResult {
    const total = controlSuccess + controlFailure + treatmentSuccess + treatmentFailure
    
    const controlTotal = controlSuccess + controlFailure
    const treatmentTotal = treatmentSuccess + treatmentFailure
    
    const expectedControlSuccess = (controlTotal * (controlSuccess + treatmentSuccess)) / total
    const expectedControlFailure = (controlTotal * (controlFailure + treatmentFailure)) / total
    const expectedTreatmentSuccess = (treatmentTotal * (controlSuccess + treatmentSuccess)) / total
    const expectedTreatmentFailure = (treatmentTotal * (controlFailure + treatmentFailure)) / total
    
    const chiSquare = 
      Math.pow(controlSuccess - expectedControlSuccess, 2) / expectedControlSuccess +
      Math.pow(controlFailure - expectedControlFailure, 2) / expectedControlFailure +
      Math.pow(treatmentSuccess - expectedTreatmentSuccess, 2) / expectedTreatmentSuccess +
      Math.pow(treatmentFailure - expectedTreatmentFailure, 2) / expectedTreatmentFailure
    
    // Simplified p-value calculation
    const pValue = this.chiSquarePValue(chiSquare, 1)
    
    const controlRate = controlSuccess / controlTotal
    const treatmentRate = treatmentSuccess / treatmentTotal
    const lift = (treatmentRate - controlRate) / controlRate
    
    return {
      metric,
      testType: 'chi_square',
      statistic: chiSquare,
      pValue,
      confidenceInterval: [lift - 0.05, lift + 0.05], // Simplified
      effectSize: lift,
      effectType: 'relative_lift',
      isSignificant: pValue < 0.05,
      direction: treatmentRate > controlRate ? 'treatment_better' : 
                 treatmentRate < controlRate ? 'control_better' : 'no_difference'
    }
  }

  private chiSquarePValue(chiSquare: number, df: number): number {
    // Simplified approximation
    if (chiSquare < 0.004) return 0.95
    if (chiSquare < 0.02) return 0.90
    if (chiSquare < 0.06) return 0.80
    if (chiSquare < 0.15) return 0.70
    if (chiSquare < 0.46) return 0.50
    if (chiSquare < 1.07) return 0.30
    if (chiSquare < 1.64) return 0.20
    if (chiSquare < 2.71) return 0.10
    if (chiSquare < 3.84) return 0.05
    if (chiSquare < 5.02) return 0.025
    if (chiSquare < 6.63) return 0.01
    if (chiSquare < 7.88) return 0.005
    return 0.001
  }

  private determineConclusion(
    controlMetrics: VariantMetrics,
    treatmentMetrics: VariantMetrics,
    tests: StatisticalTestResult[],
    config: ExperimentConfig
  ): ExperimentConclusion {
    const primaryTest = tests.find(t => t.metric === config.primaryMetric)
    
    if (!primaryTest) {
      return {
        winner: 'inconclusive',
        confidence: 0,
        recommendation: 'Insufficient data for conclusion. Continue experiment.',
        effectSize: 0,
        expectedLift: 0
      }
    }
    
    const lift = primaryTest.effectSize
    
    if (primaryTest.isSignificant) {
      const winner = primaryTest.direction === 'treatment_better' ? 'treatment' : 
                     primaryTest.direction === 'control_better' ? 'control' : 'inconclusive'
      
      return {
        winner,
        confidence: 1 - primaryTest.pValue,
        recommendation: winner === 'treatment' 
          ? `Treatment is ${Math.abs(lift * 100).toFixed(1)}% better. Recommend promoting to production.`
          : winner === 'control'
          ? `Control is ${Math.abs(lift * 100).toFixed(1)}% better. Keep current model.`
          : 'No significant difference detected.',
        effectSize: lift,
        expectedLift: lift
      }
    }
    
    return {
      winner: 'inconclusive',
      confidence: 1 - primaryTest.pValue,
      recommendation: 'Results are not statistically significant. Consider extending experiment.',
      effectSize: lift,
      expectedLift: lift
    }
  }

  // --------------------------------------------------------------------------
  // Stopping Criteria
  // --------------------------------------------------------------------------

  private checkStoppingCriteria(experimentId: string): void {
    const experiment = this.experiments.get(experimentId)
    if (!experiment || experiment.status !== 'running') return
    
    const events = this.events.get(experimentId) || []
    const { config } = experiment
    
    // Check sample size
    if (events.length >= config.maxSampleSize) {
      this.endExperiment(experimentId)
      return
    }
    
    // Check duration
    if (experiment.startedAt) {
      const hoursElapsed = (Date.now() - experiment.startedAt.getTime()) / (1000 * 60 * 60)
      if (hoursElapsed >= config.maxDuration) {
        this.endExperiment(experimentId)
        return
      }
    }
    
    // Check for degradation
    if (config.autoStopOnDegradation && events.length >= config.minSampleSize) {
      const results = this.calculateResults(experimentId)
      if (results && results.conclusion) {
        const { conclusion } = results
        
        if (conclusion.winner === 'control' && 
            Math.abs(conclusion.effectSize) > config.degradationThreshold) {
          // Treatment is significantly worse
          this.endExperiment(experimentId)
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private generateId(name: string): string {
    const timestamp = Date.now().toString(36)
    const hash = createHash('md5').update(name).digest('hex').slice(0, 8)
    return `exp-${timestamp}-${hash}`
  }

  getExperiments(): ABExperiment[] {
    return Array.from(this.experiments.values())
  }

  getExperiment(id: string): ABExperiment | undefined {
    return this.experiments.get(id)
  }

  getRunningExperiments(): ABExperiment[] {
    return this.getExperiments().filter(e => e.status === 'running')
  }

  // --------------------------------------------------------------------------
  // Storage
  // --------------------------------------------------------------------------

  private loadFromStorage(): void {
    // In production, load from database
    // For now, use in-memory
  }

  private saveToStorage(): void {
    // In production, save to database
    // For now, use in-memory
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let abTestingInstance: ABTestingManager | null = null

export function getABTestingManager(): ABTestingManager {
  if (!abTestingInstance) {
    abTestingInstance = new ABTestingManager()
  }
  return abTestingInstance
}
