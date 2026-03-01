/**
 * Real-time Learning Module
 * 
 * Continuous learning system for ML models.
 * Implements online learning with drift detection.
 */

import { getLawrenceClassifier, type TrainingSample } from './lawrence-classifier'
import { getEnsembleClassifier } from './ensemble-classifier'

// ============================================================================
// TYPES
// ============================================================================

/**
 * Learning configuration
 */
export interface RealTimeLearningConfig {
  // Enable real-time learning
  enabled: boolean
  
  // Minimum samples before updating
  minSamplesBeforeUpdate: number
  
  // Batch size for updates
  batchSize: number
  
  // Learning rate (0-1)
  learningRate: number
  
  // Enable concept drift detection
  driftDetection: boolean
  
  // Drift detection threshold
  driftThreshold: number
  
  // Performance window for drift detection
  performanceWindow: number
  
  // Auto-save interval (ms)
  autoSaveInterval: number
  
  // Enable performance tracking
  performanceTracking: boolean
}

/**
 * Default learning configuration
 */
export const DEFAULT_REALTIME_CONFIG: RealTimeLearningConfig = {
  enabled: true,
  minSamplesBeforeUpdate: 10,
  batchSize: 50,
  learningRate: 0.1,
  driftDetection: true,
  driftThreshold: 0.15,
  performanceWindow: 100,
  autoSaveInterval: 60000, // 1 minute
  performanceTracking: true,
}

/**
 * Learning statistics
 */
export interface LearningStats {
  // Sample counts
  totalSamples: number
  processedBatches: number
  
  // Performance metrics
  currentAccuracy: number
  recentAccuracy: number
  
  // Drift detection
  driftDetected: boolean
  lastDriftTime: number | null
  driftCount: number
  
  // Learning rate
  effectiveLearningRate: number
  
  // Timestamps
  lastUpdate: number
  startedAt: number
}

/**
 * Concept drift detection result
 */
interface DriftDetectionResult {
  driftDetected: boolean
  driftMagnitude: number
  recentAccuracy: number
  baselineAccuracy: number
}

// ============================================================================
// REAL-TIME LEARNER
// ============================================================================

/**
 * Real-Time Learner
 * 
 * Manages continuous learning for ML models
 */
export class RealTimeLearner {
  private config: RealTimeLearningConfig
  private sampleBuffer: TrainingSample[] = []
  private performanceHistory: boolean[] = []
  private baselineAccuracy: number = 0.5
  private stats: LearningStats
  private saveInterval: NodeJS.Timeout | null = null
  
  constructor(config: Partial<RealTimeLearningConfig> = {}) {
    this.config = { ...DEFAULT_REALTIME_CONFIG, ...config }
    this.stats = this.getDefaultStats()
    
    if (this.config.enabled) {
      this.startAutoSave()
    }
  }
  
  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================
  
  /**
   * Add a new training sample
   */
  addSample(sample: TrainingSample): void {
    if (!this.config.enabled) return
    
    this.sampleBuffer.push(sample)
    this.stats.totalSamples++
    
    // Check if we should process a batch
    if (this.sampleBuffer.length >= this.config.batchSize) {
      this.processBatch()
    }
  }
  
  /**
   * Add multiple samples
   */
  addSamples(samples: TrainingSample[]): void {
    for (const sample of samples) {
      this.addSample(sample)
    }
  }
  
  /**
   * Report outcome for drift detection
   */
  reportOutcome(correct: boolean): void {
    if (!this.config.performanceTracking) return
    
    this.performanceHistory.push(correct)
    
    // Maintain window size
    if (this.performanceHistory.length > this.config.performanceWindow) {
      this.performanceHistory.shift()
    }
    
    // Update accuracy
    this.updateAccuracy()
    
    // Check for drift
    if (this.config.driftDetection) {
      this.checkForDrift()
    }
  }
  
  /**
   * Force process current buffer
   */
  async flush(): Promise<void> {
    if (this.sampleBuffer.length > 0) {
      await this.processBatch()
    }
  }
  
  /**
   * Get learning statistics
   */
  getStats(): LearningStats {
    return { ...this.stats }
  }
  
  /**
   * Get configuration
   */
  getConfig(): RealTimeLearningConfig {
    return { ...this.config }
  }
  
  /**
   * Set configuration
   */
  setConfig(config: Partial<RealTimeLearningConfig>): void {
    this.config = { ...this.config, ...config }
    
    if (this.config.enabled) {
      this.startAutoSave()
    } else {
      this.stopAutoSave()
    }
  }
  
  /**
   * Reset learner
   */
  reset(): void {
    this.sampleBuffer = []
    this.performanceHistory = []
    this.baselineAccuracy = 0.5
    this.stats = this.getDefaultStats()
  }
  
  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================
  
  /**
   * Process a batch of samples
   */
  private async processBatch(): Promise<void> {
    if (this.sampleBuffer.length < this.config.minSamplesBeforeUpdate) {
      return
    }
    
    const samples = [...this.sampleBuffer]
    this.sampleBuffer = []
    
    // Calculate effective learning rate
    const effectiveRate = this.calculateEffectiveLearningRate()
    this.stats.effectiveLearningRate = effectiveRate
    
    // Apply learning rate to sample weights
    const adjustedSamples = samples.map(sample => ({
      ...sample,
      weight: sample.weight * effectiveRate,
    }))
    
    // Train classifiers
    const lawrence = getLawrenceClassifier()
    lawrence.trainBatch(adjustedSamples)
    
    // Update ensemble if drift was detected
    const ensemble = getEnsembleClassifier()
    for (const sample of adjustedSamples) {
      ensemble.updatePerformance(
        'lawrence',
        sample.label === 'LONG' ? true : false
      )
    }
    
    // Update stats
    this.stats.processedBatches++
    this.stats.lastUpdate = Date.now()
    
    console.log(`[RealTimeLearner] Processed batch: ${samples.length} samples`)
  }
  
  /**
   * Calculate effective learning rate
   */
  private calculateEffectiveLearningRate(): number {
    if (!this.config.driftDetection || this.performanceHistory.length < 20) {
      return this.config.learningRate
    }
    
    // Increase learning rate if drift detected
    const driftResult = this.detectDrift()
    
    if (driftResult.driftDetected) {
      return Math.min(1, this.config.learningRate * 2)
    }
    
    // Decrease learning rate if stable
    if (driftResult.recentAccuracy > this.baselineAccuracy + 0.1) {
      return this.config.learningRate * 0.8
    }
    
    return this.config.learningRate
  }
  
  /**
   * Update accuracy metrics
   */
  private updateAccuracy(): void {
    if (this.performanceHistory.length === 0) return
    
    const recentCount = Math.min(20, this.performanceHistory.length)
    const recentCorrect = this.performanceHistory.slice(-recentCount).filter(Boolean).length
    this.stats.recentAccuracy = recentCorrect / recentCount
    
    const totalCorrect = this.performanceHistory.filter(Boolean).length
    this.stats.currentAccuracy = totalCorrect / this.performanceHistory.length
  }
  
  /**
   * Check for concept drift
   */
  private checkForDrift(): void {
    const driftResult = this.detectDrift()
    
    if (driftResult.driftDetected && !this.stats.driftDetected) {
      this.stats.driftDetected = true
      this.stats.lastDriftTime = Date.now()
      this.stats.driftCount++
      
      // Reset baseline
      this.baselineAccuracy = driftResult.recentAccuracy
      
      console.log('[RealTimeLearner] Concept drift detected!')
    } else if (!driftResult.driftDetected) {
      this.stats.driftDetected = false
    }
  }
  
  /**
   * Detect concept drift
   */
  private detectDrift(): DriftDetectionResult {
    if (this.performanceHistory.length < 30) {
      return {
        driftDetected: false,
        driftMagnitude: 0,
        recentAccuracy: this.baselineAccuracy,
        baselineAccuracy: this.baselineAccuracy,
      }
    }
    
    // Compare recent performance to baseline
    const recentCount = 20
    const recentCorrect = this.performanceHistory.slice(-recentCount).filter(Boolean).length
    const recentAccuracy = recentCorrect / recentCount
    
    const driftMagnitude = Math.abs(recentAccuracy - this.baselineAccuracy)
    
    return {
      driftDetected: driftMagnitude > this.config.driftThreshold && recentAccuracy < this.baselineAccuracy,
      driftMagnitude,
      recentAccuracy,
      baselineAccuracy: this.baselineAccuracy,
    }
  }
  
  /**
   * Start auto-save interval
   */
  private startAutoSave(): void {
    if (this.saveInterval) return
    
    this.saveInterval = setInterval(() => {
      this.flush().catch(console.error)
    }, this.config.autoSaveInterval)
  }
  
  /**
   * Stop auto-save interval
   */
  private stopAutoSave(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }
  }
  
  /**
   * Get default stats
   */
  private getDefaultStats(): LearningStats {
    return {
      totalSamples: 0,
      processedBatches: 0,
      currentAccuracy: 0.5,
      recentAccuracy: 0.5,
      driftDetected: false,
      lastDriftTime: null,
      driftCount: 0,
      effectiveLearningRate: this.config.learningRate,
      lastUpdate: Date.now(),
      startedAt: Date.now(),
    }
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAutoSave()
    this.flush().catch(console.error)
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let learnerInstance: RealTimeLearner | null = null

export function getRealTimeLearner(config?: Partial<RealTimeLearningConfig>): RealTimeLearner {
  if (!learnerInstance) {
    learnerInstance = new RealTimeLearner(config)
  } else if (config) {
    learnerInstance.setConfig(config)
  }
  return learnerInstance
}

export function resetRealTimeLearner(): void {
  learnerInstance?.destroy()
  learnerInstance = null
}

export default RealTimeLearner
