/**
 * Ensemble Methods for ML Classification
 * 
 * Combines multiple classifiers for improved predictions.
 * Supports voting, stacking, and boosting strategies.
 */

import { getLawrenceClassifier, type LawrenceFeatures, type LawrenceResult } from './lawrence-classifier'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Classifier in the ensemble
 */
export interface EnsembleClassifier {
  name: string
  weight: number
  predict: (features: Record<string, number>) => Promise<LawrenceResult>
}

/**
 * Ensemble configuration
 */
export interface EnsembleConfig {
  // Aggregation method
  method: 'voting' | 'weighted_average' | 'stacking' | 'boosting'
  
  // Voting type (for voting method)
  votingType: 'hard' | 'soft'
  
  // Minimum confidence to act
  minConfidence: number
  
  // Minimum agreement (for voting)
  minAgreement: number
  
  // Enable dynamic weighting based on performance
  dynamicWeighting: boolean
  
  // Performance window for dynamic weighting
  performanceWindow: number
}

/**
 * Default ensemble configuration
 */
export const DEFAULT_ENSEMBLE_CONFIG: EnsembleConfig = {
  method: 'weighted_average',
  votingType: 'soft',
  minConfidence: 0.5,
  minAgreement: 0.6,
  dynamicWeighting: true,
  performanceWindow: 100,
}

/**
 * Ensemble prediction result
 */
export interface EnsembleResult extends LawrenceResult {
  // Individual classifier results
  classifierResults: Array<{
    name: string
    direction: 'LONG' | 'SHORT' | 'NEUTRAL'
    confidence: number
    weight: number
  }>
  
  // Ensemble metrics
  agreement: number        // 0-1, how much classifiers agree
  entropy: number          // 0-1, prediction uncertainty
  consensusStrength: number // 0-1, strength of consensus
  
  // Method-specific
  method: string
}

/**
 * Classifier performance tracking
 */
interface ClassifierPerformance {
  name: string
  totalPredictions: number
  correct: number
  accuracy: number
  avgConfidence: number
  recentAccuracy: number[]
}

// ============================================================================
// ENSEMBLE CLASSIFIER
// ============================================================================

/**
 * Ensemble Classifier
 * 
 * Combines multiple classifiers with various aggregation strategies
 */
export class EnsembleClassifier {
  private classifiers: Map<string, EnsembleClassifier> = new Map()
  private performances: Map<string, ClassifierPerformance> = new Map()
  private config: EnsembleConfig
  
  constructor(config: Partial<EnsembleConfig> = {}) {
    this.config = { ...DEFAULT_ENSEMBLE_CONFIG, ...config }
    this.initializeDefaultClassifiers()
  }
  
  /**
   * Initialize default classifiers
   */
  private initializeDefaultClassifiers(): void {
    // Lawrence Classifier (primary)
    const lawrence = getLawrenceClassifier()
    
    this.addClassifier({
      name: 'lawrence',
      weight: 1.0,
      predict: async (features) => {
        // Convert features to Lawrence format and classify
        return lawrence.classify({ indicators: features } as LawrenceFeatures)
      },
    })
    
    // Momentum classifier (derived from RSI/momentum features)
    this.addClassifier({
      name: 'momentum',
      weight: 0.8,
      predict: async (features) => {
        return this.momentumClassifier(features)
      },
    })
    
    // Trend classifier
    this.addClassifier({
      name: 'trend',
      weight: 0.9,
      predict: async (features) => {
        return this.trendClassifier(features)
      },
    })
    
    // Session classifier
    this.addClassifier({
      name: 'session',
      weight: 0.6,
      predict: async (features) => {
        return this.sessionClassifier(features)
      },
    })
  }
  
  /**
   * Add a classifier to the ensemble
   */
  addClassifier(classifier: EnsembleClassifier): void {
    this.classifiers.set(classifier.name, classifier)
    this.performances.set(classifier.name, {
      name: classifier.name,
      totalPredictions: 0,
      correct: 0,
      accuracy: 0.5,
      avgConfidence: 0.5,
      recentAccuracy: [],
    })
  }
  
  /**
   * Remove a classifier from the ensemble
   */
  removeClassifier(name: string): void {
    this.classifiers.delete(name)
    this.performances.delete(name)
  }
  
  /**
   * Predict using the ensemble
   */
  async predict(features: Record<string, number>): Promise<EnsembleResult> {
    // Get predictions from all classifiers
    const predictions = await Promise.all(
      Array.from(this.classifiers.values()).map(async (classifier) => {
        const result = await classifier.predict(features)
        const weight = this.getWeight(classifier.name)
        
        return {
          name: classifier.name,
          direction: result.direction,
          confidence: result.confidence,
          probability: result.probability,
          weight,
        }
      })
    )
    
    // Aggregate based on method
    let aggregated: {
      direction: 'LONG' | 'SHORT' | 'NEUTRAL'
      confidence: number
      probability: number
    }
    
    switch (this.config.method) {
      case 'voting':
        aggregated = this.votingAggregation(predictions)
        break
      case 'weighted_average':
        aggregated = this.weightedAverageAggregation(predictions)
        break
      case 'stacking':
        aggregated = this.stackingAggregation(predictions, features)
        break
      default:
        aggregated = this.weightedAverageAggregation(predictions)
    }
    
    // Calculate ensemble metrics
    const agreement = this.calculateAgreement(predictions)
    const entropy = this.calculateEntropy(predictions)
    const consensusStrength = agreement * (1 - entropy)
    
    // Build result
    const result: EnsembleResult = {
      direction: aggregated.direction,
      probability: aggregated.probability,
      confidence: aggregated.confidence,
      features,
      classifierResults: predictions.map(p => ({
        name: p.name,
        direction: p.direction,
        confidence: p.confidence,
        weight: p.weight,
      })),
      agreement,
      entropy,
      consensusStrength,
      method: this.config.method,
    }
    
    return result
  }
  
  /**
   * Voting aggregation
   */
  private votingAggregation(
    predictions: Array<{ direction: string; confidence: number; weight: number }>
  ): { direction: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; probability: number } {
    if (this.config.votingType === 'hard') {
      // Hard voting: majority wins
      const votes = { LONG: 0, SHORT: 0, NEUTRAL: 0 }
      
      for (const pred of predictions) {
        votes[pred.direction as keyof typeof votes]++
      }
      
      const maxVotes = Math.max(...Object.values(votes))
      const direction = Object.entries(votes).find(([, v]) => v === maxVotes)![0] as 'LONG' | 'SHORT' | 'NEUTRAL'
      
      const agreement = maxVotes / predictions.length
      
      return {
        direction,
        confidence: agreement,
        probability: agreement,
      }
    } else {
      // Soft voting: weighted average of probabilities
      return this.weightedAverageAggregation(predictions)
    }
  }
  
  /**
   * Weighted average aggregation
   */
  private weightedAverageAggregation(
    predictions: Array<{ direction: string; confidence: number; weight: number }>
  ): { direction: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; probability: number } {
    let longScore = 0
    let shortScore = 0
    let neutralScore = 0
    let totalWeight = 0
    
    for (const pred of predictions) {
      const weightedConf = pred.confidence * pred.weight
      
      if (pred.direction === 'LONG') {
        longScore += weightedConf
      } else if (pred.direction === 'SHORT') {
        shortScore += weightedConf
      } else {
        neutralScore += weightedConf
      }
      
      totalWeight += pred.weight
    }
    
    // Normalize
    const normalizedLong = longScore / totalWeight
    const normalizedShort = shortScore / totalWeight
    const normalizedNeutral = neutralScore / totalWeight
    
    // Determine direction
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL'
    let confidence: number
    
    if (normalizedLong > normalizedShort && normalizedLong > normalizedNeutral) {
      direction = 'LONG'
      confidence = normalizedLong
    } else if (normalizedShort > normalizedLong && normalizedShort > normalizedNeutral) {
      direction = 'SHORT'
      confidence = normalizedShort
    } else {
      direction = 'NEUTRAL'
      confidence = normalizedNeutral
    }
    
    return {
      direction,
      confidence,
      probability: confidence,
    }
  }
  
  /**
   * Stacking aggregation (meta-learner)
   */
  private stackingAggregation(
    predictions: Array<{ direction: string; confidence: number; weight: number }>,
    _features: Record<string, number>
  ): { direction: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; probability: number } {
    // Simplified stacking: use weighted average with learned meta-weights
    // In production, this would use a trained meta-learner
    
    const baseResult = this.weightedAverageAggregation(predictions)
    
    // Apply meta-adjustments based on classifier performance
    let adjustment = 0
    
    for (const pred of predictions) {
      const perf = this.performances.get(pred.name)
      if (perf && perf.accuracy > 0.5) {
        // Boost confidence if high-performing classifier agrees
        if (pred.direction === baseResult.direction) {
          adjustment += (perf.accuracy - 0.5) * 0.1
        }
      }
    }
    
    return {
      ...baseResult,
      confidence: Math.min(1, baseResult.confidence + adjustment),
    }
  }
  
  /**
   * Calculate agreement between classifiers
   */
  private calculateAgreement(
    predictions: Array<{ direction: string }>
  ): number {
    const directions = predictions.map(p => p.direction)
    const counts = { LONG: 0, SHORT: 0, NEUTRAL: 0 }
    
    for (const d of directions) {
      counts[d as keyof typeof counts]++
    }
    
    const maxCount = Math.max(...Object.values(counts))
    return maxCount / predictions.length
  }
  
  /**
   * Calculate prediction entropy
   */
  private calculateEntropy(
    predictions: Array<{ direction: string; confidence: number }>
  ): number {
    const counts = { LONG: 0, SHORT: 0, NEUTRAL: 0 }
    
    for (const p of predictions) {
      counts[p.direction as keyof typeof counts]++
    }
    
    const total = predictions.length
    let entropy = 0
    
    for (const count of Object.values(counts)) {
      if (count > 0) {
        const p = count / total
        entropy -= p * Math.log2(p)
      }
    }
    
    // Normalize to 0-1
    const maxEntropy = Math.log2(3) // Maximum entropy for 3 classes
    return entropy / maxEntropy
  }
  
  /**
   * Get weight for classifier (with dynamic weighting)
   */
  private getWeight(name: string): number {
    const classifier = this.classifiers.get(name)
    if (!classifier) return 0
    
    if (!this.config.dynamicWeighting) {
      return classifier.weight
    }
    
    const perf = this.performances.get(name)
    if (!perf) return classifier.weight
    
    // Adjust weight based on recent performance
    const performanceFactor = perf.accuracy
    return classifier.weight * performanceFactor
  }
  
  /**
   * Update performance tracking
   */
  updatePerformance(classifierName: string, correct: boolean): void {
    const perf = this.performances.get(classifierName)
    if (!perf) return
    
    perf.totalPredictions++
    if (correct) perf.correct++
    
    perf.accuracy = perf.correct / perf.totalPredictions
    
    // Update recent accuracy
    perf.recentAccuracy.push(correct ? 1 : 0)
    if (perf.recentAccuracy.length > this.config.performanceWindow) {
      perf.recentAccuracy.shift()
    }
  }
  
  /**
   * Get all classifier performances
   */
  getPerformances(): ClassifierPerformance[] {
    return Array.from(this.performances.values())
  }
  
  // ==========================================================================
  // SPECIALIZED CLASSIFIERS
  // ==========================================================================
  
  /**
   * Momentum-based classifier
   */
  private async momentumClassifier(features: Record<string, number>): Promise<LawrenceResult> {
    const rsi = features.n_rsi || 0.5
    const momentum = features.n_momentum || 0.5
    
    // Combined momentum signal
    const momentumSignal = (rsi + momentum) / 2
    
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL'
    let confidence: number
    
    if (momentumSignal > 0.65) {
      direction = 'LONG'
      confidence = momentumSignal
    } else if (momentumSignal < 0.35) {
      direction = 'SHORT'
      confidence = 1 - momentumSignal
    } else {
      direction = 'NEUTRAL'
      confidence = 0.5
    }
    
    return {
      direction,
      probability: momentumSignal,
      confidence,
      features,
    }
  }
  
  /**
   * Trend-based classifier
   */
  private async trendClassifier(features: Record<string, number>): Promise<LawrenceResult> {
    const trend = features.n_trend || 0.5
    const adx = features.n_adx || 0.5
    
    // Trend strength
    const trendStrength = Math.abs(trend - 0.5) * 2
    const adxStrength = adx
    
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL'
    let confidence: number
    
    if (trend > 0.6 && adxStrength > 0.3) {
      direction = 'LONG'
      confidence = trendStrength * adxStrength
    } else if (trend < 0.4 && adxStrength > 0.3) {
      direction = 'SHORT'
      confidence = trendStrength * adxStrength
    } else {
      direction = 'NEUTRAL'
      confidence = 0.5
    }
    
    return {
      direction,
      probability: trend,
      confidence,
      features,
    }
  }
  
  /**
   * Session-based classifier
   */
  private async sessionClassifier(features: Record<string, number>): Promise<LawrenceResult> {
    const hour = (features.hour || 0.5) * 24
    const session = features.session || 0.5
    
    // Best trading hours: 8-11 UTC (London), 13-17 UTC (NY)
    const isGoodHour = (hour >= 8 && hour <= 11) || (hour >= 13 && hour <= 17)
    
    // Session overlap bonus
    const isOverlap = hour >= 13 && hour <= 17
    
    let direction: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
    let confidence = 0.5
    
    // Session classifier mainly affects confidence, not direction
    if (isOverlap) {
      confidence = 0.7
    } else if (isGoodHour) {
      confidence = 0.6
    } else {
      confidence = 0.4
    }
    
    return {
      direction,
      probability: session,
      confidence,
      features,
    }
  }
  
  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================
  
  /**
   * Get configuration
   */
  getConfig(): EnsembleConfig {
    return { ...this.config }
  }
  
  /**
   * Set configuration
   */
  setConfig(config: Partial<EnsembleConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let ensembleInstance: EnsembleClassifier | null = null

export function getEnsembleClassifier(config?: Partial<EnsembleConfig>): EnsembleClassifier {
  if (!ensembleInstance) {
    ensembleInstance = new EnsembleClassifier(config)
  } else if (config) {
    ensembleInstance.setConfig(config)
  }
  return ensembleInstance
}

export function resetEnsembleClassifier(): void {
  ensembleInstance = null
}

export default EnsembleClassifier
