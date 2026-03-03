/**
 * CITARION Genetic Algorithm Framework
 * 
 * Evolutionary optimization for trading bot parameters.
 * No neural networks - uses classical genetic algorithms.
 * 
 * Features:
 * - Tournament and roulette wheel selection
 * - Single-point, two-point, and uniform crossover
 * - Gaussian and uniform mutation
 * - Elitism for preserving best individuals
 * - Multi-objective optimization (NSGA-II)
 * - Island model for parallel evolution
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Gene representation for a single parameter
 */
export interface Gene {
  name: string
  value: number
  min: number
  max: number
  type: 'continuous' | 'discrete' | 'categorical'
  categories?: string[]  // For categorical genes
}

/**
 * Chromosome - collection of genes representing a solution
 */
export type Chromosome = Gene[]

/**
 * Individual in the population
 */
export interface Individual {
  id: string
  chromosome: Chromosome
  fitness: number
  objectives: number[]  // For multi-objective optimization
  rank?: number         // Pareto rank for NSGA-II
  crowdingDistance?: number
  age: number           // Generations survived
  history: {
    fitnessHistory: number[]
    bestFitness: number
    avgFitness: number
  }
}

/**
 * Population of individuals
 */
export interface Population {
  generation: number
  individuals: Individual[]
  stats: {
    bestFitness: number
    avgFitness: number
    worstFitness: number
    diversity: number
    stagnationCount: number
  }
}

// ============================================================================
// GENETIC OPERATORS
// ============================================================================

/**
 * Selection method types
 */
export type SelectionMethod = 'tournament' | 'roulette' | 'rank' | 'sus'

/**
 * Crossover method types
 */
export type CrossoverMethod = 'single-point' | 'two-point' | 'uniform' | 'blend' | 'sbx'

/**
 * Mutation method types
 */
export type MutationMethod = 'gaussian' | 'uniform' | 'polynomial' | 'non-uniform'

/**
 * Genetic operator configuration
 */
export interface GeneticOperatorConfig {
  selection: {
    method: SelectionMethod
    tournamentSize?: number  // For tournament selection
    pressure?: number        // Selection pressure (1.5-2.0 typical)
  }
  crossover: {
    method: CrossoverMethod
    rate: number            // Probability of crossover (0.6-0.9)
    sbxDistributionIndex?: number  // For SBX crossover
    blendAlpha?: number     // For blend crossover
  }
  mutation: {
    method: MutationMethod
    rate: number            // Probability per gene (0.01-0.1)
    strength: number        // Mutation strength (sigma for Gaussian)
    polynomialDistributionIndex?: number
    decayRate?: number      // For non-uniform mutation
  }
  elitism: {
    enabled: boolean
    count: number           // Number of elite individuals to preserve
    percentage?: number     // Alternative: percentage of population
  }
}

// ============================================================================
// FITNESS FUNCTION
// ============================================================================

/**
 * Fitness evaluation context
 */
export interface FitnessContext {
  generation: number
  maxGenerations: number
  populationStats: Population['stats']
}

/**
 * Fitness function type
 */
export type FitnessFunction = (
  chromosome: Chromosome,
  context: FitnessContext
) => Promise<number> | number

/**
 * Multi-objective fitness function
 */
export type MultiObjectiveFitnessFunction = (
  chromosome: Chromosome,
  context: FitnessContext
) => Promise<number[]> | number[]

// ============================================================================
// GA CONFIGURATION
// ============================================================================

/**
 * Termination criteria
 */
export interface TerminationCriteria {
  maxGenerations: number
  targetFitness?: number
  maxStagnation?: number    // Stop if no improvement for N generations
  minDiversity?: number     // Stop if diversity drops below threshold
  timeLimit?: number        // Stop after N milliseconds
}

/**
 * Genetic Algorithm configuration
 */
export interface GAConfig {
  // Population
  populationSize: number
  chromosomeTemplate: Chromosome
  
  // Operators
  operators: GeneticOperatorConfig
  
  // Termination
  termination: TerminationCriteria
  
  // Multi-objective
  multiObjective: boolean
  objectiveCount?: number
  
  // Island model
  islandModel: boolean
  islandCount?: number
  migrationInterval?: number
  migrationRate?: number
  
  // Advanced
  adaptiveOperators: boolean
  diversityPreservation: boolean
  localSearch: boolean
  localSearchRate?: number
  
  // Logging
  verbose: boolean
  logInterval?: number
}

/**
 * Default GA configuration
 */
export const DEFAULT_GA_CONFIG: Omit<GAConfig, 'chromosomeTemplate'> = {
  populationSize: 100,
  
  operators: {
    selection: {
      method: 'tournament',
      tournamentSize: 3,
      pressure: 2.0,
    },
    crossover: {
      method: 'blend',
      rate: 0.8,
      blendAlpha: 0.5,
    },
    mutation: {
      method: 'gaussian',
      rate: 0.1,
      strength: 0.2,
    },
    elitism: {
      enabled: true,
      count: 2,
      percentage: 0.02,
    },
  },
  
  termination: {
    maxGenerations: 100,
    maxStagnation: 20,
    minDiversity: 0.01,
  },
  
  multiObjective: false,
  
  islandModel: false,
  islandCount: 4,
  migrationInterval: 10,
  migrationRate: 0.1,
  
  adaptiveOperators: false,
  diversityPreservation: true,
  localSearch: false,
  localSearchRate: 0.1,
  
  verbose: true,
  logInterval: 10,
}

// ============================================================================
// GA RESULT
// ============================================================================

/**
 * Optimization result
 */
export interface GAResult {
  success: boolean
  bestIndividual: Individual
  finalPopulation: Population
  history: {
    generation: number
    bestFitness: number
    avgFitness: number
    diversity: number
  }[]
  statistics: {
    totalEvaluations: number
    totalGenerations: number
    elapsedMs: number
    convergenceGeneration?: number
  }
  message?: string
}

/**
 * Pareto front for multi-objective optimization
 */
export interface ParetoFront {
  individuals: Individual[]
  hypervolume: number
}

// ============================================================================
// BOT PARAMETER OPTIMIZATION
// ============================================================================

/**
 * Bot parameter definition
 */
export interface BotParameterDef {
  name: string
  type: 'continuous' | 'discrete' | 'categorical'
  min?: number
  max?: number
  step?: number           // For discrete parameters
  categories?: string[]   // For categorical parameters
  default: number | string
}

/**
 * Bot optimization config
 */
export interface BotOptimizationConfig {
  botType: string
  parameters: BotParameterDef[]
  fitnessFunction: FitnessFunction
  objectives?: string[]   // For multi-objective
  constraints?: {
    name: string
    evaluate: (chromosome: Chromosome) => boolean
  }[]
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Clamp value to bounds
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Random number in range
 */
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/**
 * Random integer in range (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Gaussian random number (Box-Muller transform)
 */
export function gaussianRandom(mean: number = 0, std: number = 1): number {
  const u1 = Math.random()
  const u2 = Math.random()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return z0 * std + mean
}

/**
 * Calculate population diversity (average distance from mean)
 */
export function calculateDiversity(population: Individual[]): number {
  if (population.length === 0) return 0
  
  // Calculate mean chromosome
  const geneCount = population[0].chromosome.length
  const means: number[] = []
  
  for (let i = 0; i < geneCount; i++) {
    let sum = 0
    for (const ind of population) {
      sum += ind.chromosome[i].value
    }
    means.push(sum / population.length)
  }
  
  // Calculate average distance from mean
  let totalDistance = 0
  for (const ind of population) {
    let distance = 0
    for (let i = 0; i < geneCount; i++) {
      distance += Math.pow(ind.chromosome[i].value - means[i], 2)
    }
    totalDistance += Math.sqrt(distance)
  }
  
  return totalDistance / population.length
}

/**
 * Convert chromosome to parameter map
 */
export function chromosomeToParams(chromosome: Chromosome): Record<string, number | string> {
  const params: Record<string, number | string> = {}
  for (const gene of chromosome) {
    if (gene.type === 'categorical' && gene.categories) {
      params[gene.name] = gene.categories[Math.round(gene.value)]
    } else if (gene.type === 'discrete') {
      params[gene.name] = Math.round(gene.value)
    } else {
      params[gene.name] = gene.value
    }
  }
  return params
}

/**
 * Create chromosome from parameter map
 */
export function paramsToChromosome(
  params: Record<string, number | string>,
  template: Chromosome
): Chromosome {
  return template.map(gene => {
    const value = params[gene.name]
    return {
      ...gene,
      value: typeof value === 'string' 
        ? gene.categories?.indexOf(value) ?? 0 
        : value,
    }
  })
}
