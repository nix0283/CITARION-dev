/**
 * Hyperparameter Optimization Engine
 * 
 * Automated hyperparameter tuning with multiple optimization strategies:
 * - Grid Search
 * - Random Search
 * - Bayesian Optimization
 * - Genetic Algorithm
 */

import { createHash } from 'crypto'

// ============================================================================
// Types
// ============================================================================

export interface HyperparameterSpace {
  [key: string]: HyperparameterRange
}

export interface HyperparameterRange {
  type: 'float' | 'int' | 'categorical'
  min?: number
  max?: number
  choices?: (string | number)[]
  log?: boolean  // Log-scale sampling
}

export interface OptimizationConfig {
  // Search strategy
  strategy: 'grid' | 'random' | 'bayesian' | 'genetic'
  
  // Budget
  maxTrials: number
  maxTime?: number  // seconds
  parallelTrials?: number
  
  // Early stopping
  earlyStopping: boolean
  patience: number
  minTrialsBeforeStopping: number
  
  // Objective
  objective: 'maximize' | 'minimize'
  metric: string
  
  // Bayesian specific
  acquisitionFunction?: 'ei' | 'pi' | 'ucb'
  explorationWeight?: number
  
  // Genetic specific
  populationSize?: number
  mutationRate?: number
  crossoverRate?: number
  elitismRate?: number
  
  // Pruning
  pruneBelow?: number  // Prune trials below this percentile
}

export interface Trial {
  id: string
  hyperparameters: Record<string, number | string>
  status: 'pending' | 'running' | 'completed' | 'failed' | 'pruned'
  startTime?: Date
  endTime?: Date
  duration?: number
  
  // Results
  metrics?: Record<string, number>
  objectiveValue?: number
  
  // For pruning
  intermediateResults?: Array<{ step: number; value: number }>
  
  // Metadata
  error?: string
  parentId?: string  // For genetic algorithm
}

export interface OptimizationResult {
  bestTrial: Trial
  bestHyperparameters: Record<string, number | string>
  bestObjectiveValue: number
  allTrials: Trial[]
  
  // Statistics
  totalTrials: number
  completedTrials: number
  prunedTrials: number
  failedTrials: number
  totalDuration: number
  
  // Analysis
  parameterImportance: Record<string, number>
  convergenceData: Array<{ trial: number; best: number; mean: number }>
  
  // Recommendations
  recommendations: string[]
}

// ============================================================================
// Hyperparameter Optimizer
// ============================================================================

export class HyperparameterOptimizer {
  private space: HyperparameterSpace
  private config: OptimizationConfig
  private trials: Map<string, Trial> = new Map()
  private trialHistory: Trial[] = []
  private startTime?: Date
  private surrogateModel?: SurrogateModel
  private bestValue?: number
  private bestTrial?: Trial

  constructor(space: HyperparameterSpace, config: Partial<OptimizationConfig> = {}) {
    this.space = space
    this.config = {
      strategy: 'bayesian',
      maxTrials: 100,
      earlyStopping: true,
      patience: 10,
      minTrialsBeforeStopping: 20,
      objective: 'maximize',
      metric: 'accuracy',
      acquisitionFunction: 'ei',
      explorationWeight: 0.1,
      populationSize: 20,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      elitismRate: 0.1,
      ...config
    }
    
    if (this.config.strategy === 'bayesian') {
      this.surrogateModel = new GaussianProcessRegressor()
    }
  }

  // --------------------------------------------------------------------------
  // Trial Generation
  // --------------------------------------------------------------------------

  /**
   * Get next hyperparameters to try
   */
  getNextTrial(): Trial {
    let hyperparameters: Record<string, number | string>
    
    switch (this.config.strategy) {
      case 'grid':
        hyperparameters = this.generateGridPoint()
        break
      case 'random':
        hyperparameters = this.generateRandomPoint()
        break
      case 'bayesian':
        hyperparameters = this.generateBayesianPoint()
        break
      case 'genetic':
        hyperparameters = this.generateGeneticPoint()
        break
      default:
        hyperparameters = this.generateRandomPoint()
    }
    
    const trial: Trial = {
      id: this.generateTrialId(),
      hyperparameters,
      status: 'pending',
      intermediateResults: []
    }
    
    this.trials.set(trial.id, trial)
    return trial
  }

  private generateGridPoint(): Record<string, number | string> {
    // Grid search - generate points on a grid
    const point: Record<string, number | string> = {}
    const trialIndex = this.trialHistory.length
    
    let index = trialIndex
    for (const [key, range] of Object.entries(this.space)) {
      if (range.type === 'categorical' && range.choices) {
        point[key] = range.choices[index % range.choices.length]
        index = Math.floor(index / range.choices.length)
      } else if (range.type === 'int') {
        const steps = 10
        const step = Math.floor(index % steps)
        point[key] = Math.round((range.min || 0) + (step / (steps - 1)) * ((range.max || 100) - (range.min || 0)))
        index = Math.floor(index / steps)
      } else {
        const steps = 10
        const step = index % steps
        point[key] = (range.min || 0) + (step / (steps - 1)) * ((range.max || 1) - (range.min || 0))
        index = Math.floor(index / steps)
      }
    }
    
    return point
  }

  private generateRandomPoint(): Record<string, number | string> {
    const point: Record<string, number | string> = {}
    
    for (const [key, range] of Object.entries(this.space)) {
      if (range.type === 'categorical' && range.choices) {
        point[key] = range.choices[Math.floor(Math.random() * range.choices.length)]
      } else if (range.type === 'int') {
        if (range.log) {
          const logMin = Math.log(range.min || 1)
          const logMax = Math.log(range.max || 100)
          point[key] = Math.round(Math.exp(logMin + Math.random() * (logMax - logMin)))
        } else {
          point[key] = Math.round((range.min || 0) + Math.random() * ((range.max || 100) - (range.min || 0)))
        }
      } else {
        if (range.log) {
          const logMin = Math.log(range.min || 0.0001)
          const logMax = Math.log(range.max || 1)
          point[key] = Math.exp(logMin + Math.random() * (logMax - logMin))
        } else {
          point[key] = (range.min || 0) + Math.random() * ((range.max || 1) - (range.min || 0))
        }
      }
    }
    
    return point
  }

  private generateBayesianPoint(): Record<string, number | string> {
    // If not enough trials, use random search
    if (this.trialHistory.filter(t => t.status === 'completed').length < 5) {
      return this.generateRandomPoint()
    }
    
    // Get completed trials
    const completedTrials = this.trialHistory.filter(t => t.status === 'completed' && t.objectiveValue !== undefined)
    
    // Train surrogate model
    const X = completedTrials.map(t => this.encodeHyperparameters(t.hyperparameters))
    const y = completedTrials.map(t => t.objectiveValue!)
    
    this.surrogateModel?.fit(X, y)
    
    // Generate candidates and select best
    const numCandidates = 100
    let bestAcquisition = -Infinity
    let bestPoint = this.generateRandomPoint()
    
    for (let i = 0; i < numCandidates; i++) {
      const candidate = this.generateRandomPoint()
      const xCandidate = this.encodeHyperparameters(candidate)
      
      const acquisition = this.computeAcquisition(xCandidate)
      
      if (acquisition > bestAcquisition) {
        bestAcquisition = acquisition
        bestPoint = candidate
      }
    }
    
    return bestPoint
  }

  private generateGeneticPoint(): Record<string, number | string> {
    const population = this.getPopulation()
    
    // If population not ready, generate random
    if (population.length < (this.config.populationSize || 20)) {
      return this.generateRandomPoint()
    }
    
    // Selection
    const parent1 = this.selectParent(population)
    const parent2 = this.selectParent(population)
    
    // Crossover
    if (Math.random() < (this.config.crossoverRate || 0.8)) {
      const child = this.crossover(parent1, parent2)
      
      // Mutation
      if (Math.random() < (this.config.mutationRate || 0.1)) {
        return this.mutate(child)
      }
      
      return child
    }
    
    return Math.random() < 0.5 ? parent1 : parent2
  }

  // --------------------------------------------------------------------------
  // Bayesian Optimization Helpers
  // --------------------------------------------------------------------------

  private encodeHyperparameters(params: Record<string, number | string>): number[] {
    const encoded: number[] = []
    
    for (const [key, range] of Object.entries(this.space)) {
      const value = params[key]
      
      if (range.type === 'categorical' && range.choices) {
        // One-hot encoding for categorical
        const index = range.choices.indexOf(value as string | number)
        for (let i = 0; i < range.choices.length; i++) {
          encoded.push(i === index ? 1 : 0)
        }
      } else {
        // Normalize numeric values
        const normalized = range.type === 'int'
          ? ((value as number) - (range.min || 0)) / ((range.max || 100) - (range.min || 0))
          : ((value as number) - (range.min || 0)) / ((range.max || 1) - (range.min || 0))
        encoded.push(normalized)
      }
    }
    
    return encoded
  }

  private computeAcquisition(x: number[]): number {
    if (!this.surrogateModel) return Math.random()
    
    const { mean, std } = this.surrogateModel.predict(x)
    
    switch (this.config.acquisitionFunction) {
      case 'ei': // Expected Improvement
        return this.expectedImprovement(mean, std)
      case 'pi': // Probability of Improvement
        return this.probabilityOfImprovement(mean, std)
      case 'ucb': // Upper Confidence Bound
        return this.upperConfidenceBound(mean, std)
      default:
        return this.expectedImprovement(mean, std)
    }
  }

  private expectedImprovement(mean: number, std: number): number {
    if (std === 0) return 0
    
    const best = this.bestValue || 0
    const z = (mean - best) / std
    
    // Simplified EI calculation
    const phi = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI)
    const Phi = 0.5 * (1 + this.erf(z / Math.sqrt(2)))
    
    return (mean - best) * Phi + std * phi
  }

  private probabilityOfImprovement(mean: number, std: number): number {
    if (std === 0) return mean > (this.bestValue || 0) ? 1 : 0
    
    const z = (mean - (this.bestValue || 0)) / std
    return 0.5 * (1 + this.erf(z / Math.sqrt(2)))
  }

  private upperConfidenceBound(mean: number, std: number): number {
    const kappa = this.config.explorationWeight || 0.1
    return mean + kappa * std
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592
    const a2 = -0.284496736
    const a3 =  1.421413741
    const a4 = -1.453152027
    const a5 =  1.061405429
    const p  =  0.3275911

    const sign = x < 0 ? -1 : 1
    x = Math.abs(x)

    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return sign * y
  }

  // --------------------------------------------------------------------------
  // Genetic Algorithm Helpers
  // --------------------------------------------------------------------------

  private getPopulation(): Trial[] {
    return this.trialHistory
      .filter(t => t.status === 'completed' && t.objectiveValue !== undefined)
      .sort((a, b) => {
        const diff = (b.objectiveValue || 0) - (a.objectiveValue || 0)
        return this.config.objective === 'maximize' ? diff : -diff
      })
      .slice(0, this.config.populationSize || 20)
  }

  private selectParent(population: Trial[]): Record<string, number | string> {
    // Tournament selection
    const tournamentSize = 3
    let best: Trial | null = null
    
    for (let i = 0; i < tournamentSize; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)]
      if (!best || (candidate.objectiveValue || 0) > (best.objectiveValue || 0)) {
        best = candidate
      }
    }
    
    return best?.hyperparameters || this.generateRandomPoint()
  }

  private crossover(
    parent1: Record<string, number | string>,
    parent2: Record<string, number | string>
  ): Record<string, number | string> {
    const child: Record<string, number | string> = {}
    
    for (const key of Object.keys(this.space)) {
      child[key] = Math.random() < 0.5 ? parent1[key] : parent2[key]
    }
    
    return child
  }

  private mutate(params: Record<string, number | string>): Record<string, number | string> {
    const mutated = { ...params }
    const keys = Object.keys(this.space)
    const keyToMutate = keys[Math.floor(Math.random() * keys.length)]
    const range = this.space[keyToMutate]
    
    if (range.type === 'categorical' && range.choices) {
      mutated[keyToMutate] = range.choices[Math.floor(Math.random() * range.choices.length)]
    } else if (range.type === 'int') {
      const current = mutated[keyToMutate] as number
      const delta = ((range.max || 100) - (range.min || 0)) * 0.1
      mutated[keyToMutate] = Math.round(Math.max(
        range.min || 0,
        Math.min(range.max || 100, current + (Math.random() - 0.5) * 2 * delta)
      ))
    } else {
      const current = mutated[keyToMutate] as number
      const delta = ((range.max || 1) - (range.min || 0)) * 0.1
      mutated[keyToMutate] = Math.max(
        range.min || 0,
        Math.min(range.max || 1, current + (Math.random() - 0.5) * 2 * delta)
      )
    }
    
    return mutated
  }

  // --------------------------------------------------------------------------
  // Trial Management
  // --------------------------------------------------------------------------

  /**
   * Start a trial
   */
  startTrial(trialId: string): void {
    const trial = this.trials.get(trialId)
    if (trial) {
      trial.status = 'running'
      trial.startTime = new Date()
    }
  }

  /**
   * Report intermediate result for pruning
   */
  reportIntermediateResult(trialId: string, step: number, value: number): void {
    const trial = this.trials.get(trialId)
    if (trial && trial.intermediateResults) {
      trial.intermediateResults.push({ step, value })
      
      // Check for pruning
      if (this.shouldPrune(trial)) {
        trial.status = 'pruned'
        trial.endTime = new Date()
        trial.duration = trial.endTime.getTime() - (trial.startTime?.getTime() || 0)
        this.trialHistory.push(trial)
      }
    }
  }

  /**
   * Complete a trial with results
   */
  completeTrial(trialId: string, metrics: Record<string, number>): void {
    const trial = this.trials.get(trialId)
    if (!trial) return
    
    trial.status = 'completed'
    trial.endTime = new Date()
    trial.duration = trial.endTime.getTime() - (trial.startTime?.getTime() || 0)
    trial.metrics = metrics
    trial.objectiveValue = metrics[this.config.metric]
    
    // Update best
    if (this.bestValue === undefined || 
        (this.config.objective === 'maximize' && trial.objectiveValue > this.bestValue) ||
        (this.config.objective === 'minimize' && trial.objectiveValue < this.bestValue)) {
      this.bestValue = trial.objectiveValue
      this.bestTrial = trial
    }
    
    this.trialHistory.push(trial)
  }

  /**
   * Mark trial as failed
   */
  failTrial(trialId: string, error: string): void {
    const trial = this.trials.get(trialId)
    if (trial) {
      trial.status = 'failed'
      trial.endTime = new Date()
      trial.duration = trial.endTime.getTime() - (trial.startTime?.getTime() || 0)
      trial.error = error
      this.trialHistory.push(trial)
    }
  }

  // --------------------------------------------------------------------------
  // Early Stopping & Pruning
  // --------------------------------------------------------------------------

  private shouldPrune(trial: Trial): boolean {
    if (!this.config.earlyStopping) return false
    if (!trial.intermediateResults || trial.intermediateResults.length < 3) return false
    
    const completedTrials = this.trialHistory.filter(t => t.status === 'completed')
    if (completedTrials.length < this.config.minTrialsBeforeStopping) return false
    
    // Compare intermediate results with completed trials
    const currentStep = trial.intermediateResults[trial.intermediateResults.length - 1].step
    const currentValue = trial.intermediateResults[trial.intermediateResults.length - 1].value
    
    // Get values at same step from completed trials
    const comparisonValues = completedTrials
      .map(t => t.intermediateResults?.find(r => r.step === currentStep)?.value)
      .filter(v => v !== undefined) as number[]
    
    if (comparisonValues.length === 0) return false
    
    // Prune if below threshold
    const threshold = this.config.pruneBelow || 0.25
    const percentile = this.percentileRank(comparisonValues, currentValue)
    
    return percentile < threshold
  }

  private percentileRank(values: number[], value: number): number {
    const sorted = [...values].sort((a, b) => a - b)
    const rank = sorted.filter(v => v < value).length
    return rank / sorted.length
  }

  shouldStop(): boolean {
    if (!this.config.earlyStopping) return false
    
    const completedTrials = this.trialHistory.filter(t => t.status === 'completed')
    if (completedTrials.length < this.config.minTrialsBeforeStopping) return false
    
    // Check for improvement in last N trials
    const recentTrials = completedTrials.slice(-this.config.patience)
    const bestInRecent = Math.max(...recentTrials.map(t => t.objectiveValue || 0))
    
    return bestInRecent <= (this.bestValue || 0)
  }

  // --------------------------------------------------------------------------
  // Results
  // --------------------------------------------------------------------------

  getResults(): OptimizationResult {
    const completedTrials = this.trialHistory.filter(t => t.status === 'completed')
    const prunedTrials = this.trialHistory.filter(t => t.status === 'pruned')
    const failedTrials = this.trialHistory.filter(t => t.status === 'failed')
    
    return {
      bestTrial: this.bestTrial!,
      bestHyperparameters: this.bestTrial?.hyperparameters || {},
      bestObjectiveValue: this.bestValue || 0,
      allTrials: this.trialHistory,
      
      totalTrials: this.trialHistory.length,
      completedTrials: completedTrials.length,
      prunedTrials: prunedTrials.length,
      failedTrials: failedTrials.length,
      totalDuration: this.trialHistory.reduce((a, t) => a + (t.duration || 0), 0),
      
      parameterImportance: this.computeParameterImportance(),
      convergenceData: this.computeConvergenceData(),
      
      recommendations: this.generateRecommendations()
    }
  }

  private computeParameterImportance(): Record<string, number> {
    const completedTrials = this.trialHistory.filter(t => t.status === 'completed')
    if (completedTrials.length < 10) return {}
    
    const importance: Record<string, number> = {}
    
    for (const key of Object.keys(this.space)) {
      // Compute correlation between parameter and objective
      const values = completedTrials.map(t => {
        const val = t.hyperparameters[key]
        return typeof val === 'string' ? this.hashString(val) : val
      })
      const objectives = completedTrials.map(t => t.objectiveValue || 0)
      
      importance[key] = Math.abs(this.correlation(values, objectives))
    }
    
    return importance
  }

  private correlation(x: number[], y: number[]): number {
    const n = x.length
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0)
    const sumX2 = x.reduce((a, xi) => a + xi * xi, 0)
    const sumY2 = y.reduce((a, yi) => a + yi * yi, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  private hashString(s: string): number {
    let hash = 0
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i)
      hash = hash & hash
    }
    return hash
  }

  private computeConvergenceData(): Array<{ trial: number; best: number; mean: number }> {
    const completedTrials = this.trialHistory.filter(t => t.status === 'completed')
    const data: Array<{ trial: number; best: number; mean: number }> = []
    
    let best = -Infinity
    for (let i = 0; i < completedTrials.length; i++) {
      const objectiveValue = completedTrials[i].objectiveValue || 0
      best = Math.max(best, objectiveValue)
      
      const mean = completedTrials.slice(0, i + 1)
        .reduce((a, t) => a + (t.objectiveValue || 0), 0) / (i + 1)
      
      data.push({ trial: i + 1, best, mean })
    }
    
    return data
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    const results = this.getResults()
    
    // Check convergence
    if (results.convergenceData.length > 10) {
      const recent = results.convergenceData.slice(-5)
      const improvement = recent[recent.length - 1].best - recent[0].best
      
      if (improvement < 0.01) {
        recommendations.push('Optimization has converged. Consider increasing search space or trying a different strategy.')
      }
    }
    
    // Check parameter importance
    const importance = results.parameterImportance
    const sortedParams = Object.entries(importance).sort((a, b) => b[1] - a[1])
    
    if (sortedParams.length > 0) {
      const [mostImportant, importanceValue] = sortedParams[0]
      if (importanceValue > 0.5) {
        recommendations.push(`Parameter "${mostImportant}" has high importance (${(importanceValue * 100).toFixed(0)}%). Focus tuning on this parameter.`)
      }
    }
    
    // Check pruning effectiveness
    if (results.prunedTrials > results.completedTrials * 0.3) {
      recommendations.push('High pruning rate detected. Consider adjusting pruning threshold.')
    }
    
    return recommendations
  }

  private generateTrialId(): string {
    return `trial-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  }
}

// ============================================================================
// Gaussian Process Regressor (Simplified)
// ============================================================================

class GaussianProcessRegressor {
  private X?: number[][]
  private y?: number[]
  private alpha?: number

  fit(X: number[][], y: number[]): void {
    this.X = X
    this.y = y
    this.alpha = 1e-6 // Regularization
  }

  predict(x: number[]): { mean: number; std: number } {
    if (!this.X || !this.y || this.X.length === 0) {
      return { mean: 0, std: 1 }
    }

    // Compute kernel similarities
    const k = this.X.map(xi => this.rbfKernel(x, xi))
    
    // Mean prediction (weighted average)
    const mean = k.reduce((a, ki, i) => a + ki * this.y![i], 0) / k.reduce((a, b) => a + b, 0)
    
    // Variance estimate
    const variance = 1 - Math.max(...k)
    const std = Math.sqrt(Math.max(0, variance))
    
    return { mean, std }
  }

  private rbfKernel(x1: number[], x2: number[], gamma: number = 1): number {
    const sqDist = x1.reduce((a, xi, i) => a + Math.pow(xi - x2[i], 2), 0)
    return Math.exp(-gamma * sqDist)
  }
}

// ============================================================================
// Quick Functions
// ============================================================================

export function optimizeHyperparameters(
  space: HyperparameterSpace,
  evaluate: (params: Record<string, number | string>) => Promise<Record<string, number>>,
  config: Partial<OptimizationConfig> = {}
): Promise<OptimizationResult> {
  return new Promise((resolve) => {
    const optimizer = new HyperparameterOptimizer(space, config)
    let trials = 0
    
    const runTrial = async () => {
      if (trials >= (config.maxTrials || 100) || optimizer.shouldStop()) {
        resolve(optimizer.getResults())
        return
      }
      
      const trial = optimizer.getNextTrial()
      optimizer.startTrial(trial.id)
      
      try {
        const metrics = await evaluate(trial.hyperparameters)
        optimizer.completeTrial(trial.id, metrics)
      } catch (error) {
        optimizer.failTrial(trial.id, String(error))
      }
      
      trials++
      setImmediate(runTrial)
    }
    
    runTrial()
  })
}
